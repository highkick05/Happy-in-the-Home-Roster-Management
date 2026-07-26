const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

code = code.replace(/<Send className="w-5 h-5" \/>/, '<Send className="w-4 h-4 mr-2" /> Send');

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
console.log('Patched');
