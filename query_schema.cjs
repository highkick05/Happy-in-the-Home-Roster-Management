const Database = require('better-sqlite3');
const db = new Database('data/database.sqlite');
console.log(db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all());
