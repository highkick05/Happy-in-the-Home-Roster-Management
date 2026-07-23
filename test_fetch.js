const res = await fetch("https://ais-dev-xwndhapb3fothbtfmjr2v6-422005270562.asia-southeast1.run.app/api/auth/login", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({email: 'admin@happyinthehome.com', password: 'password123'})
});
const data = await res.json();
const logsRes = await fetch("https://ais-dev-xwndhapb3fothbtfmjr2v6-422005270562.asia-southeast1.run.app/api/travel-logs", {
  headers: { 'Authorization': `Bearer ${data.token}` }
});
console.log(logsRes.status);
const logsText = await logsRes.text();
console.log(logsText.slice(0, 500));
