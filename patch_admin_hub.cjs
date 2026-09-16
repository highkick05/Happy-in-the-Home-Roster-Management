const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const \{ position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory \} = req\.body;\s*const stmt = db\.prepare\("INSERT INTO onboarding_hub_steps \(position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)"\);\s*const info = stmt\.run\(position_id, title, description \|\| '', media_url \|\| '', requires_expiry \? 1 : 0, upload_required !== false \? 1 : 0, is_mandatory !== false \? 1 : 0\);/;

const replacement = `const { position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years } = req.body;
      const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory, expiry_years) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const info = stmt.run(position_id, title, description || '', media_url || '', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, expiry_years || 1);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/server.ts', content);
