import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmailFloatingWidget() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<{ username: string; count: number }[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;

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

  if (!isAdmin) return null;

  return (
    <div 
      className="relative print:hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <a 
        href="/email"
        className="relative p-1.5 rounded-full hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal flex items-center justify-center"
      >
        <Mail className={`w-[18px] h-[18px] transition-colors ${(unreadCount ?? 0) > 0 ? 'text-brand-teal' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`} />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-brand-bg transform translate-x-1/4 -translate-y-1/4">
            {(unreadCount ?? 0) > 99 ? '99+' : unreadCount}
          </span>
        )}
      </a>

      {isHovering && accounts.length > 0 && (
        <div className="absolute right-0 top-full mt-2 bg-brand-navy border border-border-subtle shadow-xl rounded-lg p-3 w-64 z-[100] animate-in fade-in slide-in-from-top-2">
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
    </div>
  );
}
