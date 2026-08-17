import Database from 'better-sqlite3';
const db = new Database('./data/dev-database.sqlite');
db.prepare('PRAGMA foreign_keys = ON').run();
try {
  const info = db.prepare('INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type, is_historical, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(1, 1, 'orientation', '2026-08-17T09:00:00Z', '2026-08-17T10:00:00Z', 'DRAFT', '', '[{\"serviceId\":\"orientation\"}]', 0, 'NDIS', 0, null);
  console.log(info);
} catch (e) {
  console.log('Error', e);
}
