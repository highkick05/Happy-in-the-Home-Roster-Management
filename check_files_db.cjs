const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const files = db.prepare("SELECT id, original_name, system_name, folder_path FROM files WHERE original_name LIKE 'INV-%' LIMIT 10").all();
console.log(files);
