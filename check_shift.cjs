const db = require('better-sqlite3')('data/dev-database.sqlite');
const shift = db.prepare("SELECT id, services_json, is_historical FROM shifts ORDER BY id DESC LIMIT 1").get();
console.log(shift);
