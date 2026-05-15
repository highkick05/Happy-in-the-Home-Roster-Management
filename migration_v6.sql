-- migration_v6.sql
-- Database constraints and indexing hardening

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Invoices constraints: prevent deletion orphans
CREATE TABLE IF NOT EXISTS invoices_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE,
  shift_id INTEGER,
  provider_id INTEGER,
  client_id INTEGER,
  amount REAL NOT NULL CHECK(amount >= 0),
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'GENERATED' CHECK(status IN ('GENERATED', 'SENT', 'PAID', 'VOID')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  merged_into_shift_id INTEGER,
  respite_booking_id INTEGER,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (respite_booking_id) REFERENCES respite_bookings(id) ON DELETE SET NULL
);
INSERT OR IGNORE INTO invoices_new SELECT * FROM invoices;
DROP TABLE invoices;
ALTER TABLE invoices_new RENAME TO invoices;

-- Files table: adding region, folder_path, and foreign key ON DELETE RESTRICT
CREATE TABLE IF NOT EXISTS files_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  system_name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size >= 0),
  uploaded_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  region TEXT,
  folder_path TEXT DEFAULT '/',
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);
INSERT OR IGNORE INTO files_new SELECT * FROM files;
DROP TABLE files;
ALTER TABLE files_new RENAME TO files;

-- Optimized indexes
CREATE INDEX IF NOT EXISTS idx_respite_client ON respite_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_respite_start_time ON respite_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_respite_client_start_time ON respite_bookings(client_id, start_time);
CREATE INDEX IF NOT EXISTS idx_respite_service ON respite_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_respite_status ON respite_bookings(status);

CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_shifts_client ON shifts(client_id);
CREATE INDEX IF NOT EXISTS idx_shifts_respite ON shifts(respite_booking_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_client_start_time ON shifts(client_id, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_start_time ON shifts(staff_id, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status_start_time ON shifts(status, start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_service ON shifts(service_id);
CREATE INDEX IF NOT EXISTS idx_shifts_funding ON shifts(funding_type);
CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time); 

CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_staff ON quotes(staff_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_activity_date ON quotes(activity_date);

CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);

CREATE INDEX IF NOT EXISTS idx_client_services_client ON client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service ON client_services(service_id);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_system_name ON files(system_name);

CREATE INDEX IF NOT EXISTS idx_client_roster_templates_client ON client_roster_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_client_roster_templates_staff ON client_roster_templates(staff_id);
CREATE INDEX IF NOT EXISTS idx_client_roster_templates_service ON client_roster_templates(service_id);
CREATE INDEX IF NOT EXISTS idx_client_templates_client ON client_roster_templates(client_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_clients_provider ON clients(provider_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMIT;

PRAGMA foreign_keys = ON;
