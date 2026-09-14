const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');
content = content.replace('\\n  app.post("/api/clients", authenticateToken, requireAdmin', '\\n  app.post("/api/clients", authenticateToken, requireAdmin');
// Wait, the string contains literal backslash n!
content = content.replace(/\\n  app\.post\("\/api\/clients"/g, '\n  app.post("/api/clients"');
fs.writeFileSync('src/server.ts', content);
