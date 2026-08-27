const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Fix SHIFT_COMPLETED
code = code.replace(
  /for \(const admin of admins\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"SHIFT_COMPLETED",/g,
  `insertNotif.run(
              0,
              "SHIFT_COMPLETED",`
);

// We need to fix the closing brace for SHIFT_COMPLETED
code = code.replace(
  /"\/roster",\s*\);\s+\}/g,
  `"/roster",
            );`
);

// Fix INCIDENT_REPORT
code = code.replace(
  /for \(const admin of admins\) \{\s+const exists = db\.prepare\("SELECT id FROM notifications WHERE user_id = \? AND type = 'INCIDENT_REPORT' AND link = \?"\)\.get\(admin\.id,\s*`\/clients\/\$\{shift\.client_id\}\/progress-notes`\);\s+if \(!exists\) \{\s+insertNotification\.run\(\s*admin\.id,/g,
  `const exists = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND type = 'INCIDENT_REPORT' AND link = ?").get(0, \`/clients/\${shift.client_id}/progress-notes\`);
              if (!exists) {
                 insertNotification.run(
                   0,`
);

// Removing the two extra closing braces for INCIDENT_REPORT
code = code.replace(
  /                 \);\s+\}\s+\}/g,
  `                 );
              }`
);

// Fix DOCUMENT_EXPIRED
code = code.replace(
  /for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`Staff Document Expired`,\s*adminMsg,\s*`\/staff\/\$\{file\.staff_id\}`,\s*\);\s+\}\s+\}/g,
  `const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRED", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRED",
                \`Staff Document Expired\`,
                adminMsg,
                \`/staff/\${file.staff_id}\`,
              );
            }`
);

// Fix DOCUMENT_EXPIRING_SOON
code = code.replace(
  /for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`Staff Document Expiring Soon`,\s*adminMsg,\s*`\/staff\/\$\{file\.staff_id\}`,\s*\);\s+\}\s+\}/g,
  `const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRING_SOON", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRING_SOON",
                \`Staff Document Expiring Soon\`,
                adminMsg,
                \`/staff/\${file.staff_id}\`,
              );
            }`
);

fs.writeFileSync('src/server.ts', code);
