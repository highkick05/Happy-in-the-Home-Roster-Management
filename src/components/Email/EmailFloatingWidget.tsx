import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmailFloatingWidget() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<{ username: string; count: number }[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

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
          setAccounts(data.accounts || []);
        }
      } catch (e) {
        console.error("Failed to fetch unread count:", e);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user?.role]);

  if (user?.role !== 'ADMIN') return null;
  if (unreadCount === null) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 print:hidden flex flex-col items-end">
      {isHovering && accounts.length > 0 && (
        <div className="mb-2 bg-brand-navy border border-border-subtle shadow-xl rounded-lg p-3 w-64 animate-in fade-in slide-in-from-bottom-2">
          <h4 className="text-xs font-semibold text-[#E6EDF3] mb-2 uppercase tracking-wider">Unread Emails</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {accounts.map((acc, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-[#8B949E] truncate mr-2" title={acc.username}>
                  {acc.username}
                </span>
                <span className={`font-medium ${acc.count > 0 ? 'text-brand-teal' : 'text-[#8B949E]'}`}>
                  {acc.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <a 
        href="/email"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative flex items-center justify-center w-12 h-12 bg-brand-navy hover:bg-brand-navy/90 border border-brand-teal/30 shadow-lg rounded-full text-white transition-all transform hover:scale-105"
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
