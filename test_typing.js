fetch('http://localhost:3000/api/chat/typing', {
  headers: {
    'Authorization': 'Bearer ' + process.argv[2]
  }
}).then(res => res.json()).then(console.log);
