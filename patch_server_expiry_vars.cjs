const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

serverContent = serverContent.replace(
  'const { title, description, media_url, requires_expiry, upload_required, is_mandatory } = req.body;',
  'const { title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years } = req.body;'
);
serverContent = serverContent.replace(
  "stmt.run(title, description || '', media_url || '', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, req.params.id);",
  "stmt.run(title, description || '', media_url || '', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, expiry_years || 1, req.params.id);"
);

fs.writeFileSync('src/server.ts', serverContent);
