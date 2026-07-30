const Database = require('better-sqlite3');
const db = new Database('data/database.sqlite');
const notifs = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5").all();
console.log("NOTIFICATIONS:", notifs);
const users = db.prepare("SELECT id, email, first_name, role FROM users WHERE email = 'mattwillis02@gmail.com'").all();
console.log("USERS:", users);
