const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

const targetQuote = `  const handleQuote = (msg: ChatMessage) => {
    const quotedContent = msg.content ? \`> \${msg.first_name}: \${msg.content.replace(/\\n/g, ' ')}\\n\\n\` : \`> \${msg.first_name}: [\${msg.file_name || 'Attachment'}]\\n\\n\`;
    setNewMessage(prev => quotedContent + prev);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.value = quotedContent + newMessage; // force update value for height calc
      textareaRef.current.style.height = \`\${Math.min(textareaRef.current.scrollHeight, 240)}px\`;
      textareaRef.current.focus();
      // Move cursor to the end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  };`;

const replacementQuote = `  const handleQuote = (msg: ChatMessage) => {
    let contentToQuote = msg.content || '';
    if (contentToQuote.match(/http.*(giphy\\.com|\\.(gif|jpe?g|png))/i)) {
      contentToQuote = '[GIF/Image]';
    } else if (!contentToQuote && msg.file_url) {
      contentToQuote = \`[\${msg.file_name || 'Attachment'}]\`;
    } else {
      // Remove quotes from the content to quote (don't quote quotes)
      contentToQuote = contentToQuote.split('\\n').filter(line => !line.startsWith('> ')).join(' ').trim();
      if (!contentToQuote) contentToQuote = '[Attachment]';
    }
    
    const quotedContent = \`> \${msg.first_name}: \${contentToQuote}\\n\\n\`;
    
    setNewMessage(prev => {
      const updated = quotedContent + prev;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.value = updated;
          textareaRef.current.style.height = \`\${Math.min(textareaRef.current.scrollHeight, 240)}px\`;
          textareaRef.current.focus();
          const len = updated.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 0);
      return updated;
    });
  };`;

content = content.replace(targetQuote, replacementQuote);

const targetEmojiOnly = `              const isEmojiOnly = isOnlyEmojis(msg.content) && !msg.file_url;`;
const replacementEmojiOnly = `              const nonQuotedText = msg.content.split('\\n').filter(line => !line.startsWith('> ')).join('\\n').trim();
              const isEmojiOnly = isOnlyEmojis(nonQuotedText) && !msg.file_url && nonQuotedText.length > 0;`;

content = content.replace(targetEmojiOnly, replacementEmojiOnly);

fs.writeFileSync(path, content);
console.log('Fixed quotes');
