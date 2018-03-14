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
      subs[i].update()
    }
  }
}

class Watcher {
  vm: any
  cb: Function
  constructor (vm, expOrFn?, cb?: Function, options?) {
    this.cb = cb
    this.vm = vm
  }
  update () {
    console.log('watcher更新啦,准备重新渲染')
    /*在这里将观察者本身赋值给全局的target，只有被target标记过的才会进行依赖收集*/
    Dep.target = this
    this.cb.call(this.vm)
    Dep.target = null
  }
}


function remove<T> (arr: Array<T>, item: T) {
  const index = arr.indexOf(item)
  arr.slice(index, index+1)
}

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
      // cb()
      dep.notify()
    }
  })
}

enum state {
  "padding" = 1,
  "reslove"
}