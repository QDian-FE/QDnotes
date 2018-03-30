// context.js

// 主要是做一些常用方法的代理
// module.exports = {
//   get query() {
//     return this.requset.query
//   },
//   get body() {
//     return this.response.body
//   },
//   set body(data) {
//     this.response.body = data
//   },
//   get status() {
//     return this.response.status
//   },
//   set status(statusCode) {
//     this.response.status = statusCode
//   }
// }


// // 精简版
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