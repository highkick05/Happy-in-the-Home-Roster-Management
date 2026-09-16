const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

// The POST endpoint
serverContent = serverContent.replace(
  /const \{ position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory \} = req\.body;\s*const stmt = db\.prepare\("INSERT INTO onboarding_hub_steps \(position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory\) VALUES \(\?, \?, \?, \?, \?, \?, \?\)"\);\s*const info = stmt\.run\(position_id, title, description \|\| '', media_url \|\| '', requires_expiry \? 1 : 0, upload_required !== false \? 1 : 0, is_mandatory !== false \? 1 : 0\);/,
  `const { position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years } = req.body;
      const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const info = stmt.run(position_id, title, description || '', media_url || '', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, expiry_years || 1);`
);

// The PUT endpoint
serverContent = serverContent.replace(
  /const \{ title, description, media_url, requires_expiry, upload_required, is_mandatory \} = req\.body;\s*const stmt = db\.prepare\("UPDATE onboarding_hub_steps SET title = \?, description = \?, media_url = \?, requires_expiry = \?, upload_required = \?, is_mandatory = \? WHERE id = \?"\);\s*stmt\.run\(title, description \|\| '', media_url \|\| '', requires_expiry \? 1 : 0, upload_required !== false \? 1 : 0, is_mandatory !== false \? 1 : 0, req\.params\.id\);/,
  `const { title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years } = req.body;
      const stmt = db.prepare("UPDATE onboarding_hub_steps SET title = ?, description = ?, media_url = ?, requires_expiry = ?, upload_required = ?, is_mandatory = ?, expiry_years = ? WHERE id = ?");
      stmt.run(title, description || '', media_url || '', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, expiry_years || 1, req.params.id);`
);

fs.writeFileSync('src/server.ts', serverContent);
