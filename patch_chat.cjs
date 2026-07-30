const fs = require('fs');
const path = 'src/components/Chat/ChatView.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add lucide icons if not already there
if (!content.includes('Edit2')) {
  content = content.replace(
    "import { Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon, Smile, Sticker, MoreHorizontal, Camera } from 'lucide-react';",
    "import { Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon, Smile, Sticker, MoreHorizontal, Camera, Edit2, Quote, Trash2 } from 'lucide-react';"
  );
}

// 2. State updates
if (content.includes('const [showActionsMessageId')) {
  content = content.replace(
    "const [showActionsMessageId, setShowActionsMessageId] = useState<number | null>(null);\n  const [reactionDetails, setReactionDetails] = useState<{msgId: number, emoji: string, userIds: number[]} | null>(null);\n  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);",
    "const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);\n  const [reactionDetails, setReactionDetails] = useState<{msgId: number, emoji: string, userIds: number[]} | null>(null);\n  const [inlineEditMessageId, setInlineEditMessageId] = useState<number | null>(null);\n  const [inlineEditContent, setInlineEditContent] = useState('');"
  );
}

// 3. Remove handlePointerDown and cancelLongPress
content = content.replace(
  /const handlePointerDown = [\s\S]*?const cancelLongPress = [\s\S]*?};/,
  ""
);

// 4. Update click outside
content = content.replace(
  "setShowActionsMessageId(null);",
  ""
);

// 5. Add handleSaveEdit function
if (!content.includes('handleSaveEdit =')) {
  const handleSaveEditFn = `  const handleSaveEdit = async (msgId: number) => {
    if (!inlineEditContent.trim()) return;
    try {
      const res = await fetch(\`/api/chat/messages/\${msgId}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ content: inlineEditContent.trim() })
      });
      if (res.ok) {
        setInlineEditMessageId(null);
        setInlineEditContent('');
      }
    } catch (e) {
      console.error(e);
    }
  };
`;
  content = content.replace("  const handleDeleteMessage", handleSaveEditFn + "\n  const handleDeleteMessage");
}

// 6. Replace bubble event handlers (using string split/replace safely)
let lines = content.split('\\n');
let newLines = [];
let i = 0;
while (i < lines.length) {
  let line = lines[i];
  if (line.includes('onPointerDown={() => handlePointerDown(msg.id)}')) {
    newLines.push('                        onMouseEnter={() => setHoveredMessageId(msg.id)}');
    newLines.push('                        onMouseLeave={() => setHoveredMessageId(null)}');
    i += 4; // skip onPointerDown, onPointerUp, onPointerLeave, onContextMenu
    continue;
  }
  newLines.push(line);
  i++;
}
content = newLines.join('\\n');

// 7. Update inline editing and reaction bar
const targetRenderRegex = /\{\(showActionsMessageId === msg\.id \|\| reactionPickerMessageId === msg\.id\) && \([\s\S]*?\)\n\s*\}/;

const replacementRender = `{(hoveredMessageId === msg.id || reactionPickerMessageId === msg.id) && (
                        <div className={\`absolute -top-9 right-0 bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60]\`}>
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

content = content.replace(targetRenderRegex, replacementRender);

// Also need to inject inline edit UI
// We find: <span>{contentToRender}</span>
// and replace with our logic
const contentToRenderRegex = /<span>\{contentToRender\}<\/span>/;
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
content = content.replace(contentToRenderRegex, inlineEditJSX);

fs.writeFileSync(path, content);
