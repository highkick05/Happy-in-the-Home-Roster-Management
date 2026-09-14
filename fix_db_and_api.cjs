const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbFile = fs.existsSync('data/database.sqlite') ? 'data/database.sqlite' : 'data/dev-database.sqlite';
const db = new Database(dbFile);

let srvContent = fs.readFileSync('src/server.ts', 'utf8');

// Fix /api/files endpoint to NOT prepend subfolder to system_name
const fileApiTarget = `            const systemName =
              subfolder && subfolder !== "."
                ? path.posix.join(subfolder, req.file.filename)
                : req.file.filename;`;
const fileApiReplace = `            const systemName = req.file.filename; // Fixed: do not include folder in system_name`;
srvContent = srvContent.replace(fileApiTarget, fileApiReplace);

// Let's also fix the DB for all current broken files!
const files = db.prepare("SELECT * FROM files").all();
let fixedDb = 0;
for (const f of files) {
  if (f.system_name && f.system_name.includes('/')) {
     const cleanName = path.basename(f.system_name);
     db.prepare("UPDATE files SET system_name = ? WHERE id = ?").run(cleanName, f.id);
     fixedDb++;
  }
}
console.log("Fixed DB records: ", fixedDb);

// Inject Repair endpoint
const searchStr = `  app.post("/api/invoices/:id/submit-trilogy"`;
const repairApiStr = `
  app.post("/api/admin/invoices/repair", authenticateToken, requireAdmin, async (req, res) => {
    try {
      let fixedDbRecords = 0;
      let regeneratedPdfs = 0;
      let syncedFiles = 0;
      let deletedGhosts = 0;

      // 1. Fix double-paths in \`files\` table (system_name containing folder path)
      const badFiles = db.prepare("SELECT * FROM files WHERE system_name LIKE '%/%' OR system_name LIKE '%\\\\%'").all();
      for (const f of badFiles) {
        const newSystemName = path.basename(f.system_name);
        db.prepare("UPDATE files SET system_name = ? WHERE id = ?").run(newSystemName, f.id);
        fixedDbRecords++;
      }

      // 2. Wipe DB ghosts (file records that don't have physical files)
      const invoiceFiles = db.prepare("SELECT * FROM files WHERE original_name LIKE 'INV-%'").all();
      for (const f of invoiceFiles) {
         const sysPath = path.join(process.cwd(), 'uploads', (f.folder_path || '/').replace(/^\\\\/+/, '').replace(/^\\/+/, ''), f.system_name);
         if (!fs.existsSync(sysPath)) {
             db.prepare("DELETE FROM files WHERE id = ?").run(f.id);
             deletedGhosts++;
         }
      }

      // 3. Scan PAID invoices, check if physical PDF exists. If missing, regenerate.
      const paidInvoices = db.prepare("SELECT * FROM invoices WHERE status = 'PAID' AND invoice_number IS NOT NULL").all();
      for (const inv of paidInvoices) {
         if (inv.file_path && !inv.services_json && !inv.shift_id && !inv.respite_booking_id) {
             continue; // Historical upload, skip generation
         }

         let data = null;
         if (inv.services_json) {
           data = getInvoiceDataForMergedInvoice(inv);
         } else if (inv.respite_booking_id) {
           data = getInvoiceDataForRespiteBooking(inv.respite_booking_id);
         } else if (inv.shift_id) {
           data = getInvoiceDataForShift(inv.shift_id);
         }
         
         if (data && data.lineItems && data.lineItems.length > 0) {
            const clientNameSafe = \`\${data.shift.c_fn} \${data.shift.c_ln}\`.trim().replace(/[\\\\/\\\\]/g, "");
            const folderPath = \`/Clients/\${clientNameSafe}/Invoices\`;
            let subfolder = folderPath;
            subfolder = path.normalize(subfolder).replace(/^(\\.\\.[\\\\/\\\\])+/, "");
            if (subfolder.startsWith("/")) subfolder = subfolder.substring(1);
            
            const rawSystemName = \`\${data.invoiceNum}.pdf\`;
            const targetDir = path.join(process.cwd(), "uploads", subfolder);
            const filePath = path.join(targetDir, rawSystemName);

            if (!fs.existsSync(filePath)) {
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                const doc = new PDFDocument({ margin: 50 });
                const writeStream = fs.createWriteStream(filePath);
                doc.pipe(writeStream);
                buildInvoicePdf(doc, data);
                doc.end();
                await new Promise(resolve => writeStream.on('finish', resolve));
                regeneratedPdfs++;
            }
         }
      }

      // 4. Finally, trigger the normal file sync to ensure any physical files missing from DB are added.
      const clientsDir = path.join(process.cwd(), 'uploads', 'Clients');
      if (fs.existsSync(clientsDir)) {
         const clients = fs.readdirSync(clientsDir);
         for (const c of clients) {
            const invDir = path.join(clientsDir, c, 'Invoices');
            if (fs.existsSync(invDir)) {
               const pdfs = fs.readdirSync(invDir).filter(f => f.endsWith('.pdf'));
               for (const pdf of pdfs) {
                  const folderPath = \`/Clients/\${c}/Invoices\`;
                  const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(pdf, folderPath);
                  if (!existing) {
                     const stat = fs.statSync(path.join(invDir, pdf));
                     db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                        pdf, pdf, stat.size, folderPath, 1
                     );
                     syncedFiles++;
                  }
               }
            }
         }
      }

      res.json({ success: true, fixedDbRecords, deletedGhosts, regeneratedPdfs, syncedFiles });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to repair invoices" });
    }
  });

  app.post("/api/invoices/:id/submit-trilogy"`;
  
if (!srvContent.includes("/api/admin/invoices/repair")) {
  srvContent = srvContent.replace(searchStr, repairApiStr);
}

fs.writeFileSync('src/server.ts', srvContent);
console.log("Injected API!");
