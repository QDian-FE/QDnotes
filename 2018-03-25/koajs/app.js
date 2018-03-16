const koa = require('koa')
const app = new koa()

app.use(ctx => {
  ctx.body = "<h1>Hello Koa</h1>"
})

app.listen('8888', () => {
  console.log('服务启动,监听8888端口')
})