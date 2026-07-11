const http = require('http');
http.createServer((req, res) => {
  res.end(process.env.DATABASE_PATH || 'NOT_SET');
}).listen(3001);
console.log('Listening on 3001');
