---
title: 读一下Vue
date: 2018-01-09 18:35:59
tags: Vue
---
# Vue的双向绑定

起初用Vue最爽的一件事,可能就是双向绑定了,让我们不用每次数据发生变化时,都需要手动更新dom.可你知道Vue是如何实现双向绑定的吗?
<!-- >不要只跟我说`Object.defineProperty哦.带你更详细的来聊一聊. -->
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

## 将数据data变成可观察（observable）的

```js
      function observer (value, cb) {
        Object.keys(value).forEach(key => {})
      }

      function defineReactive(obj, key, val, cb) {
        Object.defineProperty(obj, key, {
          enumerable: true,
          configurable: true,
          get () {
            // 依赖收集等等..
          },
          set (newVal) {
            // .....
            cb()
          }
        })
      }

      class Vue {
        constructor (opition) {
          this._data = opition.data
          observer(this._data, opition.render)
        }
      }

      const vm = new Vue({
        el: '#app',
        data: {
          text1: 'foo',
          text2: 'bar'
        },
        render () {
          console.log('render')
        }
      })
```

### 代理

当我们访问组件的`data`时,我们都是通过代理访问的.真实的数据都在`_data`.

```js
_proxy(options.data);/*构造函数中加入这句*/

/*代理*/
function _proxy (data) {
    const that = this
    Object.keys(data).forEach(key => {
        Object.defineProperty(that, key, {
            configurable: true,
            enumerable: true,
            get: function proxyGetter () {
                return that._data[key];
            },
            set: function proxySetter (val) {
                that._data[key] = val;
            }
        })
    })
}
```

## 依赖收集

现在如果我们修改上例中的`text2`那么整个组件都会被重新渲染,但是我们并没有修改`text1`啊,显然这是不合理的.

我们已经将数据转换成了可观察对象,数据的每次获取或者修改我们都可以插入我们想要做的事情.

### Dep

我们可以新建一个依赖收集类.

``` js
class Dep {
  static target?: Watcher
  subs: Watcher[]
  constructor () {
    this.subs = []
  }
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }
  removeSub(sub: Watcher) {
    remove(this.subs, sub)
  }
  notify(){
    const subs = this.subs.slice()
    for (let i = 0; i < subs.length; i++) {
      /*触发渲染操作进行依赖收集*/
      subs[i].update()
    }
  }
}
```

### Watcher

订阅者，当依赖收集的时候会addSub到sub中，在修改data中数据的时候会触dep对象的update(notify),通知所有Watcher对象去修改对应视图。

```js
class Watcher {
  vm: any
  cb: Function
  constructor (vm, expOrFn?, cb?: Function, options?) {
    this.cb = cb
    this.vm = vm
    /*在这里将观察者本身赋值给全局的target，只有被target标记过的才会进行依赖收集*/
    Dep.target = this
    this.cb.call(this.vm)
  }
  update () {
    console.log('watcher更新啦,准备重新渲染')
    this.cb.call(this.vm)
  }
}
```

### 开始依赖收集

```js
class Vue {
  _data: Object
  constructor(options: vueOption) {
    this._data = options.data
    observer(this._data, options.render)
    let watcher = new Watcher(this)
  }
}


interface vueOption{
  data: Object,
  methods: {[key: string] : Function},
  created: Function,
  render: Function
}

function observer (value, cb) {
  Object.keys(value).forEach(key => {})
}

