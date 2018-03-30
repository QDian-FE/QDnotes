// 有三个async函数
// 实现三个函数依次执行
async function m1(next) {
  console.log('m1')
  await next()
}

async function m2(next) {
  console.log('m2')
  await next()
}

async function m3() {
  console.log('m3')
}

// 一: 
// 首先让m2执行完毕后, await next() 执行m3.
// 构造一个next函数
// let next1 = async function () {
//   await m3()
// }

// let next2 = async function () {
//   await m2(next1)
// }

// m1(next2)

// 二: 
// 对于n各async函数, 希望按照顺序执行
// 产生nextn的过程抽象为一个函数
function createNext(middleware, oldNext) {
  return async function () {
    await middleware(oldNext)
  }
}
// let next1 = createNext(m3, null)
// let next2 = createNext(m2, next1)
// let next3 = createNext(m1, next2)
// next3()

// 三:
let middleware = [m1, m2, m3]
let len = middleware.length

let next = async function () {
  return Promise.resolve()
}

for(var i = len - 1; i >= 0 ; i--) {
  next = createNext(middleware[i], next)
}
// console.log(1)
console.log(next)

next()