const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /\/\/ Color mapping like frontend\s*let bgColor = '#0ea5e9'; \/\/ brand-blue/g;

const replacementStr = `// Color mapping like frontend
                let bgColor = '#0ea5e9'; // PUBLISHED
                if (shift.status === 'DRAFT') bgColor = '#52525b';
                if (shift.status === 'COMPLETED') bgColor = '#a3e635';
                if (shift.status === 'IN_PROGRESS') bgColor = '#38bdf8';
                if (shift.status === 'PENDING_SYNC') bgColor = '#f59e0b';
                if (shift.status === 'CANCELLED') bgColor = '#ef4444';
                if (shift.isRespiteWrapper) bgColor = '#8b5cf6';`;

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched PDF colors in server.ts!');
} else {
    console.log('Regex did not match!');
}
