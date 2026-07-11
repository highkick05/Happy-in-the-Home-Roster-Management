const db = require('better-sqlite3')('database.sqlite');
const tables = db.prepare("SELECT * FROM sqlite_master WHERE type='trigger' OR type='table'").all();
const hasProgressNotes = tables.some(t => t.sql && t.sql.toLowerCase().includes('progress_notes'));
console.log('Has progress_notes references in DB schema:', hasProgressNotes);
tables.filter(t => t.sql && t.sql.toLowerCase().includes('progress_notes')).forEach(t => console.log(t.name, t.sql));
