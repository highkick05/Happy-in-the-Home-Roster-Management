const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/typeof err !== 'undefined' \? \{ err: String\(err\), stack: err\?\.stack \} : \{\}/g, '{}');
code = code.replace(/typeof e !== 'undefined' \? \{ err: String\(e\), stack: e\?\.stack \} : \{\}/g, '{}');
fs.writeFileSync('server.ts', code);
