const Database = require('better-sqlite3');
const db = new Database('./data/dev-database.sqlite');
console.log(db.prepare("SELECT count(*) FROM shifts").get());
console.log(db.prepare("SELECT status FROM shifts LIMIT 5").all());
