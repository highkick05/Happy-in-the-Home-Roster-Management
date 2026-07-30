const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Use regex to add replace={true} to all NavLink components
content = content.replace(/<NavLink\s+to="([^"]+)"/g, '<NavLink replace={true} to="$1"');

fs.writeFileSync(path, content);
console.log('Fixed NavLink replace');
