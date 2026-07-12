const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

const regex = /\{\(!initialData\?\.id \|\| isHistorical\) && \(\s*<>\s*<button[\s\S]*?<\/button>\s*<\/div>\s*\{isHistorical && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}\s*<\/>\s*\)\}/;

if (regex.test(code)) {
    code = code.replace(regex, '');
} else {
    // try a more generic replacement
    const regex2 = /\{\(!initialData\?\.id \|\| isHistorical\) && \([\s\S]*?<\/>\s*\)\}/;
    if (regex2.test(code)) {
        code = code.replace(regex2, '');
    } else {
        console.log("No match found!");
    }
}
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);
