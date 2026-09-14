const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

srvContent = srvContent.replace(
    'const nameDir = `${user.first_name}_${user.last_name}`;',
    'const nameDir = [user.first_name, user.last_name].filter(Boolean).join(" ");'
);

fs.writeFileSync('src/server.ts', srvContent);
console.log("Fixed space in server.ts folder path");
