const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const info = db.prepare("SELECT * FROM files ORDER BY id DESC LIMIT 5").all();
console.log(JSON.stringify(info, null, 2));
