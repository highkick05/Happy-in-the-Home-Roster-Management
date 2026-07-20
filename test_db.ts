import db from './db.js';
console.log(db.prepare('SELECT COUNT(*) FROM shifts').get());
