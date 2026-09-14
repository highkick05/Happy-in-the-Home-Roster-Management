const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

const oldApiRegex = /app\.post\("\/api\/admin\/invoices\/repair", authenticateToken, requireAdmin, async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to repair invoices" \}\);\s+\}\s+\}\);/m;

const newApi = `app.post("/api/admin/invoices/repair", authenticateToken, requireAdmin, async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const sendLog = (msg) => {
        res.write(msg + '\\n');
    };

    try {
      sendLog("Starting Invoice Repair Engine...");
      let fixedDbRecords = 0;
      let regeneratedPdfs = 0;
      let syncedFiles = 0;
      let deletedGhosts = 0;
      let deletedDbDuplicates = 0;

      sendLog("Step 1: Fixing double-paths in database...");
      const badFiles = db.prepare("SELECT * FROM files WHERE system_name LIKE '%/%' OR system_name LIKE '%\\\\\\\\%'").all();
      for (const f of badFiles) {
        const newSystemName = require('path').basename(f.system_name);
        db.prepare("UPDATE files SET system_name = ? WHERE id = ?").run(newSystemName, f.id);
        fixedDbRecords++;
      }
      sendLog(\`Fixed \${fixedDbRecords} broken paths.\`);

      sendLog("Step 2: Wiping DB ghosts (file records with no physical file)...");
      const invoiceFiles = db.prepare("SELECT * FROM files WHERE original_name LIKE 'INV-%' OR original_name LIKE 'HC-%' OR folder_path LIKE '/Clients/%/Invoices'").all();
      for (const f of invoiceFiles) {
         const sysPath = require('path').join(process.cwd(), 'uploads', (f.folder_path || '/').replace(/^[\\\\\\\\\\\\/]+/, ''), f.system_name);
         if (!fs.existsSync(sysPath)) {
             db.prepare("DELETE FROM files WHERE id = ?").run(f.id);
             deletedGhosts++;
             sendLog(\`Deleted ghost record for: \${f.original_name}\`);
         }
      }
      sendLog(\`Cleared \${deletedGhosts} ghosts.\`);

      sendLog("Step 3: Removing duplicate database records for the same file...");
      // Group by folder_path and system_name to find duplicates
      const allFiles = db.prepare("SELECT * FROM files WHERE folder_path LIKE '/Clients/%'").all();
      const fileMap = {};
      for (const f of allFiles) {
         const key = f.folder_path + '|' + f.system_name;
         if (!fileMap[key]) {
             fileMap[key] = [];
         }
         fileMap[key].push(f);
      }
      for (const key in fileMap) {
         const group = fileMap[key];
         if (group.length > 1) {
            // Sort by ID descending, keep the first (newest), delete the rest
            group.sort((a, b) => b.id - a.id);
            for (let i = 1; i < group.length; i++) {
                db.prepare("DELETE FROM files WHERE id = ?").run(group[i].id);
                deletedDbDuplicates++;
                sendLog(\`Removed duplicate DB record for: \${group[i].original_name}\`);
            }
         }
      }
      sendLog(\`Removed \${deletedDbDuplicates} duplicate database records.\`);

      sendLog("Step 4: Scanning PAID invoices to regenerate missing PDFs...");
      const paidInvoices = db.prepare("SELECT * FROM invoices WHERE status = 'PAID' AND invoice_number IS NOT NULL").all();
      for (const inv of paidInvoices) {
         if (inv.file_path && !inv.services_json && !inv.shift_id && !inv.respite_booking_id) {
             continue; // Historical upload, skip generation
         }

         let data = null;
         try {
           if (inv.services_json) {
             data = getInvoiceDataForMergedInvoice(inv);
           } else if (inv.respite_booking_id) {
             data = getInvoiceDataForRespiteBooking(inv.respite_booking_id);
           } else if (inv.shift_id) {
             data = getInvoiceDataForShift(inv.shift_id);
           }
         } catch (err) {
             // Silently skip if invoice data can't be rebuilt (e.g. missing client)
             continue;
         }
         
         if (data && data.lineItems && data.lineItems.length > 0) {
            const clientNameSafe = \`\${data.shift.c_fn} \${data.shift.c_ln}\`.trim().replace(/[\\\\\\\\/\\\\\\\\]/g, "");
            const folderPath = \`/Clients/\${clientNameSafe}/Invoices\`;
            let subfolder = folderPath;
            subfolder = require('path').normalize(subfolder).replace(/^(\\\\.\\\\.[\\\\\\\\/\\\\\\\\])+/, "");
            if (subfolder.startsWith("/")) subfolder = subfolder.substring(1);
            
            const rawSystemName = \`\${data.invoiceNum}.pdf\`;
            const targetDir = require('path').join(process.cwd(), "uploads", subfolder);
            const filePath = require('path').join(targetDir, rawSystemName);

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
                sendLog(\`Regenerated missing PDF: \${rawSystemName}\`);
            }
         }
      }
      sendLog(\`Regenerated \${regeneratedPdfs} PDFs.\`);

      sendLog("Step 5: Syncing all physical files back to UI...");
      const clientsDir = require('path').join(process.cwd(), 'uploads', 'Clients');
      if (fs.existsSync(clientsDir)) {
         const clients = fs.readdirSync(clientsDir);
         for (const c of clients) {
            const invDir = require('path').join(clientsDir, c, 'Invoices');
            if (fs.existsSync(invDir)) {
               const pdfs = fs.readdirSync(invDir).filter(f => f.endsWith('.pdf'));
               for (const pdf of pdfs) {
                  const folderPath = \`/Clients/\${c}/Invoices\`;
                  const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(pdf, folderPath);
                  if (!existing) {
                     const stat = fs.statSync(require('path').join(invDir, pdf));
                     db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                        pdf, pdf, stat.size, folderPath, 1
                     );
                     syncedFiles++;
                     sendLog(\`Synced unlinked physical file: \${pdf}\`);
                  }
               }
            }
         }
      }
      sendLog(\`Synced \${syncedFiles} files.\`);

      sendLog(\`DONE|Repaired! Fixed \${fixedDbRecords} paths, cleared \${deletedGhosts} ghosts, deleted \${deletedDbDuplicates} duplicates, generated \${regeneratedPdfs} PDFs, synced \${syncedFiles} files.\`);
      res.end();
    } catch (e) {
      console.error(e);
      sendLog("ERROR|Failed to repair invoices: " + e.message);
      res.end();
    }
  });`;

if (oldApiRegex.test(srvContent)) {
    srvContent = srvContent.replace(oldApiRegex, newApi);
    fs.writeFileSync('src/server.ts', srvContent);
    console.log("Updated repair endpoint!");
} else {
    console.log("Could not find the existing repair endpoint. RegExp failed.");
}
