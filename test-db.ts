import db from './db.js';
const shifts = db.prepare('SELECT id, staff_id, start_time, end_time, status, funding_type FROM shifts LIMIT 5').all();
console.log(shifts);
