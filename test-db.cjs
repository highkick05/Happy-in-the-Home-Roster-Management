const db = require('better-sqlite3')('database.sqlite');
const rows = db.prepare("SELECT id, status, notes FROM shifts LIMIT 10").all();
console.log(rows);
