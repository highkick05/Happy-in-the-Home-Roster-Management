const db = require('better-sqlite3')('test.db');
const cols = db.pragma('table_info(test)');
console.log(cols[0]);
