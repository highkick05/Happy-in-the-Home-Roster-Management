import fetch from 'node-fetch';
const run = async () => {
  const res = await fetch('http://localhost:3000/api/public-settings');
  console.log(await res.json());
}
run();
