const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `const systemName = path.posix.join(subfolder, newFileName);`;
const replaceStr = `const systemName = newFileName; // Fix: do not prepend subfolder to system_name`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('src/server.ts', content);
    console.log("Fixed historical upload bug");
} else {
    console.log("Could not find target string");
}
