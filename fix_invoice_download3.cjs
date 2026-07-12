const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const target = `
        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });
`;

const replacement = `
        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data) {
          if (invoiceRow.file_path) {
            // It might be a historical invoice
            const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(invoiceRow.client_id) as any;
            if (client) {
              const clientNameSafe = \`\${client.first_name || ""} \${client.last_name || ""}\`.trim().replace(/[\\\\/\\\\]/g, "");
              const folderPath = path.join(process.cwd(), "uploads", "Clients", clientNameSafe, "Invoices");
              const destPath = path.join(folderPath, invoiceRow.file_path);
              if (fs.existsSync(destPath)) {
                return res.download(destPath, invoiceRow.file_path);
              } else {
                console.error("Historical invoice file not found:", destPath);
              }
            }
          }
          return res.status(404).json({ error: "Invoice data not found" });
        }
`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
