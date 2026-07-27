const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
console.log(db.prepare("SELECT * FROM settings WHERE key = 'timezone'").get());
