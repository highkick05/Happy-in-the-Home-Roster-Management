import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon, Smile, Sticker, MoreHorizontal, Camera, Edit2, Quote, Trash2 } from 'lucide-react';
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
  is_edited?: number;
}

export default function ChatView({ isMini = false }: { isMini?: boolean }) {
  const { user, token, settings } = useAuth();

  const gf = React.useMemo(() => {
    const apiKey = settings?.giphyApiKey || '1DZoHBs8dDry795Nu0JqbYMYXuhcmrRo';
    return new GiphyFetch(apiKey);
  }, [settings?.giphyApiKey]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const userIdToNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    messages.forEach(m => {
      if (m.user_id && m.first_name) map[m.user_id] = m.first_name;
    });
    if (user) map[user.id] = user.firstName;
    return map;
  }, [messages, user]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedGif, setSelectedGif] = useState<any>(null);
  const [quotedMessages, setQuotedMessages] = useState<ChatMessage[]>([]);
  const [gifSearch, setGifSearch] = useState('');
  const [debouncedGifSearch, setDebouncedGifSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGifSearch(gifSearch), 500);
    return () => clearTimeout(timer);
  }, [gifSearch]);
  const [attachments, setAttachments] = useState<globalThis.File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const giphyButtonRef = useRef<HTMLButtonElement>(null);
  const giphyPickerRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [reactionDetails, setReactionDetails] = useState<{msgId: number, emoji: string, userIds: number[]} | null>(null);
  const [inlineEditMessageId, setInlineEditMessageId] = useState<number | null>(null);
  const [inlineEditContent, setInlineEditContent] = useState('');

  

  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<number | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) && (!emojiButtonRef.current || !emojiButtonRef.current.contains(event.target as Node))) {
        setShowEmojiPicker(false);
      }
      if (giphyPickerRef.current && !giphyPickerRef.current.contains(event.target as Node) && (!giphyButtonRef.current || !giphyButtonRef.current.contains(event.target as Node))) {
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

  const handleQuote = (msg: ChatMessage) => {
    setQuotedMessages(prev => [...prev, msg]);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleSaveEdit = async (msgId: number) => {
    if (!inlineEditContent.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const handleDeleteMessage = async (msgId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        alert("Failed to delete message. You may not have permission.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReaction = async (messageId: number, emoji: string) => {
    setHoveredMessageId(null);
    setReactionPickerMessageId(null);
    setTimeout(() => {
      setHoveredMessageId(null);
      setReactionPickerMessageId(null);
    }, 100);
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

  const typingThrottleRef = useRef<boolean>(false);
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
      scrollToBottom();
    }
    
    if (!typingThrottleRef.current) {
      typingThrottleRef.current = true;
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isTyping: true, userName: `${user?.firstName} ${user?.lastName}`.trim() || 'User' })
      }).catch(() => {});
      setTimeout(() => { typingThrottleRef.current = false; }, 1500);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isTyping: false })
      }).catch(() => {});
    }, 2000);
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
    if (selectedGif || attachments.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedGif, attachments]);

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
      fetch('/api/chat/read', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
        .then(() => window.dispatchEvent(new CustomEvent('chat_read')))
        .catch(console.error);
    };
    markRead();

    const fetchTyping = () => {
      fetch(`/api/chat/typing?_t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.typingUsers) {
            setTypingUsers(data.typingUsers);
          }
        })
        .catch(() => {});
    };

    // Poll every 3 seconds as a bulletproof fallback in case websockets are blocked by proxy
    const interval = setInterval(() => {
      fetchMessages();
      markRead();
      fetchTyping();
    }, 2000);

    // Keep socket connection as a fast path
    const newSocket = io(window.location.origin, {
      path: '/socket.io'
    });
    
    setSocket(newSocket);





    
    newSocket.on('chat_message_edited', (msg: ChatMessage) => {
      setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
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
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  useEffect(() => {
    if (typingUsers.length > 0) {
      scrollToBottom();
    }
  }, [typingUsers]);

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
    if ((!newMessage.trim() && attachments.length === 0 && !selectedGif && quotedMessages.length === 0) || !socket || !user || isUploading) return;

    let content = newMessage.trim();
    if (quotedMessages.length > 0) {
      const quotePrefix = quotedMessages.map(qMsg => {
        let contentToQuote = qMsg.content || '';
        if (!contentToQuote && qMsg.file_url) {
          contentToQuote = `[${qMsg.file_name || 'Attachment'}]`;
        } else {
          contentToQuote = contentToQuote.split('\n').filter(line => !line.startsWith('> ')).join(' ').trim();
          if (!contentToQuote) contentToQuote = '[Attachment]';
        }
        return `> ${qMsg.first_name}: ${contentToQuote}\n\n`;
      }).join('');
      content = quotePrefix + content;
      setQuotedMessages([]);
    }
    
    if (selectedGif) {
        content += (content ? '\n\n' : '') + selectedGif.images.fixed_height.url;
    }

    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/files?folderPath=/Chat', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (data.success && data.id) {
            const fileUrl = `/api/files/download/${data.id}?preview=true`;
            const fileName = file.name;
            const fileType = file.type;

            // Optimistic UI update
            const tempId = Date.now() + i;
            if (content !== '/clear') {
              const tempMessage = {
                id: tempId,
                user_id: user.id,
                content: i === 0 ? content : '', // Only include text in first message
                created_at: new Date().toISOString(),
                first_name: user.firstName,
                last_name: user.lastName,
                avatar_url: user.avatarUrl || null,
                file_url: fileUrl,
                file_name: fileName,
                file_type: fileType,
              };

              setMessages(prev => [...prev, tempMessage as any]);
              setTimeout(scrollToBottom, 50);
            }

            try {
              const res2 = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  content: i === 0 ? content : '',
                  file_url: fileUrl,
                  file_name: fileName,
                  file_type: fileType
                })
              });
              if (res2.ok) {
                const realMsg = await res2.json();
                if (content !== '/clear') {
                  setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
                }
              }
            } catch (e) {
              console.error("Failed to send message via API", e);
            }
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
        setAttachments([]);
      }
    } else if (content || selectedGif) {
      // Optimistic UI update
      const tempId = Date.now();
      if (content !== '/clear') {
        const tempMessage = {
          id: tempId,
          user_id: user.id,
          content,
          created_at: new Date().toISOString(),
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.avatarUrl || null,
          file_url: null,
          file_name: null,
          file_type: null,
        };

        setMessages(prev => [...prev, tempMessage as any]);
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
            file_url: null,
            file_name: null,
            file_type: null
          })
        });
        if (res.ok) {
          const realMsg = await res.json();
          if (content !== '/clear') {
            setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
          }
        }
      } catch (e) {
        console.error("Failed to send message via API", e);
      }
    }

    setNewMessage('');
    setSelectedGif(null);
    setQuotedMessages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ isTyping: false })
    }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
      className={`flex flex-col flex-1 h-full min-h-0 relative ${isMini ? 'p-0 pb-0' : 'p-2 md:p-6 pb-20 md:pb-6'}`}
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
            {(() => {
              const srcWithToken = settings.chatBackgroundImage.startsWith('/api/files/download') 
                ? `${settings.chatBackgroundImage}${settings.chatBackgroundImage.includes('?') ? '&' : '?'}token=${token}`
                : settings.chatBackgroundImage;
              return settings.chatBackgroundImage.match(/\.(mp4|webm|ogg)$/i) ? (
                <video 
                  src={srcWithToken} 
                  className="w-full h-full object-cover" 
                  autoPlay loop muted playsInline 
                  style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
                />
              ) : (
                <img 
                  src={srcWithToken} 
                  alt="Chat Background" 
                  className="w-full h-full object-cover"
                  style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
                />
              );
            })()}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 relative z-10">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = Number(user?.id) === Number(msg.user_id);
              const nonQuotedText = msg.content.split('\n').filter(line => !line.startsWith('> ')).join('\n').trim();
              const hasQuote = msg.content.includes('> ');
              const isEmojiOnly = isOnlyEmojis(nonQuotedText) && !msg.file_url && nonQuotedText.length > 0 && !hasQuote;
              
              const contentToRender = msg.content.split('\n').map((line, lineIndex) => {
                if (line.startsWith('> ')) {
                  const quoteContent = line.substring(2);
                  const isImageQuote = quoteContent.match(/http.*(giphy\.com|\.(gif|jpe?g|png))/i);
                  
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
                }
                
                return (
                  <div key={lineIndex} className="min-h-[14px] whitespace-pre-wrap">
                    {line.split(/(\s+)/).map((part, i) => {
                      if (part.startsWith('http') && (part.includes('giphy.com') || part.match(/\.(gif|jpe?g|png)$/i))) {
                        return <img key={i} src={part.trim()} alt="gif" className="max-w-[200px] rounded my-1 block" onLoad={() => scrollToBottom()} />;
                      }
                      return <span key={i} className="break-words">{part}</span>;
                    })}
                  </div>
                );
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
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${msg.first_name}+${msg.last_name}&background=0D8B93&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
                          {msg.first_name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div 
                      className={`flex flex-col min-w-0 ${!msg.file_url ? 'max-w-full' : 'max-w-full'} ${isOwnMessage ? 'items-end' : 'items-start'} relative`}
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
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        className="relative max-w-full flex flex-col"
                      >
                        <div 
                          onClick={() => setHoveredMessageId(prev => prev === msg.id ? null : msg.id)}
                          className={`rounded-lg font-semibold tracking-wide break-words max-w-full cursor-default ${
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
                        {inlineEditMessageId === msg.id ? (
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
                        {msg.is_edited ? <span className="text-[9px] opacity-50 ml-2 italic">(edited)</span> : null}
                        </div>
                      
                      {(hoveredMessageId === msg.id || reactionPickerMessageId === msg.id) && (
                        <div className={`absolute -top-10 right-0 bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60]`}>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '👍'); }} className="hover:scale-125 transition-transform text-base">👍</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '❤️'); }} className="hover:scale-125 transition-transform text-base">❤️</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😂'); }} className="hover:scale-125 transition-transform text-base">😂</button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😮'); }} className="hover:scale-125 transition-transform text-base">😮</button>
                          
                          <div className="relative" ref={reactionPickerRef}>
                            <button onClick={(e) => { e.stopPropagation(); setReactionPickerMessageId(reactionPickerMessageId === msg.id ? null : msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                            {reactionPickerMessageId === msg.id && (
                              <div className={`absolute top-8 ${isOwnMessage ? 'right-0' : 'left-0'} z-[100] shadow-xl`} onClick={e => e.stopPropagation()}>
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
                      )}
                      
                      {(() => {
                        try {
                          const reactions = msg.reactions ? JSON.parse(msg.reactions) : {};
                          const reactionEntries = Object.entries(reactions) as [string, number[]][];
                          if (reactionEntries.length === 0) return null;
                          
                          return (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                              {reactionEntries.map(([emoji, users]) => {
                                const hasReacted = users.includes(user?.id);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, emoji); }}
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
          <div ref={messagesEndRef} className="h-6" />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 pt-2 pb-1 bg-[#11161d]/90 backdrop-blur-md shrink-0 flex items-center space-x-2 text-xs text-brand-teal italic z-10 relative">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="animate-pulse">{typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.join(', ')} are typing...`}</span>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-[#11161d]/90 backdrop-blur-md border-t border-border-subtle shrink-0 relative z-10">
          <div className="flex flex-col space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 max-h-32 overflow-y-auto">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-brand-navy p-2 rounded-lg border border-border-subtle max-w-[200px]">
                    <div className="bg-brand-bg p-1.5 rounded shrink-0">
                       {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-brand-teal" /> : <File className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div className="flex-1 truncate text-xs text-zinc-300">
                      {file.name}
                    </div>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-white shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex space-x-2 items-end">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              multiple
              onChange={e => {
                if (e.target.files) {
                  setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }} 
            />
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              capture="environment"
              ref={cameraInputRef} 
              onChange={e => {
                if (e.target.files) {
                  setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }} 
            />
            
            <div className="relative flex-1 flex flex-col bg-brand-navy border border-border-subtle rounded-lg focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal">
              
              {selectedGif && (
                <div className="relative inline-block m-2 w-max">
                  <img src={selectedGif.images.fixed_height.url} alt="Selected GIF" className="max-h-32 rounded" />
                  <button type="button" onClick={() => setSelectedGif(null)} className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-zinc-300 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {quotedMessages.length > 0 && (
                <div className="flex flex-col space-y-1 mx-2 mt-2">
                  {quotedMessages.map((qMsg, idx) => {
                    const isImageQuote = qMsg.content?.match(/http.*(giphy\.com|\.(gif|jpe?g|png))/i);
                    let quoteContent = qMsg.content ? qMsg.content.split('\n').filter(line => !line.startsWith('> ')).join(' ').trim() : '';
                    if (!quoteContent && qMsg.file_url) quoteContent = `[${qMsg.file_name || 'Attachment'}]`;

                    return (
                      <div key={idx} className="relative flex items-center justify-between bg-black/20 border-l-[3px] border-brand-teal/50 rounded-r-md px-3 py-1.5 text-xs text-zinc-300">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-semibold text-brand-teal">{qMsg.first_name}:</span>
                          {isImageQuote ? (
                            <img src={isImageQuote[0]} alt="quoted gif" className="h-8 rounded object-cover" />
                          ) : (
                            <span className="truncate">{quoteContent}</span>
                          )}
                        </div>
                        <button type="button" onClick={() => setQuotedMessages(prev => prev.filter((_, i) => i !== idx))} className="ml-2 bg-black/50 hover:bg-black p-1 rounded-full text-zinc-400 hover:text-white transition-colors flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex items-end">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent px-3 py-2.5 text-xs font-semibold tracking-wide text-[#E6EDF3] focus:outline-none border-none resize-none"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '240px' }}
                />
                
                <div className="flex items-center space-x-1 pb-0.5 pr-1 flex-shrink-0">
                  <button 
                    ref={giphyButtonRef}
                    type="button" 
                    onClick={() => { setShowGiphyPicker(!showGiphyPicker); setShowEmojiPicker(false); }}
                    className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                    title="GIFs"
                  >
                    <Sticker className="w-4 h-4" />
                  </button>
                  
                  <button 
                    ref={emojiButtonRef}
                    type="button" 
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGiphyPicker(false); }}
                    className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                    title="Emojis"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                    title="Camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  
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
              disabled={(!newMessage.trim() && attachments.length === 0 && !selectedGif) || isUploading}
              className="flex items-center justify-center px-4 h-[36px] text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-teal/20 border border-brand-teal/40 hover:bg-brand-teal hover:text-[#0d1117] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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

      {showGiphyPicker && (
        <div ref={giphyPickerRef} className="absolute z-50 bg-brand-navy border border-border-subtle rounded-lg shadow-xl overflow-hidden p-2 flex flex-col bottom-[70px] left-2 right-2 sm:left-auto sm:right-6 sm:w-[320px] max-w-[400px]" style={{ height: 400 }}>
          <input 
            type="text" 
            placeholder="Search GIFs..." 
            value={gifSearch}
            onChange={(e) => setGifSearch(e.target.value)}
            className="w-full bg-black/20 border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-brand-teal shrink-0"
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex justify-center">
            <div className="w-full max-w-[280px]">
              <Grid key={debouncedGifSearch} width={280} columns={2} fetchGifs={fetchGifs} onGifClick={onGifClick} hideAttribution={true} noLink={true} />
            </div>
          </div>
        </div>
      )}
      
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute z-50 shadow-xl bottom-[70px] right-2 sm:right-6">
          <Picker data={data} onEmojiSelect={onEmojiClick} theme="dark" />
        </div>
      )}
    </div>
  );
}

