let http = require('http')
let server = http.createServer((req, res) =>{
  res.writeHead(200)
  res.end('hello world')
})

server.listen(3000, () => {
  console.log('listenning on 3000')
})