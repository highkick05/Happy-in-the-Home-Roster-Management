const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

code = code.replace(/text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/g, 'text-[#E6EDF3] focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal');

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
console.log('Patched');
