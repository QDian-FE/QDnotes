function name() {
  var res = function aa() {
    return new Promise
  }
  res.then((val) => {
    b = val
  })
}

async function name() {
 var  res = await function () {
   return val
 }


 var b = res
 await bb()
 await cc()
}