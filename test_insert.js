import Database from 'better-sqlite3';
const db = new Database('./data/dev-database.sqlite');
try {
  db.prepare("INSERT INTO shifts (client_id, service_id, start_time, end_time, status) VALUES (1, null, '2026-08-17T07:00', '2026-08-17T08:00', 'DRAFT')").run();
  console.log("Success");
} catch(e) {
  console.log(e);
}
