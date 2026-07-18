const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  // --- Compliance APIs ---`;
const replacementStr = `  // --- Travel Logs API ---
  app.get("/api/travel-logs", authenticateToken, (req, res) => {
    try {
      const { clientId, staffId, vehicleId, fundingType, startDate, endDate } = req.query;
      
      let query = \`
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
          WHERE (s.notes != 'Manually generated invoice' OR s.notes IS NULL)
        )
        SELECT * FROM ShiftsWithLag WHERE 1=1
      \`;
      
      const params = [];
      
      if (req.user.role === 'staff') {
        query += " AND staff_id = ?";
        params.push(req.user.id);
      } else if (staffId) {
        query += " AND staff_id = ?";
        params.push(staffId);
      }
      
      if (clientId) {
        query += " AND client_id = ?";
        params.push(clientId);
      }
      
      if (vehicleId) {
        query += " AND vehicle_id = ?";
        params.push(vehicleId);
      }
      
      if (fundingType) {
        query += " AND funding_type = ?";
        params.push(fundingType);
      }
      
      if (startDate) {
        query += " AND DATE(start_time) >= DATE(?)";
        params.push(startDate);
      }
      
      if (endDate) {
        query += " AND DATE(start_time) <= DATE(?)";
        params.push(endDate);
      }
      
      query += " ORDER BY start_time DESC";
      
      const logs = db.prepare(query).all(...params);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching travel logs:", error);
      res.status(500).json({ error: "Failed to fetch travel logs" });
    }
  });

  app.put("/api/travel-logs/:id/odometer", authenticateToken, (req, res) => {
    try {
      const { odometer_start_reading, odometer_end_reading, vehicle_id } = req.body;
      const shiftId = req.params.id;
      
      const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(shiftId);
      if (!shift) return res.status(404).json({ error: "Shift not found" });
      
      if (req.user.role === 'staff' && shift.staff_id !== req.user.id) {
         return res.status(403).json({ error: "Forbidden" });
      }
      
      db.prepare(
        "UPDATE shifts SET odometer_start_reading = ?, odometer_end_reading = ?, vehicle_id = ? WHERE id = ?"
      ).run(odometer_start_reading || null, odometer_end_reading || null, vehicle_id || null, shiftId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating travel log odometer:", error);
      res.status(500).json({ error: "Failed to update odometer" });
    }
  });
  // --- End Travel Logs API ---

  // --- Compliance APIs ---`;

if (code.includes(targetStr) && !code.includes('app.get("/api/travel-logs"')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Added Travel Logs API');
} else {
  console.log('Target string not found or already added');
}
