const jwt = require('jsonwebtoken');

const token1 = jwt.sign({ id: 1, role: 'ADMIN' }, "happyinthehome-secret-key-123");
const token2 = jwt.sign({ id: 2, role: 'USER' }, "happyinthehome-secret-key-123");

async function run() {
  // simulate user 1 typing
  await fetch('http://localhost:3000/api/chat/typing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({ isTyping: true, userName: 'User One' })
  });
  
  // fetch as user 2
  const res = await fetch('http://localhost:3000/api/chat/typing?_t='+Date.now(), {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const data = await res.json();
  console.log(data);
}
run();
