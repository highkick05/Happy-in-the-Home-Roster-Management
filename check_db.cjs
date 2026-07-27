const Database = require('better-sqlite3');
const db = new Database('data.db', { fileMustExist: false });
const info = db.prepare("PRAGMA table_info(providers)").all();
console.log(info);