function defineReactive(obj, key, val, cb) {
  const dep = new Dep()

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get () {
      if(Dep.target) {
        //  添加当前watcher到dep的订阅列表中
        dep.addSub(Dep.target)
      }
      // 依赖收集等等..
    },
    set (newVal) {
      // .....
      dep.notify()
    }
  })
}
```

将观察者Watcher实例赋值给全局的Dep.target，然后触发render操作只有被Dep.target标记过的才会进行依赖收集。有Dep.target的对象会将Watcher的实例push到subs中，在对象被修改出发setter操作的时候dep会调用subs中的Watcher实例的update方法进行渲染。

## Vue源码

在created和beforecreate之间,Vue进行了许多初始化工作.其中就包括一次依赖收集

### initData

先说下最重要的`initData`,对应的就是源码instance/state.js文件.[源码地址](https://github.com/vuejs/vue/blob/dev/src/core/instance/state.js#L107)

```js
function initData (vm: Component) {

  /*得到data数据*/
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  /*判断是否是对象*/
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }

  // proxy data on instance
  /*遍历data对象*/
  const keys = Object.keys(data)
  const props = vm.$options.props
  let i = keys.length

  //遍历data中的数据
  while (i--) {
    /*保证data中的key不与props中的key重复，props优先，如果有冲突会产生warning*/
    if (props && hasOwn(props, keys[i])) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${keys[i]}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(keys[i])) {
      /*判断是否是保留字段*/

      /*这里是我们前面讲过的代理，将data上面的属性代理到了vm实例上*/
      proxy(vm, `_data`, keys[i])
    }
  }
  /*Github:https://github.com/answershuto*/
  // observe data
  /*从这里开始我们要observe了，开始对数据进行绑定，这里有尤大大的注释asRootData，这步作为根数据，下面会进行递归observe进行对深层对象的绑定。*/
  observe(data, true /* asRootData */)
}
```

### proxy

```js
/*添加代理*/
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

这里比较好理解，通过proxy函数将data上面的数据代理到vm上，这样就可以用app.text代替app._data.text了。

### observe

```js
/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
 /*
 尝试创建一个Observer实例（__ob__），如果成功创建Observer实例则返回新的Observer实例，如果已有Observer实例则返回现有的Observer实例。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  /*判断是否是一个对象*/
  if (!isObject(value)) {
    return
  }
  let ob: Observer | void

  /*这里用__ob__这个属性来判断是否已经有Observer实例，如果没有Observer实例则会新建一个Observer实例并赋值给__ob__这个属性，如果已有Observer实例则直接返回该Observer实例*/
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (

    /*这里的判断是为了确保value是单纯的对象，而不是函数或者是Regexp等情况。*/
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {

    /*如果是根数据则计数，后面Observer中的observe的asRootData非true*/

    ob.vmCount++
  }
  return ob
}
```

### Observer

```js
/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class  {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0

    /*
    将Observer实例绑定到data的__ob__属性上面去，之前说过observe的时候会先检测是否已经有__ob__对象存放Observer实例了，def方法定义可以参考https://github.com/vuejs/vue/blob/dev/src/core/util/lang.js#L16 
    */
    def(value, '__ob__', this)
    if (Array.isArray(value)) {

      /*
          如果是数组，将修改后可以截获响应的数组方法替换掉该数组的原型中的原生方法，达到监听数组数据变化响应的效果。
          这里如果当前浏览器支持__proto__属性，则直接覆盖当前数组对象原型上的原生数组方法，如果不支持该属性，则直接覆盖数组对象的原型。
      */
      const augment = hasProto
        ? protoAugment  /*直接覆盖原型的方法来修改目标对象*/
        : copyAugment   /*定义（覆盖）目标对象或数组的某一个方法*/
      augment(value, arrayMethods, arrayKeys)
      /*Github:https://github.com/answershuto*/
      /*如果是数组则需要遍历数组的每一个成员进行observe*/
      this.observeArray(value)
    } else {

      /*如果是对象则直接walk进行绑定*/
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)

    /*walk方法会遍历对象的每一个属性进行defineReactive绑定*/
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {

    /*数组需要便利每一个成员进行observe*/
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}
```

Observer为数据加上响应式属性进行双向绑定。如果是对象则进行深度遍历，为每一个子对象都绑定上方法，如果是数组则为每一个成员都绑定上方法。

但是数组都有`push`,`pop`等方法,如果用这些方法直接操作数组,没办法触发我们的钩子.所以我们强行让数组继承了我们自己定义的`push、pop、shift、unshift、splice、sort、reverse`这几个方法.

### Watcher源码

Watcher是一个观察者对象。依赖收集以后Watcher对象会被保存在Deps中，数据变动的时候会由于Deps通知Watcher实例，然后由Watcher实例回调cb进行实图的更新。


