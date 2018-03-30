// application.js
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