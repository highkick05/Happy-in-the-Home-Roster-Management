const fs = require('fs');
const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `      );
    \`);
      CREATE TABLE IF NOT EXISTS client_template_settings (`;

const fixed = `      );
      CREATE TABLE IF NOT EXISTS client_template_settings (`;

content = content.replace(target, fixed);
fs.writeFileSync(path, content);
