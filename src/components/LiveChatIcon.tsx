import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function LiveChatIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
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

  return (
    <button 
      onClick={() => navigate('/chat')}
      className="relative p-1.5 rounded-full hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal "
    >
      <MessageSquare className={`w-[18px] h-[18px] transition-colors ${unreadCount > 0 ? 'text-brand-teal' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-brand-bg transform translate-x-1/4 -translate-y-1/4">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
