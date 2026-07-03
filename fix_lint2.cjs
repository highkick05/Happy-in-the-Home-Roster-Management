const fs = require('fs');

// Fix SettingsView
let settingsCode = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');
settingsCode = settingsCode.replace(/\{ name: '', isMaster: false, effectiveDate: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\] \}/g, "{ name: '', isMaster: false, effectiveDate: new Date().toISOString().split('T')[0], createdDate: new Date().toISOString() }");
fs.writeFileSync('src/components/Settings/SettingsView.tsx', settingsCode);

// Fix migrate_files.ts
try {
  let migrateCode = fs.readFileSync('migrate_files.ts', 'utf8');
  migrateCode = migrateCode.replace(/row\.folder_path/g, '(row as any).folder_path')
                           .replace(/row\.system_name/g, '(row as any).system_name')
                           .replace(/row\.id/g, '(row as any).id');
  fs.writeFileSync('migrate_files.ts', migrateCode);
} catch (e) {}

