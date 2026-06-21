import db from './db.js';

console.log("Starting table recreation...");
db.exec(`
  PRAGMA foreign_keys = OFF;

  CREATE TABLE IF NOT EXISTS shifts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER,
    client_id INTEGER NOT NULL,
    service_id INTEGER,
    respite_booking_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'VOID')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actual_start_time DATETIME,
    actual_finish_time DATETIME,
    odometer_start_reading REAL,
    odometer_start_photo TEXT,
    odometer_end_reading REAL,
    odometer_end_photo TEXT,
    funding_type TEXT DEFAULT 'NDIS',
    provider_travel_km REAL,
    provider_travel_cost REAL,
    abt_km REAL,
    abt_cost REAL,
    transport_route_log TEXT,
    services_json TEXT CHECK(json_valid(services_json) OR services_json IS NULL),
    batch_id TEXT,
    custom_staff_name TEXT,
    is_abt_approved INTEGER DEFAULT 0,
    travel_breakdown TEXT
  );

  INSERT OR IGNORE INTO shifts_new (id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, abt_km, abt_cost, transport_route_log, services_json, batch_id, custom_staff_name, is_abt_approved, travel_breakdown)
  SELECT id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, abt_km, abt_cost, transport_route_log, services_json, batch_id, custom_staff_name, is_abt_approved, travel_breakdown FROM shifts;

  DROP TABLE shifts;
  ALTER TABLE shifts_new RENAME TO shifts;

  CREATE INDEX IF NOT EXISTS idx_shifts_client_id ON shifts(client_id);
  CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
  CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
  CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
  CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time); 
  CREATE INDEX IF NOT EXISTS idx_shifts_client_start_time ON shifts(client_id, start_time);
  CREATE INDEX IF NOT EXISTS idx_shifts_staff_start_time ON shifts(staff_id, start_time);
  CREATE INDEX IF NOT EXISTS idx_shifts_status_start_time ON shifts(status, start_time);
  CREATE INDEX IF NOT EXISTS idx_shifts_service ON shifts(service_id);
  CREATE INDEX IF NOT EXISTS idx_shifts_funding ON shifts(funding_type);
  CREATE INDEX IF NOT EXISTS idx_shifts_respite ON shifts(respite_booking_id);

  PRAGMA foreign_keys = ON;
`);
console.log("Recreation successful!");
