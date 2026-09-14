const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

const oldStr = `                  stmt.run(
                    \`\${data.invoiceNum}.pdf\`,
                    systemName,
                    stats.size,
                    req.user.id,
                    folderPath,
                  );`;
const newStr = `                  stmt.run(
                    \`\${data.invoiceNum}.pdf\`,
                    rawSystemName,
                    stats.size,
                    req.user.id,
                    folderPath,
                  );`;

srvContent = srvContent.replace(oldStr, newStr);

const deleteOldStr = `          for (const fileRecord of fileRecords) {
            const sysFilePath = path.join(
              process.cwd(),
              "data",
              "uploads",
              fileRecord.system_name,
            );
            if (fs.existsSync(sysFilePath)) {
              fs.unlinkSync(sysFilePath);
            }`;
const deleteNewStr = `          for (const fileRecord of fileRecords) {
            const sysFilePath = path.join(
              process.cwd(),
              "uploads",
              (fileRecord.folder_path || '/').replace(/^\\/+/, ''),
              fileRecord.system_name,
            );
            if (fs.existsSync(sysFilePath)) {
              fs.unlinkSync(sysFilePath);
            }`;

srvContent = srvContent.replace(deleteOldStr, deleteNewStr);

fs.writeFileSync('src/server.ts', srvContent);
console.log("Fixed invoice pdf logic");
