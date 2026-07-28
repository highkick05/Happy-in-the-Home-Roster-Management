import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon, Smile, Sticker, MoreHorizontal } from 'lucide-react';
// @ts-ignore
import data from '@emoji-mart/data';
// @ts-ignore
import Picker from '@emoji-mart/react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';




interface ChatMessage {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  file_url: string | null;
  file_name: string | null;
    file_type: string | null;
  reactions?: string;
}

export default function ChatView() {
  const { user, token, settings } = useAuth();

  const gf = React.useMemo(() => {
    const apiKey = settings?.giphyApiKey || '1DZoHBs8dDry795Nu0JqbYMYXuhcmrRo';
    return new GiphyFetch(apiKey);
  }, [settings?.giphyApiKey]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedGif, setSelectedGif] = useState<any>(null);
  const [gifSearch, setGifSearch] = useState('');
  const [debouncedGifSearch, setDebouncedGifSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGifSearch(gifSearch), 500);
    return () => clearTimeout(timer);
  }, [gifSearch]);
  const [attachment, setAttachment] = useState<globalThis.File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const giphyPickerRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (giphyPickerRef.current && !giphyPickerRef.current.contains(event.target as Node)) {
        setShowGiphyPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setReactionPickerMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.native);
  };

  const onGifClick = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
    setSelectedGif(gif);
    setShowGiphyPicker(false);
  };

  const fetchGifs = (offset: number) => debouncedGifSearch ? gf.search(debouncedGifSearch, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });
  const handleAddReaction = async (messageId: number, emoji: string) => {
    setHoveredMessageId(null);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: JSON.stringify(data.reactions) };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
      scrollToBottom();
    }
    if (socket && user) {
      socket.emit('typing', { userId: user.id, userName: `${user.first_name} ${user.last_name}` });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { userId: user.id, userName: `${user.first_name} ${user.last_name}` });
      }, 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };
  
  const isOnlyEmojis = (text: string) => {
    if (!text || text.trim().length === 0) return false;
    // Strip everything that is a known emoji, variation selector, skin tone, ZWJ, or whitespace
    const stripped = text.replace(/[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F\u200D\s\u200B-\u200D\uFEFF]/gu, '');
    // If nothing is left, it's only emojis
    return stripped.length === 0;
  };

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedGif || attachment) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedGif, attachment]);

  useEffect(() => {
    const fetchMessages = () => {
      fetch('/api/chat/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMessages(prev => {
              // Only update and scroll if the messages have actually changed
              if (prev.length === 0 || JSON.stringify(prev) !== JSON.stringify(data)) {
                setTimeout(() => scrollToBottom(prev.length === 0), 10);
                return data;
              }
              return prev;
            });
          }
        })
        .catch(err => console.error("Failed to load messages", err));
    };

    // Fetch initial messages instantly
    fetchMessages();

    // Mark as read immediately
    const markRead = () => {
      fetch('/api/chat/read', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(console.error);
    };
    markRead();

    // Poll every 3 seconds as a bulletproof fallback in case websockets are blocked by proxy
    const interval = setInterval(() => {
      fetchMessages();
      markRead();
    }, 3000);

    // Keep socket connection as a fast path
    const newSocket = io(window.location.origin, {
      path: '/socket.io'
    });
    
    setSocket(newSocket);

    newSocket.on('typing', (data: { userId: number, userName: string }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(data.userName)) {
          return [...prev, data.userName];
        }
        return prev;
      });
    });

    newSocket.on('stop_typing', (data: { userId: number, userName: string }) => {
      setTypingUsers((prev) => prev.filter(name => name !== data.userName));
    });

    newSocket.on('chat_cleared', () => {
      setMessages([]);
      markRead();
    });

    newSocket.on('new_message', (msg: ChatMessage) => {
      markRead();
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;

        const hasOptimistic = prev.some(m => m.user_id === msg.user_id && m.content === msg.content && m.id > 1000000000000);
        if (hasOptimistic) {
            return prev.map(m => (m.user_id === msg.user_id && m.content === msg.content && m.id > 1000000000000) ? msg : m);
        }
        
        return [...prev, msg];
      });
      setTimeout(scrollToBottom, 100);
    });

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [token]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachment(e.dataTransfer.files[0]);
    }
  };

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }, 100);
    // Double check after images might have loaded
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }, 500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment && !selectedGif) || !socket || !user || isUploading) return;

    let content = newMessage.trim();
    if (selectedGif) {
        content += (content ? '\n\n' : '') + selectedGif.images.fixed_height.url;
    }
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (attachment) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await fetch('/api/files?folderPath=/Chat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (data.success && data.id) {
          fileUrl = `/api/files/download/${data.id}?preview=true`;
          fileName = attachment.name;
          fileType = attachment.type;
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
        setAttachment(null);
      }
    }

    setNewMessage('');
    if (socket && user) {
      socket.emit('stop_typing', { userId: user.id, userName: `${user.first_name} ${user.last_name}` });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (!content && !fileUrl) {
      return;
    }
    
    setSelectedGif(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Optimistic UI update
    const tempId = Date.now();
    if (content !== '/clear') {
      const tempMessage: ChatMessage = {
        id: tempId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
        first_name: user.firstName,
        last_name: user.lastName,
        avatar_url: user.avatarUrl || null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      };

      setMessages(prev => [...prev, tempMessage]);
      setTimeout(scrollToBottom, 50);
    }

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType
        })
      });
      if (res.ok) {
        const realMsg = await res.json();
        if (content !== '/clear') {
          setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
        }
      } else {
        const errData = await res.json().catch(() => null);
        if (errData && errData.error) {
          alert(errData.error);
        }
      }
    } catch (e) {
      console.error("Failed to send message via API", e);
    }
  };

  // Helper to safely parse SQLite datetime strings to UTC
  const parseChatDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    let safeStr = dateStr;
    if (!safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
    if (!safeStr.endsWith('Z') && !safeStr.match(/[+-]\d{2}:?\d{2}$/)) {
      safeStr += 'Z';
    }
    return new Date(safeStr);
  };

  return (
    <div 
      className="flex flex-col flex-1 h-full min-h-0 p-2 md:p-6 pb-20 md:pb-6 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-teal/10 backdrop-blur-sm border-2 border-dashed border-brand-teal rounded-lg m-2 md:m-6 flex items-center justify-center pointer-events-none transition-all duration-200">
          <div className="bg-brand-navy/90 text-brand-teal px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center">
            <File className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold tracking-wide">Drop file to attach</h3>
            <p className="text-sm text-brand-teal/70 mt-1">Images or documents</p>
          </div>
        </div>
      )}
      

      <div 
        className="flex-1 rounded-lg border border-border-subtle flex flex-col overflow-hidden min-h-0 relative"
        style={{ backgroundColor: settings?.chatBackgroundTint || '#11161d' }}
      >
        {/* Chat Background Media */}
        {settings?.chatBackgroundImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            {settings.chatBackgroundImage.match(/\.(mp4|webm|ogg)$/i) ? (
              <video 
                src={settings.chatBackgroundImage} 
                className="w-full h-full object-cover" 
                autoPlay loop muted playsInline 
                style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
              />
            ) : (
              <img 
                src={settings.chatBackgroundImage} 
                alt="Chat Background" 
                className="w-full h-full object-cover"
                style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
              />
            )}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 relative z-10">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = user?.id === msg.user_id;
              const isEmojiOnly = isOnlyEmojis(msg.content) && !msg.file_url;
              
              const contentToRender = msg.content.split(/(\s+)/).map((part, i) => {
                if (part.startsWith('http') && (part.includes('giphy.com') || part.match(/\.(gif|jpe?g|png)$/i))) {
                  return <img key={i} src={part.trim()} alt="gif" className="max-w-[200px] rounded my-1 block" onLoad={() => scrollToBottom()} />;
                }
                if (part.includes('\n')) {
                  return <span key={i} className="break-all whitespace-pre-wrap">{part}</span>;
                }
                return <span key={i} className="break-all">{part}</span>;
              });
              
              return (
                <div key={msg.id} className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex ${!msg.file_url ? 'w-full max-w-full' : 'max-w-[85%] md:max-w-[70%]'} min-w-0 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-3' : 'mr-3'}`}>
                      {msg.avatar_url ? (
                        <img 
                          src={msg.avatar_url.startsWith('http') ? msg.avatar_url : `${window.location.origin}${msg.avatar_url}`} 
                          alt={msg.first_name} 
                          className="w-6 h-6 rounded-full object-cover bg-brand-navy border border-border-subtle" 
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
                          {msg.first_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div 
                      className={`flex flex-col min-w-0 ${!msg.file_url ? 'w-full max-w-full' : 'max-w-full'} ${isOwnMessage ? 'items-end' : 'items-start'} relative`}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      onClick={() => setHoveredMessageId(msg.id)}
                    >
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {msg.first_name} {msg.last_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis">
                          {new Intl.DateTimeFormat('en-US', { timeZone: settings?.timezone || 'Australia/Perth', hour: 'numeric', minute: 'numeric', hour12: true }).format(parseChatDate(msg.created_at))}
                        </span>
                      </div>
                      
                      <div 
                        className={`rounded-lg font-semibold tracking-wide break-words max-w-full ${
                          isEmojiOnly
                            ? 'text-5xl md:text-7xl py-1 leading-normal overflow-visible'
                            : `px-4 py-2 text-xs overflow-hidden ${isOwnMessage 
                              ? 'bg-brand-teal/10 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-none' 
                              : 'bg-brand-navy text-[#8B949E] border border-border-subtle rounded-tl-none'}`
                        }`}
                      >
                        {msg.file_url && (
                          <div className="mb-2">
                            {msg.file_type?.startsWith('image/') ? (
                              <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="text-left w-full">
                                <img src={`${msg.file_url}&token=${token}`} alt="attachment" className="max-w-full max-h-[200px] rounded object-cover cursor-pointer hover:opacity-90 border border-black/20" onLoad={() => scrollToBottom()} />
                              </button>
                            ) : (
                              <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="flex items-center space-x-2 p-2 bg-black/20 rounded cursor-pointer hover:bg-black/30 w-full text-left">
                                <File className="w-4 h-4 flex-shrink-0" />
                                <span className="underline truncate max-w-[150px]">{msg.file_name || 'Document'}</span>
                              </button>
                            )}
                          </div>
                        )}
                        <span>{contentToRender}</span>
                      
                      {(hoveredMessageId === msg.id || reactionPickerMessageId === msg.id) && (
                        <div className={`absolute -bottom-5 ${isOwnMessage ? 'left-0' : 'left-0'} bg-[#1c2128] border border-border-subtle rounded-full px-2 py-1 flex items-center space-x-2 shadow-xl z-[60]`}>
                          <button onClick={() => handleAddReaction(msg.id, '👍')} className="hover:scale-125 transition-transform text-base">👍</button>
                          <button onClick={() => handleAddReaction(msg.id, '❤️')} className="hover:scale-125 transition-transform text-base">❤️</button>
                          <button onClick={() => handleAddReaction(msg.id, '😂')} className="hover:scale-125 transition-transform text-base">😂</button>
                          <button onClick={() => handleAddReaction(msg.id, '😮')} className="hover:scale-125 transition-transform text-base">😮</button>
                          <button onClick={() => handleAddReaction(msg.id, '😢')} className="hover:scale-125 transition-transform text-base">😢</button>
                          <button onClick={() => handleAddReaction(msg.id, '🙏')} className="hover:scale-125 transition-transform text-base">🙏</button>
                          <div className="relative" ref={reactionPickerRef}>
                            <button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
                              <div className="absolute top-8 right-0 z-[100] shadow-xl" onClick={e => e.stopPropagation()}>
                                <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPickerMessageId(null); }} theme="dark" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {(() => {
                        try {
                          const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
                          const reactionEntries = Object.entries(reactions) as [string, number[]][];
                          if (reactionEntries.length === 0) return null;
                          
                          return (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reactionEntries.map(([emoji, users]) => {
                                const hasReacted = users.includes(user?.id);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleAddReaction(msg.id, emoji)}
                                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border ${hasReacted ? 'bg-brand-teal/20 border-brand-teal text-brand-teal' : 'bg-black/20 border-border-subtle text-zinc-400 hover:bg-black/40'}`}
                                  >
                                    <span className="text-[13px]">{emoji}</span>
                                    <span className="text-[10px] font-semibold">{users.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        } catch(e) {
                          return null;
                        }
                      })()}

                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })
          )}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-xs text-zinc-400 italic mt-4 pl-4 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.join(', ')} are typing...`}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#11161d]/90 backdrop-blur-md border-t border-border-subtle shrink-0 relative z-10">
          <div className="flex flex-col space-y-2">
            {attachment && (
              <div className="flex items-center space-x-2 bg-brand-navy p-2 rounded-lg border border-border-subtle max-w-sm">
                <div className="bg-brand-bg p-1.5 rounded">
                   {attachment.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-brand-teal" /> : <File className="w-4 h-4 text-zinc-400" />}
                </div>
                <div className="flex-1 truncate text-xs text-zinc-300">
                  {attachment.name}
                </div>
                <button type="button" onClick={() => setAttachment(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex space-x-2 items-end">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={e => e.target.files && setAttachment(e.target.files[0])} 
            />
            
            <div className="relative flex-1 flex flex-col bg-brand-navy border border-border-subtle rounded-lg focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal p-1">
              
              {selectedGif && (
                <div className="relative inline-block m-2 w-max">
                  <img src={selectedGif.images.fixed_height.url} alt="Selected GIF" className="max-h-32 rounded" />
                  <button type="button" onClick={() => setSelectedGif(null)} className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-zinc-300 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <div className="flex items-end">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent px-2 py-1.5 text-xs font-semibold tracking-wide text-[#E6EDF3] focus:outline-none border-none resize-none"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '240px' }}
                />
                
                <div className="flex items-center space-x-1 pb-1 pr-1 flex-shrink-0">
                  <div className="relative" ref={giphyPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => { setShowGiphyPicker(!showGiphyPicker); setShowEmojiPicker(false); }}
                      className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                      title="GIFs"
                    >
                      <Sticker className="w-4 h-4" />
                    </button>
                    {showGiphyPicker && (
                      <div className="absolute bottom-10 right-0 z-50 bg-brand-navy border border-border-subtle rounded-lg shadow-xl overflow-hidden p-2 flex flex-col" style={{ width: 300, height: 400 }}>
                        <input 
                          type="text" 
                          placeholder="Search GIFs..." 
                          value={gifSearch}
                          onChange={(e) => setGifSearch(e.target.value)}
                          className="w-full bg-black/20 border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-brand-teal"
                        />
                        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                          <Grid key={debouncedGifSearch} width={280} columns={2} fetchGifs={fetchGifs} onGifClick={onGifClick} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative" ref={emojiPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGiphyPicker(false); }}
                      className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                      title="Emojis"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 right-0 z-50 shadow-xl">
                        <Picker data={data} onEmojiSelect={onEmojiClick} theme="dark" />
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                    title="Attach File"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={(!newMessage.trim() && !attachment && !selectedGif) || isUploading}
              className="flex items-center justify-center px-4 py-2 h-[36px] mb-1 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-teal/20 border border-brand-teal/40 hover:bg-brand-teal hover:text-[#0d1117] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} {isUploading ? 'Sending...' : 'Send'}
            </button>
          </form>
          </div>
        </div>
      </div>
    
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0 bg-[#1c2128]">
            <h3 className="text-sm font-semibold text-white truncate pr-4">{previewFile.name}</h3>
            <button 
              onClick={() => setPreviewFile(null)}
              className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-md"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117] p-2 md:p-8 flex items-center justify-center min-h-0">
            {previewFile.type?.startsWith('image/') ? (
              <img src={`${previewFile.url}&token=${token}`} alt={previewFile.name} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded" />
            ) : (
              <iframe src={`${previewFile.url}&token=${token}`} title={previewFile.name} className="w-full h-full bg-white rounded-lg shadow-2xl" />
            )}
          </div>
          <div className="p-4 border-t border-border-subtle shrink-0 bg-[#1c2128] flex justify-end">
            <a 
              href={`${previewFile.url}&token=${token}`} 
              download={previewFile.name}
              target="_blank" rel="noreferrer"
              className="flex items-center px-6 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-teal/20 border border-brand-teal/40 hover:bg-brand-teal hover:text-[#0d1117]"
            >
              Open / Download Original
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

