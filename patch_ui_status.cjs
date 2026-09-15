const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Restore the status opacity checks
content = content.replace(
    /className=\{\`hover:bg-brand-bg\/50 transition-colors cursor-pointer \`\}/g,
    'className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${s.status === \'SUSPENDED\' ? \'opacity-60\' : \'\'}`}'
);

content = content.replace(
    /className=\{\`hover:bg-brand-bg\/50 transition-colors cursor-pointer \`\}/g,
    'className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${c.status === \'SUSPENDED\' ? \'opacity-60\' : \'\'}`}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Restored UI status checks');
