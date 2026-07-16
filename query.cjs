const Database = require('better-sqlite3');
const db = new Database('./data/database.sqlite');
console.log(db.prepare("SELECT count(*) FROM shifts").get());
console.log(db.prepare("SELECT id, funding_type, status FROM shifts LIMIT 5").all());
