const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
console.log(db.prepare("SELECT id, title, category_id, status FROM tasks").all());
