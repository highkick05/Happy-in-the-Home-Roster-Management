const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

const targetEmojiOnly = `              const nonQuotedText = msg.content.split('\\n').filter(line => !line.startsWith('> ')).join('\\n').trim();
              const isEmojiOnly = isOnlyEmojis(nonQuotedText) && !msg.file_url && nonQuotedText.length > 0;`;

const replacementEmojiOnly = `              const nonQuotedText = msg.content.split('\\n').filter(line => !line.startsWith('> ')).join('\\n').trim();
              const hasQuote = msg.content.includes('> ');
              const isEmojiOnly = isOnlyEmojis(nonQuotedText) && !msg.file_url && nonQuotedText.length > 0 && !hasQuote;`;

content = content.replace(targetEmojiOnly, replacementEmojiOnly);

fs.writeFileSync(path, content);
console.log('Fixed emoji only for quotes');
