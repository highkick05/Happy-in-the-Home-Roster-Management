const Database = require('better-sqlite3');
const db = new Database('data/database.sqlite');
console.log(db.prepare("PRAGMA table_info(files)").all());
