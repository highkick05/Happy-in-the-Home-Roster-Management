import db from './db.js';
console.log(JSON.stringify(db.prepare("SELECT s.id, s.start_time, s.end_time, s.actual_start_time, s.actual_finish_time, s.services_json, s.status, u.first_name, c.first_name as client_name FROM shifts s LEFT JOIN users u ON s.staff_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE u.first_name = 'Kaleb'").all(), null, 2));
