import db from './db.js';
const cols = db.pragma('table_info(shifts)');
console.log(cols.map(c => c.name));
