import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LiveChatIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { token } = useAuth();
  const navigate = useNavigate();

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
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [token]);

  return (
    <button 
      onClick={() => navigate('/chat')}
      className="relative p-1.5 rounded-full hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal "
    >
      <MessageCircle className={`w-[18px] h-[18px] transition-colors ${unreadCount > 0 ? 'text-brand-teal' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-brand-bg transform translate-x-1/4 -translate-y-1/4">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
