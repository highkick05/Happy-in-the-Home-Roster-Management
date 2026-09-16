const fs = require('fs');
let serverContent = fs.readFileSync('src/server.ts', 'utf8');

// Add column in CREATE TABLE
serverContent = serverContent.replace(
  'is_mandatory INTEGER DEFAULT 1,',
  'is_mandatory INTEGER DEFAULT 1,\n        expiry_years INTEGER DEFAULT 1,'
);

// Add migration
const migrationStr = `
      try {
        const tableInfo = db.prepare("PRAGMA table_info(onboarding_hub_steps)").all();
        if (!tableInfo.some(c => c.name === 'expiry_years')) {
          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1;");
          console.log("[DEBUG] Added expiry_years to onboarding_hub_steps.");
        }
      } catch (e) { console.error(e); }
`;
serverContent = serverContent.replace(
  '      try {\n        const tableInfo = db.prepare("PRAGMA table_info(onboarding_hub_steps)").all();\n        if (!tableInfo.some((c: any) => c.name === \'upload_required\')) {\n          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN upload_required INTEGER DEFAULT 1;");\n          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN is_mandatory INTEGER DEFAULT 1;");\n          console.log("[DEBUG] Added upload_required and is_mandatory to onboarding_hub_steps.");\n        }\n      } catch (e) { console.error(e); }',
  '      try {\n        const tableInfo = db.prepare("PRAGMA table_info(onboarding_hub_steps)").all();\n        if (!tableInfo.some((c: any) => c.name === \'upload_required\')) {\n          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN upload_required INTEGER DEFAULT 1;");\n          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN is_mandatory INTEGER DEFAULT 1;");\n          console.log("[DEBUG] Added upload_required and is_mandatory to onboarding_hub_steps.");\n        }\n      } catch (e) { console.error(e); }' + migrationStr
);
// Using regex to match more safely:
serverContent = serverContent.replace(
  /(\s*try \{\s*const tableInfo = db\.prepare\("PRAGMA table_info\(onboarding_hub_steps\)"\)\.all\(\);\s*if \(\!tableInfo\.some\(\(c.*?\) => c\.name === 'upload_required'\)\) \{[\s\S]*?console\.log\("\[DEBUG\] Added upload_required.*?"\);\s*\}\s*\} catch \(e\) \{ console\.error\(e\); \})/,
  `$1\n      try {\n        const tableInfo = db.prepare("PRAGMA table_info(onboarding_hub_steps)").all();\n        if (!tableInfo.some((c: any) => c.name === 'expiry_years')) {\n          db.exec("ALTER TABLE onboarding_hub_steps ADD COLUMN expiry_years INTEGER DEFAULT 1;");\n          console.log("[DEBUG] Added expiry_years to onboarding_hub_steps.");\n        }\n      } catch (e) { console.error(e); }`
);

fs.writeFileSync('src/server.ts', serverContent);
