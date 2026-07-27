const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const postProvider = `  app.post("/api/providers", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
    } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO providers (company_name, contact_name, email, phone, address, provider_type, management_fee) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee || 0,
      );`;

const newPostProvider = `  app.post("/api/providers", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
      canEmailInvoices,
    } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO providers (company_name, contact_name, email, phone, address, provider_type, management_fee, can_email_invoices) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const info = stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee || 0,
        canEmailInvoices === false ? 0 : 1,
      );`;

const putProvider = `  app.put("/api/providers/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
    } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare(
        "UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, provider_type = ?, management_fee = ? WHERE id = ?",
      );
      stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee || 0,
        id,
      );`;

const newPutProvider = `  app.put("/api/providers/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
      canEmailInvoices,
    } = req.body;
    const { id } = req.params;
    try {
      const stmt = db.prepare(
        "UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, provider_type = ?, management_fee = ?, can_email_invoices = ? WHERE id = ?",
      );
      stmt.run(
        companyName,
        contactName,
        email,
        phone,
        address,
        providerType || "NDIS",
        managementFee || 0,
        canEmailInvoices === false ? 0 : 1,
        id,
      );`;

if (code.includes(postProvider)) {
  code = code.replace(postProvider, newPostProvider);
  console.log("Updated POST provider");
}

if (code.includes(putProvider)) {
  code = code.replace(putProvider, newPutProvider);
  console.log("Updated PUT provider");
}

fs.writeFileSync('src/server.ts', code);
