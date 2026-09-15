const fs = require('fs');
const Database = require('better-sqlite3');

const files = fs.readdirSync('data');
for (const file of files) {
  if (file.endsWith('.sqlite')) {
    const db = new Database('data/' + file);
    try {
        const cols = db.prepare("PRAGMA table_info(shifts)").all();
        if (cols && cols.length > 0) {
            console.log(file, ":", cols.map(c => c.name).join(', '));
        }
    } catch (e) {}
  }
}
const rootFiles = fs.readdirSync('.');
for (const file of rootFiles) {
  if (file.endsWith('.sqlite') || file.endsWith('.db')) {
    const db = new Database(file);
    try {
        const cols = db.prepare("PRAGMA table_info(shifts)").all();
        if (cols && cols.length > 0) {
            console.log(file, ":", cols.map(c => c.name).join(', '));
        }
    } catch (e) {}
  }
}
