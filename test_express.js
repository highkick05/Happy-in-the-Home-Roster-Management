const express = require('express');
const app = express();
app.use(express.json());
app.put('/test', (req, res) => {
  const { canSwitchAdmin } = req.body;
  console.log("Received canSwitchAdmin:", canSwitchAdmin, "Type:", typeof canSwitchAdmin);
  console.log("Stored value:", canSwitchAdmin ? 1 : 0);
  res.json({ ok: true });
});
const server = app.listen(3001, async () => {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3001/test', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ canSwitchAdmin: true })
  });
  server.close();
});
