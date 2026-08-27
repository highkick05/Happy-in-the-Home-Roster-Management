import Database from 'better-sqlite3';
const db = new Database('./data/data.db');
const notifs = db.prepare("SELECT * FROM notifications WHERE user_id = 0 ORDER BY created_at DESC LIMIT 5").all();
console.log(notifs);
