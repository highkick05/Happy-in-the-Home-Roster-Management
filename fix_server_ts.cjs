const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/app\.get\("\/api\/travel-logs", authenticateToken, \(req, res\) => \{/g, 'app.get("/api/travel-logs", authenticateToken, (req: any, res: any) => {');
code = code.replace(/app\.put\("\/api\/travel-logs\/:id\/odometer", authenticateToken, \(req, res\) => \{/g, 'app.put("/api/travel-logs/:id/odometer", authenticateToken, (req: any, res: any) => {');
code = code.replace(/const vehicle = db\.prepare\("SELECT \* FROM vehicles WHERE id = \?"\)\.get\(req\.params\.id\);/g, 'const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id) as any;');

fs.writeFileSync(file, code);
