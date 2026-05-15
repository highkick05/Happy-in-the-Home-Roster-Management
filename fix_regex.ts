import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/data:image\/w\+;base64,/g, "data:image\/\\\\w+;base64,");

fs.writeFileSync('server.ts', content);
