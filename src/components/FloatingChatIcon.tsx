import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function FloatingChatIcon() {
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

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [token, user]);

  if (location.pathname.includes('/chat')) return null;

  return (
    <button 
      onClick={() => navigate('/chat')}
      className="fixed bottom-6 right-4 z-[9999] p-4 bg-brand-teal text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all lg:hidden"
    >
      <MessageSquare className="w-6 h-6 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-black text-white bg-red-600 rounded-full border-2 border-brand-teal transform shadow-md">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
