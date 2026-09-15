const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const tableTarget = `CREATE TABLE IF NOT EXISTS client_template_settings (
        client_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        frequency TEXT DEFAULT 'Weekly',
        PRIMARY KEY (client_id, template_name)
      );`;

const tableReplacement = `CREATE TABLE IF NOT EXISTS client_template_settings (
        client_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        frequency TEXT DEFAULT 'Weekly',
        PRIMARY KEY (client_id, template_name)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_by_user_id INTEGER NOT NULL,
        FOREIGN KEY (changed_by_user_id) REFERENCES users (id)
      );`;

if (content.includes(tableTarget)) {
    content = content.replace(tableTarget, tableReplacement);
    console.log("Added audit_logs table creation");
} else {
    console.log("Failed to find tableTarget");
}

const apiTarget = `  // ==========================================
  // DATABASE BACKUP ENGINE`;

const apiLogic = `  // ==========================================
  // COMPLIANCE & AUDIT LOGS
  // ==========================================
  app.get("/api/compliance/logs", authenticateToken, requireAdmin, (req: any, res: any) => {
      try {
          const logs = db.prepare(\`
              SELECT al.*, u.first_name, u.last_name
              FROM audit_logs al
              LEFT JOIN users u ON al.changed_by_user_id = u.id
              ORDER BY al.timestamp DESC
              LIMIT 500
          \`).all();
          res.json(logs);
      } catch (err) {
          logger.error("Failed to fetch audit logs", err);
          res.status(500).json({ error: "Failed to fetch audit logs" });
      }
  });

  app.get("/api/compliance/evidence/matrix", authenticateToken, requireAdmin, (req: any, res: any) => {
      try {
          const { staffId, clientId, startDate, endDate } = req.query;
          let query = \`
            SELECT s.*, 
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   srv.name as service_name, srv.code as service_code, srv.type as service_type,
                   COALESCE(c.funding_type, 'NDIS') as funding_type
            FROM shifts s
            LEFT JOIN users u ON s.staff_id = u.id
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN services srv ON s.service_id = srv.id
            WHERE s.status = 'COMPLETED'
          \`;
          let params = [];

          if (staffId) {
              query += " AND s.staff_id = ?";
              params.push(staffId);
          }
          if (clientId) {
              query += " AND s.client_id = ?";
              params.push(clientId);
          }
          if (startDate) {
              query += " AND s.start_time >= ?";
              params.push(startDate + "T00:00:00");
          }
          if (endDate) {
              query += " AND s.end_time <= ?";
              params.push(endDate + "T23:59:59");
          }

          query += " ORDER BY s.start_time DESC LIMIT 1000";

          const matrix = db.prepare(query).all(...params);
          res.json(matrix);
      } catch (err) {
          logger.error("Failed to fetch evidence matrix", err);
          res.status(500).json({ error: "Failed to fetch matrix" });
      }
  });

  app.get("/api/compliance/export/evidence", authenticateToken, requireAdmin, (req: any, res: any) => {
      try {
          const { staffId, clientId, startDate, endDate } = req.query;
          let query = \`
            SELECT s.*, 
                   u.first_name as staff_first_name, u.last_name as staff_last_name,
                   c.first_name as client_first_name, c.last_name as client_last_name,
                   srv.name as service_name, srv.code as service_code, srv.type as service_type,
                   COALESCE(c.funding_type, 'NDIS') as funding_type
            FROM shifts s
            LEFT JOIN users u ON s.staff_id = u.id
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN services srv ON s.service_id = srv.id
            WHERE s.status = 'COMPLETED'
          \`;
          let params = [];

          if (staffId) {
              query += " AND s.staff_id = ?";
              params.push(staffId);
          }
          if (clientId) {
              query += " AND s.client_id = ?";
              params.push(clientId);
          }
          if (startDate) {
              query += " AND s.start_time >= ?";
              params.push(startDate + "T00:00:00");
          }
          if (endDate) {
              query += " AND s.end_time <= ?";
              params.push(endDate + "T23:59:59");
          }

          query += " ORDER BY s.start_time DESC LIMIT 1000";
          const matrix = db.prepare(query).all(...params) as any[];

          const exportData = matrix.map(row => {
              const startString = row.actual_start_time ? new Date(row.actual_start_time).toLocaleString() : (row.start_time ? new Date(row.start_time).toLocaleString() : 'N/A');
              const endString = row.actual_finish_time ? new Date(row.actual_finish_time).toLocaleString() : (row.end_time ? new Date(row.end_time).toLocaleString() : 'N/A');
              
              let hrs = 0;
              let qtyOverride = null;
              try {
                  if (row.services_json) {
                      const srvList = JSON.parse(row.services_json);
                      if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== '') {
                          qtyOverride = parseFloat(srvList[0].qtyOverride);
                      }
                  }
              } catch (e) {}

              if (qtyOverride !== null && !isNaN(qtyOverride)) {
                  hrs = qtyOverride;
              } else {
                  if (row.actual_start_time && row.actual_finish_time) {
                      const aHrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;
                      if (aHrs > 0) hrs = aHrs;
                      else hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                  } else if (row.start_time && row.end_time) {
                      hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                  }
              }

              const isHC = (row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP');
              const pt_km = row.provider_travel_km || 0;
              const abt_km = row.abt_km || 0;
              const hasPT = pt_km > 0;
              const hasABT = abt_km > 0;
              
              let travelCat = 'None';
              if (hasPT && hasABT) travelCat = 'PT + ABT';
              else if (hasPT) travelCat = 'Provider Travel (PT)';
              else if (hasABT) travelCat = 'Transport (ABT)';

              return {
                  'Shift ID': row.id,
                  'Client Name': \`\${row.client_first_name || ''} \${row.client_last_name || ''}\`.trim(),
                  'Staff Name': \`\${row.staff_first_name || ''} \${row.staff_last_name || ''}\`.trim(),
                  'Service Date': startString.split(',')[0],
                  'Shift Timestamps': \`\${startString} - \${endString}\`,
                  'Care Type': row.service_name || 'Multiple/Custom',
                  'Logged Care Hrs': hrs.toFixed(2),
                  'Progress Note Status': row.progress_note_status || 'MISSING',
                  'Travel Category': travelCat,
                  'Transport KM': abt_km,
                  'Start Odometer': row.start_odometer || 0,
                  'End Odometer': row.end_odometer || 0,
                  'Travel Route': row.transport_route_log || 'N/A'
              };
          });

          const worksheet = xlsx.utils.json_to_sheet(exportData);
          const workbook = xlsx.utils.book_new();
          xlsx.utils.book_append_sheet(workbook, worksheet, "Evidence Ledger");
          
          const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });
          
          res.setHeader("Content-Disposition", "attachment; filename=evidence_ledger.xlsx");
          res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
          res.send(buffer);
      } catch (err) {
          logger.error("Failed to export evidence matrix", err);
          res.status(500).json({ error: "Failed to export matrix" });
      }
  });

  // ==========================================
  // DATABASE BACKUP ENGINE`;

if (content.includes(apiTarget)) {
    content = content.replace(apiTarget, apiLogic);
    console.log("Added Compliance endpoints");
    fs.writeFileSync('src/server.ts', content);
} else {
    console.log("Failed to find apiTarget");
}
