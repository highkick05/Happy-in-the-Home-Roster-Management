const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

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
                    <div key={lineIndex} className="pl-3 py-1 mb-1 border-l-[3px] border-brand-teal/50 bg-black/10 text-zinc-300 italic text-[11px] rounded-r-md overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                      {isImageQuote ? (
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{quoteContent.split('http')[0]}</span>
                          <img src={'http' + quoteContent.split('http').slice(1).join('http').trim()} alt="quoted gif" className="h-8 rounded object-cover" />
                        </div>
                      ) : (
                        quoteContent
                      )}
                    </div>
                  );
                }`;

// Actually, wait. We changed handleQuote to do `[GIF/Image]`. If we want the actual GIF in the quote, we should revert handleQuote so it includes the URL again!
