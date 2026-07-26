const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /if \(shift\.title\) \{\s*namesText = shift\.title; \/\/ Fallback for things like Respite\s*\}/m;

if (regex.test(code)) {
    code = code.replace(regex, `if (shift.title && (shift.isRespiteWrapper || shift.title.includes('Respite') || shift.title.includes('STA'))) {
                   namesText = shift.title;
                }`);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched the first namesText!');
} else {
    console.log('Regex did not match!');
}
