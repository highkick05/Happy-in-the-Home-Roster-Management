const db = require('better-sqlite3')('data/dev-database.sqlite');
const shift = db.prepare("SELECT * FROM shifts WHERE client_id = 5 OR staff_id = 15 ORDER BY id DESC LIMIT 5").all();
console.log(shift);
