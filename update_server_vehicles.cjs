const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      CREATE TABLE IF NOT EXISTS users (`;
const replacementStr = `      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rego TEXT NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS users (`;

if (code.includes(targetStr) && !code.includes('CREATE TABLE IF NOT EXISTS vehicles')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Added vehicles table');
}

const targetStr2 = `      ["odometer_end_reading", "REAL"],`;
const replacementStr2 = `      ["odometer_end_reading", "REAL"],
      ["vehicle_id", "INTEGER"],`;

if (code.includes(targetStr2) && !code.includes('["vehicle_id", "INTEGER"]')) {
  code = code.replace(targetStr2, replacementStr2);
  fs.writeFileSync(file, code);
  console.log('Added vehicle_id column to shifts');
}
