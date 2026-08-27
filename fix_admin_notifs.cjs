const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Fix DOCUMENT_EXPIRED
code = code.replace(
  /for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`Staff Document Expired`,\s*adminMsg,\s*`\/compliance`,\s*\);\s+\}\s+\}/g,
  `const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRED", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRED",
                \`Staff Document Expired\`,
                adminMsg,
                \`/compliance\`,
              );
            }`
);

// Fix DOCUMENT_EXPIRING_SOON
code = code.replace(
  /for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`Staff Document Expiring Soon`,\s*adminMsg,\s*`\/compliance`,\s*\);\s+\}\s+\}/g,
  `const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRING_SOON", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRING_SOON",
                \`Staff Document Expiring Soon\`,
                adminMsg,
                \`/compliance\`,
              );
            }`
);

fs.writeFileSync('src/server.ts', code);
