const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  '<div ref={messagesEndRef} />',
  '<div ref={messagesEndRef} className="h-6" />'
);

fs.writeFileSync(path, content);
console.log('Fixed bottom padding');
