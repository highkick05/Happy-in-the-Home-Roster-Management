const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `        if (!invoiceRow.services_json && !invoiceRow.respite_booking_id && !invoiceRow.shift_id) {
          const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(invoiceRow.client_id) as any;
          if (!client) return res.status(404).json({ error: "Client not found" });
          
          const clientNameSafe = \\\`\\\${client.first_name || ""} \\\${client.last_name || ""}\\\`.trim().replace(/[\\\\/\\\\]/g, "");
          const filePath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices", invoiceRow.file_path);
          
          if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
          }
          return res.sendFile(filePath);
        }`;

const replaceStr = `        if (!invoiceRow.services_json && !invoiceRow.respite_booking_id && !invoiceRow.shift_id) {
          const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(invoiceRow.client_id) as any;
          if (!client) return res.status(404).json({ error: "Client not found" });
          
          const clientNameSafe = \`\${client.first_name || ""} \${client.last_name || ""}\`.trim().replace(/[\\\\/\\\\]/g, "");
          const filePath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices", invoiceRow.file_path);
          
          if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
          }
          return res.sendFile(filePath);
        }`;

code = code.replace(targetStr, replaceStr);

// I should probably also check if there are other occurrences.
const regex = /const clientNameSafe = \\`\\\$\\{client\.first_name \|\| ""\\} \\\$\\{client\.last_name \|\| ""\\}\\`\.trim\(\)\.replace\(\/\[\\\\\\\\\/\\\\\\\\\]\/g, ""\);/g;
code = code.replace(regex, 'const clientNameSafe = `${client.first_name || ""} ${client.last_name || ""}`.trim().replace(/[\\\\/\\\\]/g, "");');

fs.writeFileSync('src/server.ts', code);
console.log("Fixed!");
