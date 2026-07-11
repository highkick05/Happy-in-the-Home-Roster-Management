const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `      CREATE TABLE IF NOT EXISTS price_list_items (`;

const replaceStr = `      CREATE TABLE IF NOT EXISTS staff_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        shift_id INTEGER,
        client_id INTEGER,
        start_odometer TEXT,
        end_odometer TEXT,
        provider_travel_km REAL DEFAULT 0,
        abt_km REAL DEFAULT 0,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS price_list_items (`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('src/server.ts', code);
    console.log("Success replacing staff_activity block");
} else {
    console.log("Could not find staff_activity target");
}
