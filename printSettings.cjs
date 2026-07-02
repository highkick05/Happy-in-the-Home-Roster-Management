const Database = require('better-sqlite3');
const db = new Database('dev-database.sqlite');
try { console.log(db.prepare("SELECT value FROM settings WHERE key = 'websiteLogo'").get()); } catch(e) {}
