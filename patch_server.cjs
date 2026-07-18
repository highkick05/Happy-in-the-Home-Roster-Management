const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /const colNames = tableInfo\.map\(\(col\) => col\.name\);/;
const replaceWith = `const colNames = tableInfo.map((col) => col.name);
    const vTableInfo = db.pragma("table_info(vehicles)") as any[];
    const vColNames = vTableInfo.map((col) => col.name);
    if (!vColNames.includes("is_primary")) {
      db.exec("ALTER TABLE vehicles ADD COLUMN is_primary INTEGER DEFAULT 0");
    }`;

code = code.replace(regex, replaceWith);

const regex2 = /CREATE TABLE IF NOT EXISTS vehicles \([\s\S]*?created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      \);/;
const replace2 = `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rego TEXT NOT NULL,
        user_id INTEGER,
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`;

code = code.replace(regex2, replace2);

fs.writeFileSync(file, code);
console.log("Patched server.ts successfully");
