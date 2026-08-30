const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Find app.post("/api/remittances"
let start = code.indexOf('app.post(\n    "/api/remittances",');

// Find the end of this app.post block
let end = -1;
let depth = 0;
let started = false;
for (let i = start; i < code.length; i++) {
  if (code[i] === '{') {
    depth++;
    started = true;
  } else if (code[i] === '}') {
    depth--;
    if (started && depth === 0) {
      end = i;
      break;
    }
  }
}
// Include the `);`
let finish = code.indexOf(';', end);

let newCode = `app.post(
    "/api/remittances/manual",
    authenticateToken,
    requireAdmin,
    upload.array("attachments"),
    (req: any, res: any) => {
      let { clientId, staffId, services, date, customStaffName } = req.body;
      
      if (typeof services === 'string') {
        try { services = JSON.parse(services); } catch(e) { return res.status(400).json({ error: "Invalid JSON" }); }
      }
      
      if (!clientId || !staffId || !services || !date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      try {
        const settingsRows = db.prepare("SELECT key, value FROM settings").all() as any[];
        const settingsMap: any = {};
        settingsRows.forEach((r) => { settingsMap[r.key] = r.value; });
        
        let calculatedAmount = 0;
        services.forEach((sd: any) => {
           let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 1;
           let rate = sd.rateOverride ? Number(sd.rateOverride) : 0;
           calculatedAmount += qty * rate;
        });

        const c = db.prepare("SELECT first_name FROM clients WHERE id = ?").get(clientId) as any;
        const cInitial = c ? c.first_name.substring(0, 3).toUpperCase() : "XXX";
        const dateStr = date.replace(/-/g, "").substring(4, 8);
        const timestampPart = Date.now().toString().slice(-3);
        const remittanceNumber = \`REM-\${cInitial}-\${dateStr}-\${timestampPart}\`;

        const isCustomStaff = staffId === "custom";
        const finalStaffId = isCustomStaff ? null : staffId;
        const finalCustomStaffName = isCustomStaff ? (customStaffName || "Generic Staff") : null;

        const attachments = (req.files as any[])?.map(f => ({
          filename: f.originalname,
          path: f.path,
          mimetype: f.mimetype
        })) || [];

        const insertResult = db.prepare(
          \`INSERT INTO remittances (remittance_number, client_id, staff_id, custom_payee_name, amount, status, services_json, attachments_json)
           VALUES (?, ?, ?, ?, ?, 'GENERATED', ?, ?)\`
        ).run(
          remittanceNumber,
          clientId,
          finalStaffId,
          finalCustomStaffName,
          calculatedAmount,
          JSON.stringify(services),
          JSON.stringify(attachments)
        );

        res.json({ success: true, remittance: { id: insertResult.lastInsertRowid } });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  )`;

code = code.substring(0, start) + newCode + code.substring(finish + 1);
fs.writeFileSync('src/server.ts', code);
console.log("Replaced!");
