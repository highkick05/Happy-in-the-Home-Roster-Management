const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Target the outer div
const outerTarget = `
                    <div 
                      className={\`flex flex-col min-w-0 \${!msg.file_url ? 'w-full max-w-full' : 'max-w-full'} \${isOwnMessage ? 'items-end' : 'items-start'} relative\`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      onClick={() => setHoveredMessageId(prev => prev === msg.id ? null : msg.id)}
                    >
`;

const outerReplacement = `
                    <div 
                      className={\`flex flex-col min-w-0 \${!msg.file_url ? 'max-w-full' : 'max-w-full'} \${isOwnMessage ? 'items-end' : 'items-start'} relative\`}
                    >
`;

if (content.includes('setHoveredMessageId')) {
  content = content.replace(outerTarget, outerReplacement);
}

// Target the inner div
const innerTarget = `
                      <div 
                        className={\`rounded-lg font-semibold tracking-wide break-words max-w-full \${
`;

const innerReplacement = `
                      <div 
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        onClick={() => setHoveredMessageId(prev => prev === msg.id ? null : msg.id)}
                        className={\`rounded-lg font-semibold tracking-wide break-words max-w-full cursor-default \${
`;
content = content.replace(innerTarget, innerReplacement);

// Now for the icons
const menuTarget = `
                          <div className="relative" ref={reactionPickerRef}>
                            <button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
`;

const menuReplacement = `
                          <button onClick={(e) => { e.stopPropagation(); handleQuote(msg); }} className="hover:scale-125 transition-transform text-zinc-400 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Quote">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path></svg>
                          </button>
                          {(isOwnMessage || user?.role === 'ADMIN') && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="hover:scale-125 transition-transform text-red-400 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Delete">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          )}
                          <div className="relative" ref={reactionPickerRef}>
                            <button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
`;

content = content.replace(menuTarget, menuReplacement);

fs.writeFileSync(path, content);
console.log('Fixed chat hover and added quote/delete icons');
