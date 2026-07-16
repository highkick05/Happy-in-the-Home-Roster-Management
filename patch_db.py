import re

with open("src/server.ts", "r") as f:
    code = f.read()

migration_code = """
  try {
    const shiftCols = db.pragma("table_info(shifts)") as any[];
    const colNames = shiftCols.map((c: any) => c.name);
    const colsToAdd = [
      ["transport_route_log", "TEXT"],
      ["services_json", "TEXT"],
      ["home_care_travel_km", "REAL DEFAULT 0"],
      ["home_care_travel_total", "REAL DEFAULT 0"],
      ["batch_id", "TEXT"],
      ["odometer_start_photo", "TEXT"],
      ["odometer_end_photo", "TEXT"],
      ["odometer_start_reading", "REAL"],
      ["odometer_end_reading", "REAL"],
      ["merged_into_shift_id", "INTEGER"]
    ];
    for (const [colName, colType] of colsToAdd) {
      if (!colNames.includes(colName)) {
        db.exec(`ALTER TABLE shifts ADD COLUMN ${colName} ${colType}`);
        console.log(`[DEBUG] Added missing column shifts.${colName}`);
      }
    }
  } catch (e: any) {
    console.warn("Migration warning for shifts cols:", e.message);
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log("[DEBUG] Created settings table if missing");
  } catch (e: any) {
    console.warn("Migration warning for settings table:", e.message);
  }
"""

code = code.replace('db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");', 'db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");\n' + migration_code)

with open("src/server.ts", "w") as f:
    f.write(code)
