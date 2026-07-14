const Database = require('better-sqlite3');
const db = new Database(process.argv[2]);
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table';").all().map(t => t.name));
