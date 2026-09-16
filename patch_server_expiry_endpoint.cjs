const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

// The POST endpoint
serverContent = serverContent.replace(
  "INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?)",
  "INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);

serverContent = serverContent.replace(
  "requires_expiry || 0, upload_required === undefined ? 1 : upload_required, is_mandatory === undefined ? 1 : is_mandatory",
  "requires_expiry || 0, upload_required === undefined ? 1 : upload_required, is_mandatory === undefined ? 1 : is_mandatory, req.body.expiry_years || 1"
);

// The PUT endpoint
serverContent = serverContent.replace(
  "requires_expiry = ?, upload_required = ?, is_mandatory = ? WHERE id = ?",
  "requires_expiry = ?, upload_required = ?, is_mandatory = ?, expiry_years = ? WHERE id = ?"
);

serverContent = serverContent.replace(
  "requires_expiry || 0, upload_required === undefined ? 1 : upload_required, is_mandatory === undefined ? 1 : is_mandatory, req.params.id",
  "requires_expiry || 0, upload_required === undefined ? 1 : upload_required, is_mandatory === undefined ? 1 : is_mandatory, req.body.expiry_years || 1, req.params.id"
);

fs.writeFileSync('src/server.ts', serverContent);
