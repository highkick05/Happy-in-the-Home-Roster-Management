const Database = require('better-sqlite3');
const db = new Database(':memory:');
const res1 = db.prepare("SELECT 1 WHERE null IS ?").get(null);
const res2 = db.prepare("SELECT 1 WHERE 5 IS ?").get(5);
const res3 = db.prepare("SELECT 1 WHERE 5 IS ?").get(null);
console.log(res1, res2, res3);
