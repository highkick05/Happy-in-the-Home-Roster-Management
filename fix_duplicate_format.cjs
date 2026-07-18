const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /const formatRouteLog = \([\s\S]*?\} catch \(e\) \{\n      return logStr;\n    \}\n  \};/;
const matches = code.match(regex);
if (matches) {
    const firstIdx = code.indexOf(matches[0]);
    if (firstIdx !== -1) {
        code = code.substring(0, firstIdx) + code.substring(firstIdx + matches[0].length);
        console.log("Removed first occurrence!");
    }
}
fs.writeFileSync(file, code);
