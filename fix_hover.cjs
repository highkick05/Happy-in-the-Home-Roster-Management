const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

// The string split approach for bubble
content = content.replace(
  /onContextMenu=\{\(e\) => \{ e\.preventDefault\(\); setShowActionsMessageId\(msg\.id\); \}\}/g,
  "onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)}"
);

// We need to replace the reaction bar block. Let's find it.
const reactionBarStart = "{(showActionsMessageId === msg.id || reactionPickerMessageId === msg.id) && (";
if (content.includes(reactionBarStart)) {
  const replacement = `{(hoveredMessageId === msg.id || reactionPickerMessageId === msg.id) && (
                        <div className={\`absolute -top-10 right-0 bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60]\`}>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '👍'); }} className="hover:scale-125 transition-transform text-base">👍</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '❤️'); }} className="hover:scale-125 transition-transform text-base">❤️</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😂'); }} className="hover:scale-125 transition-transform text-base">😂</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😮'); }} className="hover:scale-125 transition-transform text-base">😮</button>
                          
                          <div className="relative" ref={reactionPickerRef}>
                            <button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
                              <div className={\`absolute top-8 \${isOwnMessage ? 'right-0' : 'left-0'} z-[100] shadow-xl\`} onClick={e => e.stopPropagation()}>
                                <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPickerMessageId(null); }} theme="dark" />
                              </div>
                            )}
                          </div>
                          
                          <div className="w-[1px] h-4 bg-border-subtle mx-1" />
                          
                          {(isOwnMessage || user?.role === 'ADMIN') && (
                            <button onClick={(e) => { e.stopPropagation(); setInlineEditContent(msg.content); setInlineEditMessageId(msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Edit">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}

                          <button onClick={(e) => { e.stopPropagation(); handleQuote(msg); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Quote">
                            <Quote className="w-3 h-3" />
                          </button>
                          
                          {(isOwnMessage || user?.role === 'ADMIN') && (
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="hover:scale-125 transition-transform text-red-400 hover:text-red-300 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}`;
  // Using a regex to replace from start of reaction bar to the end of it
  // The easiest way is to split content and rebuild or just use a well-crafted regex.
  const regex = /\{\(showActionsMessageId === msg\.id \|\| reactionPickerMessageId === msg\.id\) && \([\s\S]*?\}\)\n\s*\}/g;
  const replaced = content.replace(regex, replacement);
  if (replaced !== content) {
    content = replaced;
  } else {
    console.log('Regex 1 failed, trying substring');
    // try to find the end of the block
    const startIndex = content.indexOf(reactionBarStart);
    let openBraces = 0;
    let foundEnd = false;
    let endIndex = startIndex;
    for(let i=startIndex; i<content.length; i++) {
        if(content[i] === '{') openBraces++;
        if(content[i] === '}') {
            openBraces--;
            if(openBraces === 0) {
                endIndex = i;
                foundEnd = true;
                break;
            }
        }
    }
    if (foundEnd) {
      content = content.substring(0, startIndex) + replacement + content.substring(endIndex + 1);
    }
  }
}

// Inline edit UI
if (!content.includes('inlineEditMessageId === msg.id')) {
  const contentToRenderString = "<span>{contentToRender}</span>";
  if (content.includes(contentToRenderString)) {
    const inlineEditJSX = `{inlineEditMessageId === msg.id ? (
                          <div className="flex flex-col space-y-2 mt-1 min-w-[200px]" onClick={e => e.stopPropagation()}>
                            <textarea 
                              className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-teal resize-none"
                              value={inlineEditContent}
                              onChange={e => setInlineEditContent(e.target.value)}
                              rows={3}
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => { setInlineEditMessageId(null); setInlineEditContent(''); }} className="px-3 py-1 bg-black/30 hover:bg-black/50 text-zinc-300 text-xs rounded transition-colors">Cancel</button>
                              <button onClick={() => handleSaveEdit(msg.id)} className="px-3 py-1 bg-brand-teal hover:bg-brand-teal/80 text-black font-medium text-xs rounded transition-colors">Save</button>
                            </div>
                          </div>
                        ) : (
                          <span>{contentToRender}</span>
                        )}
                        {msg.is_edited ? <span className="text-[9px] opacity-50 ml-2 italic">(edited)</span> : null}`;
    content = content.replace(contentToRenderString, inlineEditJSX);
  }
}

fs.writeFileSync(path, content);
