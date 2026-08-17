import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// For POST /api/shifts (create)
content = content.replace(
  `              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND status != 'CANCELLED'`,
  `              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND status != 'CANCELLED' AND id != ?`
);

content = content.replace(
  `            .get(
              singleStaffId,
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;`,
  `            .get(
              singleStaffId,
              -1, // Dummy ID for create so we don't conflict with nothing
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;`
);

// For PUT /api/shifts/:id (update)
content = content.replace(
  `            .prepare(\`
              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND status != 'CANCELLED' AND id != ?
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              LIMIT 1
            \`)
            .get(
              singleStaffId,
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;`,
  `            .prepare(\`
              SELECT id, start_time, end_time, client_id FROM shifts 
              WHERE staff_id = ? AND status != 'CANCELLED' AND id != ?
              AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
              LIMIT 1
            \`)
            .get(
              singleStaffId,
              id,
              endDateTime,
              startDateTime,
              endDateTime,
              startDateTime,
              startDateTime,
              endDateTime
            ) as any;`
);

fs.writeFileSync(file, content);
