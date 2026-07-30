const fs = require('fs');
const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/      \);\n    \`\);\n      CREATE TABLE IF NOT EXISTS client_template_settings/g, '      );\n      CREATE TABLE IF NOT EXISTS client_template_settings');

fs.writeFileSync(path, content);
