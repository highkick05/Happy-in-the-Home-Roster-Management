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
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial messages instantly
    fetch('/api/chat/messages', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          scrollToBottom();
        }
      })
      .catch(err => console.error("Failed to load messages", err));

    // Initialize socket connection
    const newSocket = io({
      path: '/socket.io',
    });
    
    setSocket(newSocket);

    newSocket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

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
        if (data.success && data.system_name) {
          fileUrl = `/api/assets/${data.system_name}`;
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

    socket.emit('send_message', {
      user_id: user.id,
      content,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType
    }, (realMsg: ChatMessage) => {
       setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
    });
  };

  return (
    <div className="flex flex-col h-full p-2 md:p-6 pb-20 md:pb-6">
      

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1c2128] rounded-xl border border-border-subtle shadow-2xl flex flex-col w-full max-w-4xl max-h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0 bg-[#22272e]">
              <h3 className="text-sm font-semibold text-white truncate pr-4">{previewFile.name}</h3>
              <button 
                onClick={() => setPreviewFile(null)}
                className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#0d1117] p-4 flex items-center justify-center min-h-0">
              {previewFile.type?.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain drop-shadow-md rounded" />
              ) : (
                <iframe src={previewFile.url} title={previewFile.name} className="w-full h-full bg-white rounded" />
              )}
            </div>
            <div className="p-4 border-t border-border-subtle shrink-0 bg-[#22272e] flex justify-end">
              <a 
                href={previewFile.url} 
                download={previewFile.name}
                target="_blank" rel="noreferrer"
                className="flex items-center px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-blue hover:bg-blue-600"
              >
                Open / Download Original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

