import re

with open("src/server.ts", "r") as f:
    code = f.read()

target = """        let query = `
        SELECT s.*, 
               u.first_name as staff_first, u.last_name as staff_last,
               c.first_name as client_first, c.last_name as client_last,
               c.funding_type
        FROM shifts s
        JOIN users u ON s.staff_id = u.id
        JOIN clients c ON s.client_id = c.id
        WHERE s.status = 'COMPLETED'
      `;
        const params: any[] = [];
        if (clientId) {
          query += ` AND s.client_id = ?`;
          params.push(clientId);
        }
        if (staffId) {
          query += ` AND s.staff_id = ?`;
          params.push(staffId);
        }
        if (startDate) {
          query += ` AND (s.actual_start_time >= ? OR s.start_time >= ?)`;
          const st = startDate.includes("T")
            ? startDate
            : startDate + "T00:00:00.000Z";
          params.push(st, st);
        }
        if (endDate) {
          query += ` AND (s.actual_start_time <= ? OR s.start_time <= ?)`;
          const et = endDate.includes("T")
            ? endDate
            : endDate + "T23:59:59.999Z";
          params.push(et, et);
        }
        query += ` ORDER BY COALESCE(s.actual_start_time, s.start_time) DESC`;"""

replacement = """        let query = `
        WITH ShiftsWithLag AS (
          SELECT s.*, 
                 u.first_name as staff_first, u.last_name as staff_last,
                 c.first_name as client_first, c.last_name as client_last,
                 c.funding_type,
                 c.address as destination_address,
                 LAG(c.address) OVER (PARTITION BY s.staff_id, DATE(s.start_time) ORDER BY s.start_time) as origin_address,
                 CAST((strftime('%s', s.start_time) - strftime('%s', LAG(s.end_time) OVER (PARTITION BY s.staff_id, DATE(s.start_time) ORDER BY s.start_time))) / 60 AS INTEGER) as travel_minutes
          FROM shifts s
          JOIN users u ON s.staff_id = u.id
          JOIN clients c ON s.client_id = c.id
        )
        SELECT * FROM ShiftsWithLag
        WHERE status = 'COMPLETED'
      `;
        const params: any[] = [];
        if (clientId) {
          query += ` AND client_id = ?`;
          params.push(clientId);
        }
        if (staffId) {
          query += ` AND staff_id = ?`;
          params.push(staffId);
        }
        if (startDate) {
          query += ` AND (actual_start_time >= ? OR start_time >= ?)`;
          const st = startDate.includes("T")
            ? startDate
            : startDate + "T00:00:00.000Z";
          params.push(st, st);
        }
        if (endDate) {
          query += ` AND (actual_start_time <= ? OR start_time <= ?)`;
          const et = endDate.includes("T")
            ? endDate
            : endDate + "T23:59:59.999Z";
          params.push(et, et);
        }
        query += ` ORDER BY COALESCE(actual_start_time, start_time) DESC`;"""

code = code.replace(target, replacement)

with open("src/server.ts", "w") as f:
    f.write(code)

print("Replaced!")
