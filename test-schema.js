import db from './db.js';
db.exec(`
CREATE TABLE users (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, address TEXT);
CREATE TABLE clients (id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, funding_type TEXT, address TEXT);
CREATE TABLE vehicles (id INTEGER PRIMARY KEY, name TEXT, rego TEXT);
CREATE TABLE shifts (id INTEGER PRIMARY KEY, staff_id INTEGER, client_id INTEGER, vehicle_id INTEGER, start_time TEXT, end_time TEXT, status TEXT, notes TEXT);
`);
try {
  db.prepare(`
    WITH ShiftsWithLag AS (
          SELECT s.*,
                  u.first_name as staff_first, u.last_name as staff_last,
                 c.first_name as client_first, c.last_name as client_last,
                 COALESCE(c.funding_type, 'NDIS') as funding_type,
                 c.address as destination_address,
                 COALESCE(LAG(c.address) OVER (PARTITION BY s.staff_id, DATE(s.start_time) ORDER BY s.start_time), u.address) as origin_address,
                 CAST((strftime('%s', s.start_time) - strftime('%s', LAG(s.end_time) OVER (PARTITION BY s.staff_id, DATE(s.start_time) ORDER BY s.start_time))) / 60 AS INTEGER) as travel_minutes,
                 v.name as vehicle_name, v.rego as vehicle_rego
          FROM shifts s
          JOIN users u ON s.staff_id = u.id
          JOIN clients c ON s.client_id = c.id
          LEFT JOIN vehicles v ON s.vehicle_id = v.id
          WHERE (s.status IN ('COMPLETED', 'CANCELLED', 'HISTORICAL') OR s.notes LIKE '%[HISTORICAL]%') AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
        )
        SELECT * FROM ShiftsWithLag WHERE 1=1
  `).all();
  console.log("Success");
} catch(e) {
  console.log("Error:", e.message);
}
