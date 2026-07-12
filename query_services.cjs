const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
console.log(db.prepare("SELECT id, name, rate FROM services WHERE name LIKE '%transport%' OR name LIKE '%travel%'").all());
