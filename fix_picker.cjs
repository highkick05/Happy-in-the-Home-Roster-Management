const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

const targetPicker = `                            {reactionPickerMessageId === msg.id && (
                              <div className="absolute bottom-8 right-0 z-[100] shadow-xl" onClick={e => e.stopPropagation()}>`;

const replacementPicker = `                            {reactionPickerMessageId === msg.id && (
                              <div className={\`absolute bottom-8 \${isOwnMessage ? 'right-0' : 'left-0'} z-[100] shadow-xl\`} onClick={e => e.stopPropagation()}>`;

content = content.replace(targetPicker, replacementPicker);

fs.writeFileSync(path, content);
console.log('Fixed picker');
