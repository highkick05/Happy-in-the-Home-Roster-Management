const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbFile = fs.existsSync('data/database.sqlite') ? 'data/database.sqlite' : 'data/dev-database.sqlite';
const db = new Database(dbFile);

let srvContent = fs.readFileSync('src/server.ts', 'utf8');
const searchStr = `  app.post("/api/invoices/:id/submit-trilogy"`;
const insertStr = `
  app.post("/api/admin/invoices/regenerate-pdfs", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const invoices = db.prepare("SELECT * FROM invoices WHERE status = 'PAID' AND invoice_number IS NOT NULL").all();
      let generated = 0;
      
      for (const invoiceRow of invoices) {
        let data = null;
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }
        
        if (data && data.lineItems && data.lineItems.length > 0) {
          const clientNameSafe = \`\${data.shift.c_fn} \${data.shift.c_ln}\`.trim().replace(/[\\/\\\\]/g, "");
          const folderPath = \`/Clients/\${clientNameSafe}/Invoices\`;
          let subfolder = folderPath;
          subfolder = path.normalize(subfolder).replace(/^(\\.\\.[\\/\\\\])+/, "");
          if (subfolder.startsWith("/")) subfolder = subfolder.substring(1);
          
          const rawSystemName = \`\${data.invoiceNum}.pdf\`;
          const systemName = path.posix.join(subfolder, rawSystemName);
          const targetDir = path.join(process.cwd(), "uploads", subfolder);
          
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const filePath = path.join(targetDir, rawSystemName);
          
          const doc = new PDFDocument({ margin: 50 });
          const writeStream = fs.createWriteStream(filePath);
          doc.pipe(writeStream);
          
          buildInvoicePdf(doc, data);
          doc.end();
          
          await new Promise((resolve) => writeStream.on("finish", resolve));
          
          const stats = fs.statSync(filePath);
          
          // clean up old ghost db records for this pdf
          db.prepare("DELETE FROM files WHERE original_name = ? AND folder_path = ?").run(\`\${data.invoiceNum}.pdf\`, folderPath);
          
          try {
            const stmt = db.prepare(
              "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)"
            );
            stmt.run(
              \`\${data.invoiceNum}.pdf\`,
              rawSystemName,
              stats.size,
              req.user.id,
              folderPath
            );
          } catch (e) {
             console.error("Failed to insert file record", e);
          }
          generated++;
        }
      }
      res.json({ success: true, generated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to regenerate invoices" });
    }
  });

  app.post("/api/invoices/:id/submit-trilogy"`;

srvContent = srvContent.replace(searchStr, insertStr);
fs.writeFileSync('src/server.ts', srvContent);
console.log("Added regenerate API to server.ts");
