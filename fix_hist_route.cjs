const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `  app.post(
    "/api/invoices/historical",
    authenticateToken,
    requireAdmin,
    upload.single("file"),
    (req, res) => {
      const { clientId, date } = req.body;
      const file = req.file;

      if (!clientId || !date || !file) {
        return res.status(400).json({ error: "Missing required fields or file" });
      }

      try {
        const invoiceNum = \\\`HIST-\\\${Date.now()}\\\`;
        const createdAt = \\\`\\\${date} 12:00:00\\\`;

        db.prepare(
          "INSERT INTO invoices (invoice_number, client_id, amount, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          invoiceNum,
          parseInt(clientId),
          0,
          file.filename,
          "PAID",
          createdAt
        );

        res.json({ success: true });
      } catch (e) {
        logger.error(\\\`API Error: \\\${e}\\\`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );`;

const replaceStr = `  app.post(
    "/api/invoices/historical",
    authenticateToken,
    requireAdmin,
    upload.single("file"),
    (req, res) => {
      const { clientId, date } = req.body;
      const file = req.file;

      if (!clientId || !date || !file) {
        return res.status(400).json({ error: "Missing required fields or file" });
      }

      try {
        const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(parseInt(clientId));
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }
        
        const clientNameSafe = \`\${client.first_name || ""} \${client.last_name || ""}\`.trim().replace(/[\\\\/\\\\]/g, "");
        const folderPath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices");
        
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        
        const invoiceNum = \`HIST-\${date.replace(/-/g, '')}-\${Date.now().toString().slice(-4)}\`;
        const newFileName = \`\${invoiceNum}.pdf\`;
        const destPath = path.join(folderPath, newFileName);
        
        // Move the file from temp upload location to the client's invoice folder
        fs.renameSync(file.path, destPath);

        const createdAt = \`\${date} 12:00:00\`;

        db.prepare(
          "INSERT INTO invoices (invoice_number, client_id, amount, file_path, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          invoiceNum,
          parseInt(clientId),
          0,
          newFileName,
          "PAID",
          createdAt
        );

        res.json({ success: true });
      } catch (e) {
        logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );`;

if (!code.includes(targetStr)) {
  console.log("Could not find target string.");
} else {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
}
