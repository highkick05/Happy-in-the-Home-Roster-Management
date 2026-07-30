const fs = require('fs');

// Patch server.ts
let serverContent = fs.readFileSync('src/server.ts', 'utf-8');
serverContent = serverContent.replace(
  'io.emit("chat_message", updatedMsg); // this triggers update on client side if handled or we can add chat_message_edited',
  'io.emit("chat_message_edited", updatedMsg);'
);
fs.writeFileSync('src/server.ts', serverContent);

// Patch ChatView.tsx
let chatContent = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf-8');
const target = "newSocket.on('chat_cleared', () => {";
const editHandler = `
    newSocket.on('chat_message_edited', (msg: ChatMessage) => {
      setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
    });
`;
if (!chatContent.includes('chat_message_edited')) {
  chatContent = chatContent.replace(target, editHandler + "\n    " + target);
  fs.writeFileSync('src/components/Chat/ChatView.tsx', chatContent);
}

