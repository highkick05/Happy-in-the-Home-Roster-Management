const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

code = code.replace("\\`\\${window.location.origin}\\${msg.avatar_url}\\`", "`\${window.location.origin}\${msg.avatar_url}`");

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
console.log('Fixed');
