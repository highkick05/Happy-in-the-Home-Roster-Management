const fs = require('fs');

const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

const quoteDeleteLogic = `
  const handleQuote = (msg: ChatMessage) => {
    const quotedContent = msg.content ? \`> \${msg.first_name}: \${msg.content}\\n\\n\` : \`> \${msg.first_name}: [\${msg.file_name || 'Attachment'}]\\n\\n\`;
    setNewMessage(prev => quotedContent + prev);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(\`/api/chat/messages/\${msgId}\`, {
        method: 'DELETE',
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      if (!res.ok) {
        alert("Failed to delete message. You may not have permission.");
      }
    } catch (err) {
      console.error(err);
    }
  };
`;

if (!content.includes('handleQuote')) {
  const target = `  const handleAddReaction`;
  content = content.replace(target, quoteDeleteLogic + '\n' + target);
}

const socketListenerDelete = `
      newSocket.on('chat_message_deleted', (data: {id: number}) => {
        setMessages(prev => prev.filter(m => m.id !== data.id));
      });
`;

if (!content.includes('chat_message_deleted')) {
  const target = `      newSocket.on('chat_cleared', (sysMsg) => {`;
  content = content.replace(target, socketListenerDelete + '\n' + target);
}

fs.writeFileSync(path, content);
console.log('Added logic');
