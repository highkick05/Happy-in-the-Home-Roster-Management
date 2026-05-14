-- Migration Script for Schema Stability & Constraints
-- This script safely implements constraints without deleting existing data

-- 1. Ensure foreign keys are enabled properly
PRAGMA foreign_keys = OFF;

-- 2. Quotes Table Update (Fixing Foreign Key ON DELETE CASCADE & JSON check)
CREATE TABLE IF NOT EXISTS quotes_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_number TEXT UNIQUE,
  client_id INTEGER NOT NULL,
  staff_id INTEGER,
  activity_name TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  services_json TEXT NOT NULL CHECK(json_valid(services_json)),
  amount REAL NOT NULL CHECK(amount >= 0),
  file_path TEXT,
  important_notes TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACCEPTED', 'REJECTED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
);
INSERT OR IGNORE INTO quotes_new SELECT * FROM quotes;
DROP TABLE quotes;
ALTER TABLE quotes_new RENAME TO quotes;

-- 3. Shifts Table Update (Adding json_valid check to services_json)
CREATE TABLE IF NOT EXISTS shifts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  service_id INTEGER,
  respite_booking_id INTEGER,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'IN_PROGRESS')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  actual_start_time TEXT,
  actual_finish_time TEXT,
  odometer_start_reading TEXT,
  odometer_start_photo TEXT,
  odometer_end_reading TEXT,
  odometer_end_photo TEXT,
  funding_type TEXT DEFAULT 'NDIS',
  provider_travel_km REAL DEFAULT 0,
  provider_travel_cost REAL DEFAULT 0,
  abt_km REAL DEFAULT 0,
  abt_cost REAL DEFAULT 0,
  transport_route_log TEXT,
  services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE CASCADE,
  CHECK (start_time < end_time)
);
INSERT OR IGNORE INTO shifts_new (id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, abt_km, abt_cost, transport_route_log, services_json)
SELECT id, staff_id, client_id, service_id, respite_booking_id, start_time, end_time, status, notes, created_at, actual_start_time, actual_finish_time, odometer_start_reading, odometer_start_photo, odometer_end_reading, odometer_end_photo, funding_type, provider_travel_km, provider_travel_cost, abt_km, abt_cost, transport_route_log, services_json FROM shifts;
DROP TABLE shifts;
ALTER TABLE shifts_new RENAME TO shifts;

-- 4. Client Roster Templates Update (Adding json_valid check to services_json)
CREATE TABLE IF NOT EXISTS client_roster_templates_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  staff_id INTEGER NOT NULL,
  service_id INTEGER,
  services_json TEXT CHECK(services_json IS NULL OR services_json = '' OR json_valid(services_json)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);
INSERT OR IGNORE INTO client_roster_templates_new SELECT * FROM client_roster_templates;
DROP TABLE client_roster_templates;
ALTER TABLE client_roster_templates_new RENAME TO client_roster_templates;

-- 5. Turn foreign keys back on
PRAGMA foreign_keys = ON;

-- 6. Add covering indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_shifts_client_id ON shifts(client_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_respite_bookings_client_id ON respite_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_respite_bookings_service_id ON respite_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_client_roster_templates_client_id ON client_roster_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_roster_templates_staff_id ON client_roster_templates(staff_id);
CREATE INDEX IF NOT EXISTS idx_client_roster_templates_day ON client_roster_templates(day_of_week);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_staff_id ON quotes(staff_id);
