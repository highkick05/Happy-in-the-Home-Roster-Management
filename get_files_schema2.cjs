const db = require('better-sqlite3')('data/dev-database.sqlite');
console.log(db.pragma('table_info(files)'));
