const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

const regex = /if \(files\.length === 0\) \{\s*compliance\[key\] = \{ label: step\.title, status: "MISSING", expiry: null, issued: null, fileName: null, fileId: null \};\s*continue;\s*\}/;

const replacement = `if (step.upload_required === 0) {
            if (stepData.status === 'completed') {
               compliance[key] = { label: step.title, status: "VALID", expiry: null, issued: null, fileName: "Confirmation Completed", fileId: null, isConfirmation: true };
            } else {
               compliance[key] = { label: step.title, status: "MISSING", expiry: null, issued: null, fileName: null, fileId: null, isConfirmation: true };
            }
            continue;
          }
          if (files.length === 0) {
            compliance[key] = { label: step.title, status: "MISSING", expiry: null, issued: null, fileName: null, fileId: null };
            continue;
          }`;

serverContent = serverContent.replace(regex, replacement);
fs.writeFileSync('src/server.ts', serverContent);
