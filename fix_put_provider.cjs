const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `  app.put("/api/providers/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
    } = req.body;`;

const newStr = `  app.put("/api/providers/:id", authenticateToken, requireAdmin, (req, res) => {
    const {
      companyName,
      contactName,
      email,
      phone,
      address,
      providerType,
      managementFee,
      canEmailInvoices,
    } = req.body;`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  fs.writeFileSync('src/server.ts', content);
  console.log("Updated PUT provider variables");
} else {
  console.log("Could not find string for PUT provider");
}
