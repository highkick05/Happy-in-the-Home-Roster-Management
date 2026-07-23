import fs from 'fs';
let content = fs.readFileSync('src/server.ts', 'utf8');

// 1. matrix
content = content.replace(
  `JOIN clients c ON s.client_id = c.id
        )
        SELECT * FROM ShiftsWithLag
        WHERE status = 'COMPLETED'`,
  `JOIN clients c ON s.client_id = c.id
          WHERE (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
        )
        SELECT * FROM ShiftsWithLag
        WHERE status = 'COMPLETED'`
);

// 2. export/evidence (matrix export)
content = content.replace(
  `JOIN clients c ON s.client_id = c.id
        )
        SELECT * FROM ShiftsWithLag
        WHERE status = 'COMPLETED'
      \`;`,
  `JOIN clients c ON s.client_id = c.id
          WHERE (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
        )
        SELECT * FROM ShiftsWithLag
        WHERE status = 'COMPLETED'
      \`;`
);

// 3. evidence
content = content.replace(
  `WHERE s.client_id = ? AND s.status = 'COMPLETED'`,
  `WHERE s.client_id = ? AND s.status = 'COMPLETED' AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)`
);

// 4. staff-logbook
content = content.replace(
  `WHERE s.staff_id = ? AND s.status = 'COMPLETED'`,
  `WHERE s.staff_id = ? AND s.status = 'COMPLETED' AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)`
);

fs.writeFileSync('src/server.ts', content);
