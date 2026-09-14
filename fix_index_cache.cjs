const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });`;
const replacement = `    app.get("*", (req: any, res: any) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, "index.html"));
    });`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched wildcard route!");
} else {
    console.log("Could not find wildcard route!");
}
