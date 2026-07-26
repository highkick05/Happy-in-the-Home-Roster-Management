import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { Send, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function ChatView() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io({
      path: '/socket.io',
    });
    
    setSocket(newSocket);

    newSocket.on('initial_messages', (initialMessages: ChatMessage[]) => {
      setMessages(initialMessages);
      scrollToBottom();
    });

    newSocket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    socket.emit('send_message', {
      user_id: user.id,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-none mb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Live Chat</h1>
        <p className="text-zinc-400">Communicate with your team in real-time.</p>
      </div>

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
                          className="w-8 h-8 rounded-full object-cover bg-brand-bg border border-border-subtle" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
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
                        className={`px-4 py-2 rounded-2xl text-sm break-words \${
                          isOwnMessage 
                            ? 'bg-brand-blue text-white rounded-tr-none' 
                            : 'bg-brand-bg text-zinc-200 border border-border-subtle rounded-tl-none'
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
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-brand-bg border border-border-subtle rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full p-2.5 flex-shrink-0 transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
