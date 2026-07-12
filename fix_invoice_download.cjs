const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const target = `
        if (!data)
          return res.status(404).json({ error: "Invoice data not found" });

        if (data.lineItems.length === 0)
          return res.status(400).json({ error: "No billable items" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          \`attachment; filename="\${data.invoiceNum}.pdf"\`,
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);
        buildInvoicePdf(doc, data);
        doc.end();
      } catch (e: any) {
`;

const replacement = `
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
              }
            }
          }
          return res.status(404).json({ error: "Invoice data not found" });
        }

        if (data.lineItems.length === 0)
          return res.status(400).json({ error: "No billable items" });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          \`attachment; filename="\${data.invoiceNum}.pdf"\`,
        );

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);
        buildInvoicePdf(doc, data);
        doc.end();
      } catch (e: any) {
`;

if (!code.includes('if (invoiceRow.file_path) {')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Fixed historical invoice download!");
} else {
  console.log("Already fixed");
}
