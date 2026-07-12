const db = require('better-sqlite3')('data/database.sqlite');
console.log(db.pragma('table_info(files)'));
