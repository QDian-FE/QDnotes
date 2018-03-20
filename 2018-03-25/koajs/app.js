const koa = require('koa')
const app = new koa()

app.use(async (ctx, next) => {
  const startTime = new Date()
  await next()
  console.log(2)
  const timeSpan = new Date() - startTime
  ctx.set('X-Response-Time', timeSpan + 'ms')
})

app.use(async (ctx, next) => {
  console.log(3)
  await next()
  console.log(4)
})

app.use(ctx => {
  console.log(1)
  ctx.body = "<h1>Hello Koa</h1>"
})

app.listen('8888', () => {
  console.log('服务启动,监听8888端口\n地址为:http://localhost:8888/')
})