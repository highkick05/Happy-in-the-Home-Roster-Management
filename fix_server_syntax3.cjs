const fs = require('fs');
const path = 'src/server.ts';
let content = fs.readFileSync(path, 'utf-8');

// The issue is there is an extra `db.exec(\`` and `\`);` wrapping push_subscriptions, 
// which is already inside a db.exec(\` block that ends much later.

content = content.replace(/    db\.exec\(\`\n      CREATE TABLE IF NOT EXISTS push_subscriptions/g, '      CREATE TABLE IF NOT EXISTS push_subscriptions');
content = content.replace(/      \);\n    \`\);\n      CREATE TABLE IF NOT EXISTS client_template_settings \(/g, '      );\n      CREATE TABLE IF NOT EXISTS client_template_settings (');

fs.writeFileSync(path, content);
console.log('Fixed syntax error manually');
