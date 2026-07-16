const Database = require('better-sqlite3');
const db = new Database('/app/applet/data/dev-database.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (let t of tables) {
   console.log(t.name, db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c);
}
