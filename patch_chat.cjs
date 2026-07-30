const fs = require('fs');
let content = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf-8');

// 1. Replace the state
content = content.replace(
  "const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);",
  "const [reactionPicker, setReactionPicker] = useState<{msgId: number, position: 'up' | 'down'} | null>(null);"
);

// 2. Remove the old click outside logic for reactionPickerRef since we use a fixed inset-0 div now!
// It was:
/*
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setReactionPickerMessageId(null);
      }
*/
content = content.replace(
  /      if \(reactionPickerRef\.current && !reactionPickerRef\.current\.contains\(event\.target as Node\)\) \{\n        setReactionPickerMessageId\(null\);\n      \}\n/,
  ""
);

// 3. Replace the hover condition
content = content.replace(
  "{(hoveredMessageId === msg.id || reactionPickerMessageId === msg.id) && (",
  "{(hoveredMessageId === msg.id || reactionPicker?.msgId === msg.id) && ("
);

// 4. Replace the reaction bar layout (add after: bridge and left-0/right-0)
content = content.replace(
  "<div className={`absolute -top-10 right-0 bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60]`}>",
  "<div className={`absolute -top-10 ${isOwnMessage ? 'right-0' : 'left-0'} bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60] after:content-[''] after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-4`}>"
);

// 5. Replace the MoreHorizontal button and the Picker popup
const targetPopup = `<button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(null); }} />
                                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] shadow-2xl" onClick={e => e.stopPropagation()}>
                                  <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPickerMessageId(null); }} theme="dark" />
                                </div>
                              </>
                            )}`;

const replacementPopup = `<button onClick={(e) => { 
                              e.stopPropagation(); 
                              if (reactionPicker?.msgId === msg.id) {
                                setReactionPicker(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position = rect.top > window.innerHeight / 2 ? 'up' : 'down';
                                setReactionPicker({ msgId: msg.id, position });
                              }
                            }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPicker?.msgId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setReactionPicker(null); }} />
                                <div className={\`absolute z-[100] shadow-2xl \${reactionPicker.position === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} \${isOwnMessage ? 'right-0' : 'left-0'}\`} onClick={e => e.stopPropagation()}>
                                  <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPicker(null); }} theme="dark" />
                                </div>
                              </>
                            )}`;

content = content.replace(targetPopup, replacementPopup);

fs.writeFileSync('src/components/Chat/ChatView.tsx', content);
