const Database = require('better-sqlite3');
const path = require('path');
const dbFile = path.join(__dirname, 'data', 'dev-database.sqlite');
const db = new Database(dbFile, { fileMustExist: false });
const info = db.prepare("PRAGMA table_info(providers)").all();
console.log(info);
