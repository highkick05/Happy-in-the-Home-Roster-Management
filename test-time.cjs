const Database = require('better-sqlite3');
const db = new Database('data/database.sqlite');
const shift = db.prepare("SELECT id, start_time, end_time, status, notes FROM shifts ORDER BY id DESC LIMIT 5").all();
console.log(shift);
