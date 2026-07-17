const db = require('better-sqlite3')('test.db');
db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
const cols = db.pragma('table_info(test)');
console.log(Array.isArray(cols), typeof cols);
