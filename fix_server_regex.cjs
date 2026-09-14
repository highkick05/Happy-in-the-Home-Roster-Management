const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

srvContent = srvContent.replace(
  "(fileRecord.folder_path || '/').replace(/^\\\\/+/, ''),",
  "(fileRecord.folder_path || '/').replace(/^\\/+/, ''),"
);

fs.writeFileSync('src/server.ts', srvContent);
console.log("Fixed regex backslash in server.ts");
