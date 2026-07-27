import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

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
}

export default function ChatView() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<globalThis.File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                setTimeout(scrollToBottom, 100);
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

    // Poll every 3 seconds for robust real-time updates
    const interval = setInterval(() => {
      fetchMessages();
      markRead();
    }, 3000);

    // Keep socket connection as a fast path
    const newSocket = io({
      path: '/socket.io',
    });
    
    setSocket(newSocket);

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
      scrollToBottom();
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !socket || !user || isUploading) return;

    const content = newMessage.trim();
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

    if (!content && !fileUrl) {
      // If there's no text and upload failed (fileUrl is null), don't send an empty bubble
      return;
    }
    
    // Optimistic UI update
    const tempId = Date.now();
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
    scrollToBottom();

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
        setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
      }
    } catch (e) {
      console.error("Failed to send message via API", e);
    }
  };

  return (
    <div 
      className="flex flex-col h-full p-2 md:p-6 pb-20 md:pb-6 relative"
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
      

      <div className="flex-1 bg-brand-navy rounded-lg border border-border-subtle flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = user?.id === msg.user_id;
              
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    
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
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {msg.first_name} {msg.last_name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </span>
                      </div>
                      
                      <div 
                        className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide break-words \${
                          isOwnMessage 
                            ? 'bg-brand-teal/10 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-none' 
                            : 'bg-brand-navy text-[#8B949E] border border-border-subtle rounded-tl-none'
                        }`}
                      >
                        {msg.file_url && (
                          <div className="mb-2">
                            {msg.file_type?.startsWith('image/') ? (
                              <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="text-left w-full">
                                <img src={`${msg.file_url}&token=${token}`} alt="attachment" className="max-w-full max-h-[200px] rounded object-cover cursor-pointer hover:opacity-90 border border-black/20" />
                              </button>
                            ) : (
                              <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="flex items-center space-x-2 p-2 bg-black/20 rounded cursor-pointer hover:bg-black/30 w-full text-left">
                                <File className="w-4 h-4 flex-shrink-0" />
                                <span className="underline truncate max-w-[150px]">{msg.file_name || 'Document'}</span>
                              </button>
                            )}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#11161d] border-t border-border-subtle">
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
            <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={e => e.target.files && setAttachment(e.target.files[0])} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center p-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors border border-transparent hover:border-border-subtle"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-brand-navy border border-border-subtle rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-[#E6EDF3] focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
            />
            <button
              type="submit"
              disabled={(!newMessage.trim() && !attachment) || isUploading}
              className="flex items-center px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-[#E6EDF3] bg-brand-teal/10 border border-brand-teal/30 hover:bg-brand-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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

