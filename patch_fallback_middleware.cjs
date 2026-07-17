const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });`;

const replacementStr = `  // Universal fallback for SPA routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) next();
      });
    } else {
      next();
    }
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched fallback to middleware');
} else {
  console.log('Target string not found');
}
