const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const files = db.prepare('SELECT * FROM files').all();
console.log(files);
