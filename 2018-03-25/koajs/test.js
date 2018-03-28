const compose = require('koa-compose')
const _ = require('lodash')

const middwares = _.range(5).map(item => async (ctx, next) => {
  console.log('index:' + item + ' before next')
  await next()
  console.log('index:' + item + ' after next')
})
const fn = compose(middwares)

fn({})
