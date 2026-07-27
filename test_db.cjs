const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
console.log(db.prepare("SELECT created_at FROM chat_messages ORDER BY created_at DESC LIMIT 5").all());
