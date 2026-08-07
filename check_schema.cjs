const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const columns = db.pragma('table_info(providers)');
console.log(columns);
