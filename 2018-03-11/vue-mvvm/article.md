---
title: 一起读读Vue(2)
date: 2018-01-09 18:35:59
tags: Vue
---
# Vue的双向绑定

起初用Vue最爽的一件事,可能就是双向绑定了,让我们不用每次数据发生变化时,都需要手动更新dom.可你知道Vue是如何实现双向绑定的吗?
>不要只跟我说`Object.defineProperty哦.带你更详细的来聊一聊.
<!-- more -->

## 整体框图

如果你看过`Vue`的官方文档,我想你对下面这幅图肯定会有印象.

![框图](https://cn.vuejs.org/images/data.png)

这幅图并不难理解,我习惯先从最熟悉的部分开始看,比如`DomTree`.

主要有以下几个名词对应

- Component Render Function : 组件渲染方法
- Virtual Dom Tree : 虚拟dom树
- Data : 数据

  - getter : 获取数据时触发的方法
  - setter : 设置数据时获取的方法
- Watcher : 观察者

我喜欢把这幅图从组件开始看,`Vue`肯定做了一份工作就是把`component`渲染到`dom`上,主要是通过调用`render`方法,但是在方法执行的过程中可以看到调用了`data`的`getter`,从而又被当做`watcher`的依赖.这可能就是一个最简单的渲染流程.

当我们修改一个数据时,我们会首先触发`setter`,然后告诉`watcher`数据改变了!`watcher`又告诉`component`我们需要重新渲染啦兄弟!

## setter getter

这里不得不提到一个关键的方法`Object.defineProperty()`.[详情](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)

在这个方法中定义的`set`,`get`也就是我们的`setter``getter`,和我们经常使用的`computed`中的非常类似.

## Dep依赖

为什么要收集依赖呢?如果一个数据的改变,整个组件都要重新渲染,那是不是太浪费资源了.如果一个和视图没有影响的数据发生了变化,视图就更没有必要重新渲染了,这就是依赖收集的必要性.建立视图和数据的联系.

我们可以在`core/observer/dep`中找到下面的代码.

```js
export default class Dep {
  static target: ?Watcher; // watcher 新的类型,观察者
  id: number; // id
  subs: Array<Watcher>; // 订阅列表

  constructor () {
    this.id = uid++
    // subs是存放watcher的数组
    this.subs = []
  }

  // 新增一个订阅
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 移除一个订阅
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 依赖
  depend () {
    // 在当前watcher中添加自己作为依赖
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知,通知所有订阅者我已经更新了!
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}
```

这个类的属性方法并不多,本身也不是很复杂.静态属性`target`主要代表当前的目标,`subs`也就是订阅列表,同事提供了一些方法对`subs`增删,他的复杂点主要在和`watcher`的连接上.

## watcher

在同一目录`/scr/core/observer/watcher`下:

```js
/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean; // 延迟加载
  sync: boolean; // 同步加载
  dirty: boolean;// 是否脏值 值是否已经改变
  active: boolean;
  deps: Array<Dep>; // 依赖列表
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  getter: Function; // 真的是getter
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 一般情况下会在这里触发一次get方法从而收集依赖
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 设定当前wathcer为Dep.target
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 触发一次getter
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      // 加入队列
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface. 调度接口
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      // 重新手机依赖
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        // 如果有用户定义的watcher
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          // 执行回调 一般是更新视图
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

```

`watcher`可能是构建中比较复杂的一个对象,他有一个关键的方法就是`run`,大多数情况下,可以更新视图.一个重要的属性就是`deps`也就是她的依赖列表.get()方法既可以获取值,又可以建立依赖,可以说是非常优雅的一种设计了.

## ovserver

观察者,也就是整个响应式系统的关键了.

```js
/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 把实例挂载到value的__ob__下
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
        // 强行实现继承,增加数组方法.
      augment(value, arrayMethods, arrayKeys)
      // 和下面的walk一样 对每个属性进行观察
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 遍历要观察的数据 对每个数据定义关联
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    // 遍历每个数组 对他进行观察
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果已经是被观察的状态
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  // 观察对象获取Observer实例
  let childOb = !shallow && observe(val)
  // 进行定义
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    // 定义getter
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 只有在dep.target有值得时候才是vue 收集依赖的时候
        dep.depend()
        if (childOb) {
          // 这里有两次依赖,一次在闭包的dep中,一次在__ob__的dep中.
          // 这里的dep主要是为了支持$set $delete等方法.
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        // 提供一个报错的方法
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      // 通知更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any)['__ob__']

  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' + 'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */

function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
```

js中没有办法对数组像操作对象一样的方法设置`getter`,`setter`.在源码中我们可以看到,实现了几种数组操作方法的变异方法,如果有`__proto__`这个非标准属性,就挂载到这个属性上实现继承,如果没有,那么直接挂载到实例中,来强行实现这几个变异方法.

而对于每一个对象,经过各种相互调用,最后都执行了这个`defineReactive`方法.这个方法为每一个对象定义了`getter`,`setter`.在定义之前,首先闭包生成一个`dep`,然后在拿到数据的观察者对象`ob`.为什么会有两个`dep`,可能是因为挂载到`vm`上的`$set`等方法,并不能直接获取到闭包的`dep`,所以需要有实例上的`dep`来进行通知.

### getter

这个方法中,执行了两个任务,返回要获取的值,把当前数据对应的`dep`放到对应的`watcher`中,这里需要注意这个`dep`是有上文中说的两个.在这样的代码中,也就是当`watcher`需要计算模板时,必然会获取这个数据,也就自然而然的添加了依赖.

### setter

当你赋值的时候,如果两个值不相等,那么就会触发`dep`的通知.`wathcer`知道了数据发生了改变,从而再次更新视图.