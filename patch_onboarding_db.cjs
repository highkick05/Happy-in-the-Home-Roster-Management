const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// Update create table statement
content = content.replace(
    'requires_expiry INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    'requires_expiry INTEGER DEFAULT 0,\n        upload_required INTEGER DEFAULT 1,\n        is_mandatory INTEGER DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
);

// Add missing columns check in server boot
const alterTableStr = `
      try {
        const tableInfo = db.prepare("PRAGMA table_info(onboarding_hub_steps)").all();
        if (!tableInfo.some(c => c.name === 'upload_required')) {
          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN upload_required INTEGER DEFAULT 1;");
          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN is_mandatory INTEGER DEFAULT 1;");
          console.log("[DEBUG] Added upload_required and is_mandatory to onboarding_hub_steps.");
        }
      } catch (e) { console.error(e); }
`;

content = content.replace(
  'console.log("[DEBUG] Completed funding_type backfill synchronization.");',
  'console.log("[DEBUG] Completed funding_type backfill synchronization.");\n' + alterTableStr
);


// Update POST endpoint
content = content.replace(
    'const { position_id, title, description, media_url, requires_expiry } = req.body;',
    'const { position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory } = req.body;'
);
content = content.replace(
    'const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry) VALUES (?, ?, ?, ?, ?)");\n      const info = stmt.run(position_id, title, description || \'\', media_url || \'\', requires_expiry ? 1 : 0);',
    'const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry, upload_required, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?)");\n      const info = stmt.run(position_id, title, description || \'\', media_url || \'\', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0);'
);

// Update PUT endpoint
content = content.replace(
    'const { title, description, media_url, requires_expiry } = req.body;',
    'const { title, description, media_url, requires_expiry, upload_required, is_mandatory } = req.body;'
);
content = content.replace(
    'const stmt = db.prepare("UPDATE onboarding_hub_steps SET title = ?, description = ?, media_url = ?, requires_expiry = ? WHERE id = ?");\n      stmt.run(title, description || \'\', media_url || \'\', requires_expiry ? 1 : 0, req.params.id);',
    'const stmt = db.prepare("UPDATE onboarding_hub_steps SET title = ?, description = ?, media_url = ?, requires_expiry = ?, upload_required = ?, is_mandatory = ? WHERE id = ?");\n      stmt.run(title, description || \'\', media_url || \'\', requires_expiry ? 1 : 0, upload_required !== false ? 1 : 0, is_mandatory !== false ? 1 : 0, req.params.id);'
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched server.ts');
