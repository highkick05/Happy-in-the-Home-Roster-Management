const Database = require('better-sqlite3');
const dbs = ['data/dev-database.sqlite', 'data/database.sqlite', 'database.sqlite', 'data/data.db'];
for (const f of dbs) {
  try {
    const db = new Database(f);
    const tbls = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    if (tbls.some(t => t.name === 'quotes')) {
       console.log(f, 'has quotes table:', db.prepare("SELECT sql FROM sqlite_master WHERE name='quotes'").get().sql);
    }
  } catch (e) {
  }
}
