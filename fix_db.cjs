const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');

try {
  db.exec("ALTER TABLE shifts ADD COLUMN transport_route_log TEXT");
  console.log("Added transport_route_log to shifts");
} catch(e) {
  console.log("Failed transport_route_log:", e.message);
}

try {
  db.exec("ALTER TABLE invoices ADD COLUMN merged_into_shift_id INTEGER");
  console.log("Added merged_into_shift_id to invoices");
} catch(e) {
  console.log("Failed merged_into_shift_id:", e.message);
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  console.log("Created settings");
} catch(e) {
  console.log("Failed settings:", e.message);
}

const shiftsCols = [
  ["services_json", "TEXT"],
  ["home_care_travel_km", "REAL DEFAULT 0"],
  ["home_care_travel_total", "REAL DEFAULT 0"],
  ["batch_id", "TEXT"],
  ["odometer_start_photo", "TEXT"],
  ["odometer_end_photo", "TEXT"],
  ["odometer_start_reading", "REAL"],
  ["odometer_end_reading", "REAL"]
];

for(const [col, type] of shiftsCols) {
  try {
    db.exec(`ALTER TABLE shifts ADD COLUMN ${col} ${type}`);
    console.log(`Added ${col} to shifts`);
  } catch(e) {}
}

console.log("Done fixing DB.");
