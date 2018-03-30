// requset.js

// 导出一个对象, 包含一个query方法, 通过url.pars的方法解析url, 并返回对象
// 直接调用query属性, 返回一个我们需要的方法
let url = require('url')

module.exports = {
  get query() {
    // this.req 是原生req对象
    return url.parse(this.req.url, true).query
  }
}