```js
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: ISet;
  newDepIds: ISet;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ) {
    this.vm = vm
    /*_watchers存放订阅者实例*/
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
    /*把表达式expOrFn解析成getter*/
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
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
   /*获得getter的值并且重新进行依赖收集*/
  get () {
    /*将自身watcher观察者实例设置给Dep.target，用以依赖收集。*/
    pushTarget(this)
    let value
    const vm = this.vm

    /*
      执行了getter操作，看似执行了渲染操作，其实是执行了依赖收集。
      在将Dep.target设置为自生观察者实例以后，执行getter操作。
      譬如说现在的的data中可能有a、b、c三个数据，getter渲染需要依赖a跟c，
      那么在执行getter的时候就会触发a跟c两个数据的getter函数，
      在getter函数中即可判断Dep.target是否存在然后完成依赖收集，
      将该观察者对象放入闭包中的Dep的subs中去。
    */
    if (this.user) {
      try {
        value = this.getter.call(vm, vm)
      } catch (e) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      }
    } else {
      value = this.getter.call(vm, vm)
    }
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    /*如果存在deep，则触发每个深层对象的依赖，追踪其变化*/
    if (this.deep) {
      /*递归每一个对象或者数组，触发它们的getter，使得对象或数组的每一个成员都被依赖收集，形成一个“深（deep）”依赖关系*/
      traverse(value)
    }

    /*将观察者实例从target栈中取出并设置给Dep.target*/
    popTarget()
    this.cleanupDeps()
    return value
  }

  /**
   * Add a dependency to this directive.
   */
   /*添加一个依赖关系到Deps集合中*/
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
   /*清理依赖收集*/
  cleanupDeps () {
    /*移除所有观察者对象*/
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
   /*
      调度者接口，当依赖发生改变的时候进行回调。
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      /*同步则执行run直接渲染视图*/
      this.run()
    } else {
      /*异步推送到观察者队列中，由调度者调用。*/
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
   /*
      调度者工作接口，将被调度者回调。
    */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        /*
            即便值相同，拥有Deep属性的观察者以及在对象／数组上的观察者应该被触发更新，因为它们的值可能发生改变。
        */
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        /*设置新的值*/
        this.value = value

        /*触发回调渲染视图*/
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
   /*获取观察者的值*/
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
   /*收集该watcher的所有deps依赖*/
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
   /*将自身从所有依赖收集订阅列表删除*/
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      /*从vm实例的观察者列表中将自身移除，由于该操作比较耗费资源，所以如果vm实例正在被销毁则跳过该步骤。*/
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

### defineReactive

接下来是defineReactive。defineReactive的作用是通过Object.defineProperty为数据定义上getter\setter方法，进行依赖收集后闭包中的Deps会存放Watcher对象。触发setter改变数据的时候会通知Deps订阅者通知所有的Watcher观察者对象进行试图的更新。

```js
/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: Function
) {
  /*在闭包中定义一个dep对象*/
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  /*如果之前该对象已经预设了getter以及setter函数则将其取出来，新定义的getter/setter中会将其执行，保证不会覆盖之前已经定义的getter/setter。*/
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  /*对象的子对象递归进行observe并返回子节点的Observer对象*/
  let childOb = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {

      /*如果原本对象拥有getter方法则执行*/
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {

        /*进行依赖收集*/
        dep.depend()
        if (childOb) {

          /*子对象进行依赖收集，其实就是将同一个watcher观察者实例放进了两个depend中，一个是正在本身闭包中的depend，另一个是子元素的depend*/
          childOb.dep.depend()
        }
        if (Array.isArray(value)) {

          /*是数组则需要对每一个成员都进行依赖收集，如果数组的成员还是数组，则递归。*/
          dependArray(value)
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {

      /*通过getter方法获取当前值，与新值进行比较，一致则不需要执行下面的操作*/
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {

        /*如果原本对象拥有setter方法则执行setter*/
        setter.call(obj, newVal)
      } else {
        val = newVal
      }

      /*新的值需要重新进行observe，保证数据响应式*/
      childOb = observe(newVal)

      /*dep对象通知所有的观察者*/
      dep.notify()
    }
  })
}
```