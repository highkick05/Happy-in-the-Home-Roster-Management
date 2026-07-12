const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `  app.post(
    "/api/invoices/manual",`;

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
        const invoiceNum = \`HIST-\${Date.now()}\`;
        const createdAt = \`\${date} 12:00:00\`;

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
        logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );

  app.post(
    "/api/invoices/manual",`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/server.ts', code);
