const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');
content = content.replace(/^\[\\s\*\[\-\+\]\?\\d\*\\.\?\\d\+\$/g, '^\\s*[-+]?\\d*\\.?\\d+$');
content = content.replace("content.match(/^[\s*[-+]?\d*\.?\d+$/)", "content.match(/^\\s*[-+]?\\d*\\.?\\d+$/)");
content = content.replace("content.match(/^[\\s*[-+]?\\d*\\.?\\d+$/)", "content.match(/^\\s*[-+]?\\d*\\.?\\d+$/)");
fs.writeFileSync('src/server.ts', content);
