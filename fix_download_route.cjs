const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });`;

const replaceStr = `        if (!invoiceRow.services_json && !invoiceRow.respite_booking_id && !invoiceRow.shift_id) {
          const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(invoiceRow.client_id) as any;
          if (!client) return res.status(404).json({ error: "Client not found" });
          
          const clientNameSafe = \\\`\\\${client.first_name || ""} \\\${client.last_name || ""}\\\`.trim().replace(/[\\\\/\\\\]/g, "");
          const filePath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices", invoiceRow.file_path);
          
          if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
          }
          return res.sendFile(filePath);
        }

        let data: any = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });`;

if (!code.includes('if (!data)\n          return res.status(404).json({ error: "Invoice data not found" });')) {
  console.log("Could not find target string.");
} else {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
}
