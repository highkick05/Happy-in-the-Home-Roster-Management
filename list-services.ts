import db from './db.js';
try {
  const services = db.prepare('SELECT id, name FROM services').all();
  console.log('Services:', JSON.stringify(services, null, 2));
} catch (e) {
  console.log('Error fetching services:', e.message);
}
process.exit(0);
