const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
const cols = db.prepare('PRAGMA table_info(chat_messages)').all();
console.log(cols.map(c => c.name).includes('is_edited') ? 'is_edited exists!' : 'is_edited missing!');
