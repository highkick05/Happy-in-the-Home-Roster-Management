import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  link: string | null;
  created_at: string;
}

export default function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState<{ title: string; message: string; top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { token, settings } = useAuth();
  const navigate = useNavigate();

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, notif: Notification) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320;
    let left = rect.left - tooltipWidth - 12;
    if (left < 12) {
      left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, rect.left));
    }
    let top = Math.min(window.innerHeight - 200, Math.max(70, rect.top));

    setActiveTooltip({
      title: notif.title,
      message: notif.message,
      top,
      left
    });
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/notifications?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => n.is_read === 0).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute

    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('refresh-notifications', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleRefresh);
    };
  }, [token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (notif.is_read === 0 && token) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        console.error(e);
      }
    }
    setIsOpen(false);
    setActiveTooltip(null);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setActiveTooltip(null);
        }}
        className="relative p-1.5 rounded-full hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal"
      >
        <Bell className={`w-[18px] h-[18px] transition-colors ${notifications.some(n => n.type === 'ALERT' && n.is_read === 0) ? 'text-red-500 animate-pulse' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-brand-bg transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[32rem] bg-[#0B0E14] border border-border-subtle rounded-lg shadow-xl overflow-hidden z-[100] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-brand-navy">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-brand-teal hover:text-white transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1" onScroll={() => setActiveTooltip(null)}>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#8B949E]">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => {
                const isAlert = notif.type === 'ALERT';
                return (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  onMouseEnter={(e) => handleMouseEnter(e, notif)}
                  onMouseLeave={handleMouseLeave}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    isAlert
                      ? (notif.is_read === 0 ? 'bg-red-500/10 border border-red-500' : 'hover:bg-white/[0.02] border border-red-500/30 bg-red-500/5')
                      : (notif.is_read === 0 
                         ? 'bg-brand-navy border border-brand-teal/20' 
                         : 'hover:bg-white/[0.02] border border-transparent')
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className={`font-medium text-sm mb-1 ${isAlert ? 'text-red-400' : 'text-white'}`}>{notif.title}</div>
                    {notif.is_read === 0 && (
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${isAlert ? 'bg-red-500 animate-pulse' : 'bg-brand-teal'}`}></span>
                    )}
                  </div>
                  <p 
                    className="text-xs text-[#8B949E] line-clamp-3 leading-relaxed hover:text-[#E6EDF3] transition-colors"
                    title={notif.message}
                  >
                    {notif.message}
                  </p>
                  <div className="text-[10px] text-[#8B949E]/70 mt-2">
                    {new Intl.DateTimeFormat(undefined, { 
                      timeZone: settings?.timezone || 'Australia/Perth',
                      year: 'numeric', month: 'numeric', day: 'numeric',
                      hour: 'numeric', minute: 'numeric', second: 'numeric',
                      hour12: true
                    }).format(new Date(notif.created_at.includes('T') ? notif.created_at : notif.created_at.replace(' ', 'T') + 'Z'))}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Text Popup for full unclipped message */}
      {isOpen && activeTooltip && (
        <div 
          className="fixed z-[120] w-80 max-w-[calc(100vw-32px)] p-3.5 bg-[#161B22] border border-border-subtle rounded-xl shadow-2xl text-xs text-[#E6EDF3] backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/10"
          style={{ top: activeTooltip.top, left: activeTooltip.left }}
        >
          <div className="font-semibold text-white mb-1.5 flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
            {activeTooltip.title}
          </div>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-[11.5px] break-words">
            {activeTooltip.message}
          </p>
          <div className="mt-2 pt-2 border-t border-white/[0.06] text-[10px] text-zinc-500 italic flex items-center justify-between">
            <span>Full notification text</span>
            <span className="text-brand-teal font-medium">Click to navigate</span>
          </div>
        </div>
      )}
    </div>
  );
}
