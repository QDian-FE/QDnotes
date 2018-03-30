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