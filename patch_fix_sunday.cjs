const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const mondayStart = new Date\(monday\);\s+mondayStart\.setHours\(0,0,0,0\);\s+const sundayEnd = new Date\(monday\);\s+sundayEnd\.setDate\(sundayEnd\.getDate\(\) \+ 6\);\s+sundayEnd\.setHours\(23,59,59,999\);/m;

const replacementStr = `const mondayStart = new Date(monday);
        mondayStart.setHours(0,0,0,0);`;

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched duplicate sundayEnd!');
} else {
    console.log('Regex did not match!');
}
