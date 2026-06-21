import db from './db.js';

console.log(JSON.stringify(db.pragma("table_info(shifts)"), null, 2));

