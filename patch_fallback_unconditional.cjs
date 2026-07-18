const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  // Universal fallback for SPA routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error(\`[SPA Fallback Error] Failed to serve index.html from \${distPath}: \`, err.message);
          next();
        }
      });
    } else {
      next();
    }
  });`;

const replacementStr = `  // Universal fallback for SPA routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error(\`[SPA Fallback Error] Failed to serve index.html from \${distPath}: \`, err.message);
          next();
        }
      });
    } else {
      next();
    }
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched fallback to be unconditional');
} else {
  console.log('Target string not found');
}
