## koa简单实现

### 基本介绍

* nodejs框架之一
* koa2基于async/await实现.
* 分为四条主线:
  1. 封装node中的http
  2. 构造req, res ctx对象
  3. 中间件(巧妙之处)
  4. 错误处理

### 封装http

* 原生模块代码
```js
let http = require('http')
let server = http.createServer((req, res) =>{
  res.writeHead(200)
  res.end('hello world')
})

server.listen(3000, () => {
  console.log('listenning on 3000')
})
```

* 封装http
  1. 使用use挂载一个返回函数
  2. 开启监听的时候, 调用本身回调, 并复制参数
```js
// application.js
let http = require('http')

class Application {
  // 构造函数
  constructor() {
    this.callbackFunc
  }

  // 开启http server 并传入callback
  listen(...args) {
    let server = http.createServer(this.callback())
    server.listen(...args)
  }

  // 挂载回调函数
  use(fn) {
    this.callbackFunc = fn
  }

  // 获取httpserver所需要的callback
  callback() {
    return (req, res) => {
      this.callbackFunc(req, res)
    }
  }
}
module.exports = Application

// example.js
let myKoa = require('./application')
let app = new myKoa

app.use((req, res) => {
  res.writeHead(200)
  res.end('hello world')
})

app.listen(3000, () => {
  console.log('listening on 3000')
})
```

### 封装`request`, `response`, `context`对象

* 基本介绍
  1. `requsest`, `response`: 使用js中的`getter`和`setter`封装原生的req和res对象
  2. ctx: 回调函数中的上下文对象, 挂载了封装的request和response对象.

* 封装request对象
```js
let url = require('url')

module.exports = {
  get query() {
    // this.req 是原生req对象
    return url.parse(this.req.url, true).query
  }
}
```

* 封装response对象
```js
// response.js
module.exports = {
  // 读取body
  get body() {
    return this._body
  },
  // 设置返回给body内容
  set body(data) {
    this._body = data
  },
  // 获取状态
  get status() {
    return this.res.statusCode
  },
  // 设置状态
  set status(statusCode) {
    if (typeof statusCode !== 'number') {
      throw new Error('statusCode must be a number')
    }
    this.res.statusCode = statusCode
  }
}
```

* 封装contex对象
```js
let proto = {};
// 为proto名为property的属性设置setter
function delegateSet(property, name) {
    proto.__defineSetter__(name, function (val) {
        this[property][name] = val;
    });
}
// 为proto名为property的属性设置getter
function delegateGet(property, name) {
    proto.__defineGetter__(name, function () {
        return this[property][name];
    });
}
// 定义request中要代理的setter和getter
let requestSet = [];
let requestGet = ['query'];
// 定义response中要代理的setter和getter
let responseSet = ['body', 'status'];
let responseGet = responseSet;
requestSet.forEach(ele => {
    delegateSet('request', ele);
});
requestGet.forEach(ele => {
    delegateGet('request', ele);
});
responseSet.forEach(ele => {
    delegateSet('response', ele);
});
responseGet.forEach(ele => {
    delegateGet('response', ele);
});
module.exports = proto;
```

* 修改application构造器
  1. 构建完成后进行测试
  2. 开启服务
  3. 输入网址`http://localhost:3000/?name=tom`
  4. 显示: `hellotom`
```js
lication.js
let http = require('http')

let context = require('./context')
let request = require('./request')
let response = require('./response')

class Application {
  // 构造函数
  constructor() {
    this.callbackFunc
    this.context = context
    this.request = request
    this.response = response
  }

  // 开启http server 并传入callback
  listen(...args) {
    let server = http.createServer(this.callback())
    server.listen(...args)
  }

  // 挂载回调函数
  use(fn) {
    this.callbackFunc = fn
  }

  // 获取httpserver所需要的callback
  callback() {
    return (req, res) => {
      // todo: 没有看懂的两行代码
      let ctx = this.creatContext(req, res)
      let respond = () => this.responseBody(ctx)
      // 传入的函数是async函数, 执行结束后是一个promise对象
      // 完成回调函数之后, 执行一个响应函数,直接返回信息
      this.callbackFunc(ctx).then(respond)
    }
  }

  // 构造ctx, 可图解说明这个地方的挂载
  creatContext(req, res) {
    let ctx = Object.create(this.context)
    // request 和 response 挂载
    ctx.request = Object.create(this.request)
    ctx.response = Object.create(this.response)
    //todo: 在挂载下原生对象 
    ctx.req = ctx.request.req = req
    ctx.res = ctx.response.res = res
    return ctx
  }

  // 对客服端消息进行回复
  responseBody(ctx) {
    let content = ctx.body
    if (typeof content === 'string') {
      ctx.res.end(content)
    } else if (typeof content === 'object') {
      ctx.res.end(JSON.stringify(content))
    }
  }
}


module.exports = Application
```

* ctx扩展
 1. this.context 是我们中间件中上下文ctx对象的原型
 2. 常用方法, 在this.context上进行挂载
```js
// example.js
let myKoa = require('./application')
let app = new myKoa

app.context.echoData = function (error = 0, data = null, errmsg = '') {
  this.res.setHeader('Content-type', 'application/json;charset=utf-8')
  // 给了返回值, 就会执行end
  this.body = {
    error: error,
    data: data,
    errmsg: errmsg
  }
}


app.use(async ctx => {
  let data = {
    name: 'tom',
    age: 16,
    sex: 'male'
  }
  ctx.echoData(0, data, 'success')
})

app.listen(3000, () => {
  console.log('listening on 3000')
})
```

### 中间件机制
> 核心机制
> * koa的中间件个洋葱模型
> * koa中采用了async/await.









