const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `          const filePath = path.join(targetDir, rawSystemName);
          
          const doc = new PDFDocument({ margin: 50 });`;

const replacementStr = `          const filePath = path.join(targetDir, rawSystemName);
          
          // Skip if the physical PDF already exists!
          if (fs.existsSync(filePath)) {
              // Ensure we still clean up any DB ghosts with double paths
              db.prepare("DELETE FROM files WHERE original_name = ? AND folder_path = ? AND system_name LIKE '%Clients/%'").run(\`\${data.invoiceNum}.pdf\`, folderPath);
              continue;
          }
          
          const doc = new PDFDocument({ margin: 50 });`;

srvContent = srvContent.replace(targetStr, replacementStr);
fs.writeFileSync('src/server.ts', srvContent);
console.log("Updated regeneration logic to skip existing");
