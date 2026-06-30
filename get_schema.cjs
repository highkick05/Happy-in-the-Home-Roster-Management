const db = require('better-sqlite3')('data.db');
const schema = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(schema);
