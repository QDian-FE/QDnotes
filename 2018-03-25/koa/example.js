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