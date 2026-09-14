const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(/SELECT c_fn, c_ln FROM clients/g, 'SELECT first_name, last_name FROM clients');
content = content.replace(/\$\{client\.c_fn\} \$\{client\.c_ln\}/g, '${client.first_name} ${client.last_name}');

fs.writeFileSync('src/server.ts', content);
console.log("Fixed API!");
