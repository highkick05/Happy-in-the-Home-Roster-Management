const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `app.use(express.static(distPath));`;
const newStr = `app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('sw.js') || path.includes('workbox-') || path.endsWith('custom-sw.js') || path.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, newStr);
    fs.writeFileSync('src/server.ts', content);
    console.log("Fixed caching!");
} else {
    console.log("Could not find target string");
}
