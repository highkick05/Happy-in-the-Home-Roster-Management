const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

const targetQuote = `  const handleQuote = (msg: ChatMessage) => {
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
    
    const quotedContent = \`> \${msg.first_name}: \${contentToQuote}\\n\\n\`;`;

const replacementQuote = `  const handleQuote = (msg: ChatMessage) => {
    let contentToQuote = msg.content || '';
    
    if (!contentToQuote && msg.file_url) {
      contentToQuote = \`[\${msg.file_name || 'Attachment'}]\`;
    } else {
      // Remove previous quotes from the content
      contentToQuote = contentToQuote.split('\\n').filter(line => !line.startsWith('> ')).join(' ').trim();
      if (!contentToQuote) contentToQuote = '[Attachment]';
    }
    
    const quotedContent = \`> \${msg.first_name}: \${contentToQuote}\\n\\n\`;`;

content = content.replace(targetQuote, replacementQuote);

const targetQuoteRender = `                if (line.startsWith('> ')) {
                  return (
                    <div key={lineIndex} className="pl-3 py-1 mb-1 border-l-[3px] border-brand-teal/50 bg-black/10 text-zinc-300 italic text-[11px] rounded-r-md overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                      {line.substring(2)}
                    </div>
                  );
                }`;

const replacementQuoteRender = `                if (line.startsWith('> ')) {
                  const quoteContent = line.substring(2);
                  const isImageQuote = quoteContent.match(/http.*(giphy\\.com|\\.(gif|jpe?g|png))/i);
                  
                  return (
                    <div key={lineIndex} className="pl-3 py-1 mb-1 border-l-[3px] border-brand-teal/50 bg-black/10 text-zinc-300 italic text-[11px] rounded-r-md overflow-hidden whitespace-nowrap max-w-full flex items-center">
                      {isImageQuote ? (
                        <div className="flex items-center space-x-2 w-full">
                          <span className="truncate flex-shrink-0">{quoteContent.split('http')[0]}</span>
                          <img src={'http' + quoteContent.split('http').slice(1).join('http').trim()} alt="quoted gif" className="h-6 rounded object-cover" />
                        </div>
                      ) : (
                        <span className="truncate">{quoteContent}</span>
                      )}
                    </div>
                  );
                }`;

content = content.replace(targetQuoteRender, replacementQuoteRender);

fs.writeFileSync(path, content);
console.log('Fixed quotes and quote rendering');
