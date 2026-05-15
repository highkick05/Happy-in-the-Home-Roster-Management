import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// The incorrect regexes are:
// /^data:image/\\w+;base64,/
// they should be:
// /^data:image\\/\\w+;base64,/

content = content.replace(/\/\^data:image\/\\\\w\+;base64,\//g, '/^data:image\\\\/\\\\w+;base64,/');

fs.writeFileSync('server.ts', content);
