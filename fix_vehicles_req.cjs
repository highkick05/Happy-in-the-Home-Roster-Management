const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/app\.get\("\/api\/vehicles", authenticateToken, \(req, res\) => \{/g, 'app.get("/api/vehicles", authenticateToken, (req: any, res: any) => {');
code = code.replace(/app\.get\("\/api\/vehicles\/all", authenticateToken, \(req, res\) => \{/g, 'app.get("/api/vehicles/all", authenticateToken, (req: any, res: any) => {');
code = code.replace(/app\.post\("\/api\/vehicles", authenticateToken, \(req, res\) => \{/g, 'app.post("/api/vehicles", authenticateToken, (req: any, res: any) => {');
code = code.replace(/app\.put\("\/api\/vehicles\/:id", authenticateToken, \(req, res\) => \{/g, 'app.put("/api/vehicles/:id", authenticateToken, (req: any, res: any) => {');
code = code.replace(/app\.delete\("\/api\/vehicles\/:id", authenticateToken, \(req, res\) => \{/g, 'app.delete("/api/vehicles/:id", authenticateToken, (req: any, res: any) => {');

fs.writeFileSync(file, code);
