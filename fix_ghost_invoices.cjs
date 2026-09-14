const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbFile = fs.existsSync('data/database.sqlite') ? 'data/database.sqlite' : 'data/dev-database.sqlite';
const db = new Database(dbFile);

const uploadsDir = path.join(process.cwd(), 'uploads');
const invoices = db.prepare("SELECT * FROM files WHERE original_name LIKE 'INV-%.pdf'").all();
let deleted = 0;

for (const inv of invoices) {
    const sysPath = path.join(uploadsDir, (inv.folder_path || '/').replace(/^\/+/, ''), inv.system_name);
    if (!fs.existsSync(sysPath)) {
        db.prepare("DELETE FROM files WHERE id = ?").run(inv.id);
        deleted++;
    }
}

console.log(`Cleaned up ${deleted} ghost invoice records from the database.`);
