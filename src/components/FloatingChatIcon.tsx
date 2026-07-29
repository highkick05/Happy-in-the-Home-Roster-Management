import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Maximize2 } from 'lucide-react';
import ChatView from './Chat/ChatView';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function FloatingChatIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chat/unread', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (e) {
      console.error("Failed to fetch unread chat count", e);
    }
  };

  useEffect(() => {
    if (location.pathname.includes('/chat')) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10 seconds

    const socket = io(window.location.origin, {
      transports: ['websocket'],
      path: '/socket.io'
    });

    socket.on('new_message', (msg: any) => {
      // Only increment if we aren't on the chat page and the message isn't ours
      if (!window.location.pathname.includes('/chat')) {
        if (!user || msg.user_id !== user.id) {
          setUnreadCount(prev => prev + 1);
        }
      }
    });

    socket.on('chat_cleared', () => {
      setUnreadCount(0);
    });

    const handleChatRead = () => {
      setUnreadCount(0);
    };
    window.addEventListener('chat_read', handleChatRead);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('chat_read', handleChatRead);
    };
  }, [token, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (location.pathname.includes('/chat')) return null;

  return (
    <>
      {isOpen && (
        <div ref={popupRef} className="fixed bottom-0 right-0 w-full sm:w-[400px] h-[75vh] sm:h-[65vh] max-h-[700px] sm:max-h-[600px] bg-brand-bg border-l border-t border-border-subtle rounded-tl-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 origin-bottom-right z-[9999] lg:hidden">
          <div className="flex justify-between items-center p-3 bg-brand-navy border-b border-border-subtle shrink-0">
            <h3 className="font-bold text-white tracking-wide text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-teal" /> Live Chat
            </h3>
            <div className="flex items-center gap-3">
               <button onClick={() => { setIsOpen(false); navigate('/chat'); }} className="text-zinc-400 hover:text-white transition-colors" title="Open Full View">
                 <Maximize2 className="w-4 h-4" />
               </button>
               <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors" title="Close">
                 <X className="w-5 h-5" />
               </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col bg-brand-bg">
            <ChatView isMini={true} />
          </div>
        </div>
      )}
      
      {!isOpen && (
        <div className="fixed bottom-6 right-4 z-[9999] lg:hidden flex flex-col items-end gap-2">
          <button 
            onClick={() => {
              setIsOpen(true);
              setUnreadCount(0);
            }}
            className="p-4 bg-brand-teal text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-black text-white bg-red-600 rounded-full border-2 border-brand-teal transform shadow-md">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
