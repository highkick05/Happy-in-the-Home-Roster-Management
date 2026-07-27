const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const postBlockOld = `  app.post("/api/providers", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
      canEmailInvoices,
      canEmailInvoices,
    } = req.body;`;

// wait, let me just replace it safely.
