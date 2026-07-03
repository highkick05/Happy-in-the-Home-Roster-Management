const fs = require('fs');
let code = fs.readFileSync('migrate_files.ts', 'utf8');

code = code.replace(/file\.folder_path/g, '(file as any).folder_path')
           .replace(/file\.system_name/g, '(file as any).system_name')
           .replace(/file\.id/g, '(file as any).id');
fs.writeFileSync('migrate_files.ts', code);
