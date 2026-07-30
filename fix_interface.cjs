const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');
content = content.replace("reactions?: string;", "reactions?: string;\n  is_edited?: number;");
fs.writeFileSync(path, content);
