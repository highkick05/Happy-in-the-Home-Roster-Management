import db from './db.js';
console.log(db.prepare("SELECT count(*) as cnt FROM shifts").get());
console.log(db.prepare("SELECT status, count(*) as cnt FROM shifts GROUP BY status").all());
