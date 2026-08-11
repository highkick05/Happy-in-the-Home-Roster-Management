import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

export default function EmailFloatingWidget() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/emails/unread-count', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.total);
        }
      } catch (e) {
        console.error("Failed to fetch unread count:", e);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (unreadCount === null) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 print:hidden">
      <a 
        href="/email"
        className="relative flex items-center justify-center w-12 h-12 bg-brand-navy hover:bg-brand-navy/90 border border-brand-teal/30 shadow-lg rounded-full text-white transition-all transform hover:scale-105"
        title={`${unreadCount} Unread Email${unreadCount !== 1 ? 's' : ''}`}
      >
        <Mail className="w-5 h-5 text-brand-teal" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-2 ring-brand-bg shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </a>
    </div>
  );
}
