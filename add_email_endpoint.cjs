const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const anchor = `      }
    },
  );

  app.get(
    "/api/invoices/:shiftId/download",`;

const endpoint = `      }
    },
  );

  app.post("/api/invoices/:id/email", authenticateToken, async (req, res) => {
    const invoiceId = parseInt(req.params.id);
    if (!invoiceId) return res.status(400).json({ error: "Invalid invoiceId" });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({ error: "SMTP settings are not configured on the server." });
    }

    try {
      const invoiceRow = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);
      if (!invoiceRow) return res.status(404).json({ error: "Invoice not found" });

      const client = db.prepare(\`
        SELECT c.*, p.company_name, p.contact_name as provider_contact, p.email as provider_email
        FROM clients c
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE c.id = ?
      \`).get(invoiceRow.client_id);

      if (!client) return res.status(404).json({ error: "Client not found" });

      const providerEmail = client.provider_email;
      if (!providerEmail) {
        return res.status(400).json({ error: "No provider email assigned to this client." });
      }

      const providerContact = client.provider_contact || client.company_name || 'Provider';
      const clientName = \`\${client.first_name || ""} \${client.last_name || ""}\`.trim();

      const rows = db.prepare("SELECT key, value FROM settings").all();
      const settings = rows.reduce(
        (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
        {}
      );

      const defaultSignature = \`<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; max-width: 450px;">
  <tbody><tr>
    <td style="padding-bottom: 20px;">
      <span style="margin-bottom: 8px; display: block;">Best regards,</span><br>
      <strong style="font-size: 16px;">Matt Willis</strong><br>
      <span>Registered Nurse / Director</span><br>
      <strong style="color: #1a8cff; font-size: 14px;">Happy in the Home</strong><br>
      <span style="font-size: 13px; margin-top: 6px; display: block;">
        <a href="tel:0448909774" style="text-decoration: none; color: inherit;">0448909774</a> | 
        <a href="mailto:info@happyinthehome.org" style="color: #1a8cff; text-decoration: none;">info@happyinthehome.org</a>
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding-bottom: 12px;">
      <img src="https://i.imgur.com/s6Z6Dhx.png" alt="Happy in the Home Logo" width="540" style="display: block; border: none; width: 600px; height: auto;">
    </td>
  </tr>
  <tr>
    <td>
      <span style="font-size: 12px; font-style: italic; line-height: 1.4; display: block; opacity: 0.8;">
        We acknowledge the Traditional Custodians of the Geraldton region, the Amangu people of the Yamatji Nation, and pay our respects to their Elders past, present, and emerging.
      </span>
    </td>
  </tr>
</tbody></table>\`;

      const emailSignature = settings.invoiceEmailSignature || defaultSignature;

      let data = null;
      let pdfBuffer = null;
      let filename = '';
      let invoiceNumber = '';

      if (!invoiceRow.services_json && !invoiceRow.respite_booking_id && !invoiceRow.shift_id && invoiceRow.file_path) {
        const clientNameSafe = clientName.replace(/[\\\\/\\\\]/g, "");
        const filePath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Invoices", invoiceRow.file_path);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: "Historical invoice file not found" });
        }
        pdfBuffer = fs.readFileSync(filePath);
        filename = invoiceRow.file_path;
        invoiceNumber = invoiceRow.invoice_number || \`INV-\${invoiceId}\`;
      } else {
        if (invoiceRow.services_json) {
          data = getInvoiceDataForMergedInvoice(invoiceRow);
        } else if (invoiceRow.respite_booking_id) {
          data = getInvoiceDataForRespiteBooking(invoiceRow.respite_booking_id);
        } else if (invoiceRow.shift_id) {
          data = getInvoiceDataForShift(invoiceRow.shift_id);
        }

        if (!data) return res.status(404).json({ error: "Invoice data not found" });
        if (data.lineItems.length === 0) return res.status(400).json({ error: "No billable items" });

        filename = \`\${data.invoiceNum}.pdf\`;
        invoiceNumber = data.invoiceNum;
        
        pdfBuffer = await new Promise((resolve, reject) => {
          const doc = new PDFDocument({ margin: 50 });
          const chunks = [];
          doc.on('data', chunk => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);
          buildInvoicePdf(doc, data);
          doc.end();
        });
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || "support@happyinthehome.com",
        to: providerEmail,
        subject: \`Invoice \${invoiceNumber} for \${clientName}\`,
        html: \`
          <p>Dear \${providerContact},</p>
          <p>Please find attached invoice \${invoiceNumber} for NDIS supports provided to \${clientName}.</p>
          <p>If you require any further information or if there are any issues with this invoice, please let me know.</p>
          <p>Thank you.</p>
          <br>
          \${emailSignature}
        \`,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);

      db.prepare("UPDATE invoices SET status = 'SENT' WHERE id = ?").run(invoiceId);

      res.json({ success: true, message: "Invoice emailed successfully and marked as SENT." });
    } catch (e) {
      console.error("Failed to email invoice:", e);
      res.status(500).json({ error: e.message || "Failed to send email." });
    }
  });

  app.get(
    "/api/invoices/:shiftId/download",`;

if (code.includes(anchor)) {
    code = code.replace(anchor, endpoint);
    fs.writeFileSync('src/server.ts', code);
    console.log("Injected endpoint!");
} else {
    console.log("Anchor not found.");
}
