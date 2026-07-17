const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  // ALWAYS fallback to index.html for GET requests that accept HTML
  // This ensures SPA routing works even if NODE_ENV is misconfigured in Docker
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          next();
        }
      });
    } else {
      next();
    }
  });`;

const replacementStr = `  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched fallback to simple app.get("*")');
} else {
  console.log('Target string not found');
}
