---
title: 聊聊koa中间件的实现
date: 2018-03-19 15:31:39
tags: noejs koa
---
# Koa

> Koa, next generation web framework for node.js
> Koa, 新一代的Nodejs,web框架.

[koa](http://koajs.com/)是由[express](http://www.expressjs.com.cn/)的作者`tj`大神,主导开发的另外一款nodejs的web框架,由 Express 原班人马打造的 koa，致力于成为一个更小、更富有表现力、更健壮的 web 开发框架。 使用 koa 编写 web 应用，通过组合不同的 generator，可以免除重复繁琐的回调函数嵌套， 并极大地提升常用错误处理效率。Koa 不在内核中打包任何中间件，它仅仅提供了一套优雅的函数库， 使得编写 Web 应用变得得心应手。

<!-- more -->

## 洋葱模型

koa在解决异步问题的时候,使用了一种新的运行机制,叫做洋葱模型.

![洋葱模型](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

他和express和其他常用的框架相比,最大的区别是一个中间件可以执行两次,不再是常规的自上而下去执行.

![执行流程](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

[koa-compse](https://github.com/koajs/compose)是Koa构建中间件流程的关键.

## koa-compse详解

`koa-compse`是一个十分优雅的包,因为采用了递归,只有56行.

```js
// middleware 是一个函数的集合,函数也就是我们的各种中间件.
function compose (middleware) {
  // 判断中间件数组是否符合要求
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i] // 查找当前的中间件
      // 如果当前中间件是最后一个 那么设定next为当前中间件
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        // 执行当前中间件,并且设定next为下一个中间件.
        return Promise.resolve(fn(context, function next () {
          return dispatch(i + 1)
        }))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

其实只做了一个很简单的工作,第一次进入的时候,执行第一个中间件,然后设定第二个中间件为,传入第一个中间件的next函数,然后递归下去,直到最后一个中间件执行结束后,在逐个释放中间件函数,直到最后一个中间件的时候,next为空,下一轮会直接返回`Promise.resolve`.