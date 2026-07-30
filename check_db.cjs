const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const cols = db.prepare('PRAGMA table_info(chat_messages)').all();
console.log(cols.map(c => c.name));
