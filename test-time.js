const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const shift = db.prepare("SELECT * FROM shifts ORDER BY id DESC LIMIT 1").get();
console.log(shift.start_time, shift.end_time);
