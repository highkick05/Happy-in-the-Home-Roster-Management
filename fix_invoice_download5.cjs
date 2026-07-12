const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const target = `
        const invoiceRow = db
          .prepare("SELECT * FROM invoices WHERE id = ?")
          .get(invoiceId) as any;
        if (!invoiceRow)
          return res.status(404).json({ error: "Invoice not found" });

        let data: any = null;
`;

const replacement = `
        const invoiceRow = db
          .prepare("SELECT * FROM invoices WHERE id = ?")
          .get(invoiceId) as any;
        if (!invoiceRow)
          return res.status(404).json({ error: "Invoice not found" });

        if (!invoiceRow.services_json && !invoiceRow.respite_booking_id && !invoiceRow.shift_id && invoiceRow.file_path) {
          const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(invoiceRow.client_id) as any;
          if (!client) return res.status(404).json({ error: "Client not found" });
          
          const clientNameSafe = \`\${client.first_name || ""} \${client.last_name || ""}\`.trim().replace(/[\\\\/\\\\]/g, "");
          const filePath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices", invoiceRow.file_path);
          
          if (!fs.existsSync(filePath)) {
            console.error("Historical invoice file not found:", filePath);
            return res.status(404).json({ error: "File not found" });
          }
          return res.download(filePath, invoiceRow.file_path);
        }

        let data: any = null;
`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
