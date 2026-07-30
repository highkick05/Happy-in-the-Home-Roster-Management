const fs = require('fs');
let content = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf-8');

const target = `                            {reactionPickerMessageId === msg.id && (
                              <div className={\`absolute top-8 \${isOwnMessage ? 'right-0' : 'left-0'} z-[100] shadow-xl\`} onClick={e => e.stopPropagation()}>
                                <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPickerMessageId(null); }} theme="dark" />
                              </div>
                            )}`;

const replacement = `                            {reactionPickerMessageId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(null); }} />
                                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] shadow-2xl" onClick={e => e.stopPropagation()}>
                                  <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPickerMessageId(null); }} theme="dark" />
                                </div>
                              </>
                            )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Chat/ChatView.tsx', content);
