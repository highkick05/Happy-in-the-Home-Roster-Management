import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
const msgs = db.prepare('SELECT id, user_id, created_at, content FROM chat_messages ORDER BY created_at DESC LIMIT 5').all();
console.log(msgs);
