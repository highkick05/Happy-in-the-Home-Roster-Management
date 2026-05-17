import db from './db.js';
const shift = db.prepare('SELECT * FROM shifts ORDER BY id DESC LIMIT 1').get();
console.log('Latest Shift:', JSON.stringify(shift, null, 2));
process.exit(0);
