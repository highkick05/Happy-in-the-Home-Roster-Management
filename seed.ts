import db from './db.ts';
db.exec(`
INSERT INTO respite_bookings (id, client_id, start_time, end_time, status) VALUES (1, 1, '2026-07-29T10:00:00.000Z', '2026-07-29T12:00:00.000Z', 'PUBLISHED');
`);
