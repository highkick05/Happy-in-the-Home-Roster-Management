const db = require('better-sqlite3')('data/dev-database.sqlite');
const cols = db.pragma('table_info(shifts)');
console.log(cols.map(c => c.name));
