const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

let start = code.indexOf('app.post(\n    "/api/remittances/manual",');
if (start === -1) {
  start = code.indexOf('app.post("/api/remittances/manual",');
}

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
        
        const parsedDate = new Date(date);
        const timezone = settingsMap.timezone ? settingsMap.timezone.replace(/['"]+/g, "") : "Australia/Perth";
        // basic day of week, 0=Sun, 6=Sat
        const dayOfWeek = parsedDate.getDay();

        services.forEach((sd: any) => {
           let qty = sd.qtyOverride ? Number(sd.qtyOverride) : 1;
           let finalRate = 0;

           if (sd.isCustom) {
               finalRate = sd.rateOverride ? Number(sd.rateOverride) : 0;
           } else {
               const srv = db.prepare("SELECT * FROM services WHERE id = ?").get(sd.serviceId) as any;
               if (srv) {
                   finalRate = Number(srv.rate || 0);
                   if (srv.type === "HOME_CARE" && srv.rates_json) {
                       try {
                           const rates = JSON.parse(srv.rates_json);
                           if (dayOfWeek === 0 && rates["Sunday"]) finalRate = Number(rates["Sunday"]);
                           else if (dayOfWeek === 6 && rates["Saturday"]) finalRate = Number(rates["Saturday"]);
                           else if (rates["Weekday"]) finalRate = Number(rates["Weekday"]);
                       } catch(e) {}
                   } else if (srv.type === "NDIS" && srv.rates_json) {
                       try {
                           const rates = JSON.parse(srv.rates_json);
                           const region = settingsMap.ndisRegion || "NSW";
                           if (rates[region] !== undefined) finalRate = Number(rates[region]);
                       } catch(e) {}
                   }
               }
           }

           if (sd.rateOverride !== undefined && sd.rateOverride !== null && sd.rateOverride !== "") {
               finalRate = Number(sd.rateOverride);
           }
           calculatedAmount += qty * finalRate;
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
