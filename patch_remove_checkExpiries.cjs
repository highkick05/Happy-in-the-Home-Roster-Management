const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const startIdx = content.indexOf('  const checkExpiries = () => {');
const endIdx = content.indexOf('setTimeout(() => {\n      checkExpiries();\n  }, 5000);', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    const fullEndIdx = endIdx + 'setTimeout(() => {\n      checkExpiries();\n  }, 5000);'.length;
    content = content.substring(0, startIdx) + content.substring(fullEndIdx);
    fs.writeFileSync('src/server.ts', content, 'utf8');
    console.log("Removed old checkExpiries()");
} else {
    console.log("Could not find checkExpiries()");
}
