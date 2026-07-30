const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
console.log("Current time:", db.prepare("SELECT CURRENT_TIMESTAMP, datetime('now')").get());
