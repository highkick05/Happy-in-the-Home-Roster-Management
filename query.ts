import Database from 'better-sqlite3';
const db = new Database(process.env.NODE_ENV === 'production' ? '/data/database.sqlite' : 'database.sqlite');
const users = db.prepare('SELECT id, email, first_name, last_name, last_chat_read FROM users').all();
console.log(users);
