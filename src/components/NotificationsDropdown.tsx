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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
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
    return () => clearInterval(interval);
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
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-full hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal"
      >
        <Bell className="w-[18px] h-[18px] text-[#8B949E] hover:text-[#E6EDF3] transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-brand-bg transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 bg-[#0B0E14] border border-border-subtle rounded-lg shadow-xl overflow-hidden z-[100] flex flex-col">
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
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#8B949E]">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    notif.is_read === 0 
                      ? 'bg-brand-navy border border-brand-teal/20' 
                      : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium text-sm text-white mb-1">{notif.title}</div>
                    {notif.is_read === 0 && (
                      <span className="w-2 h-2 rounded-full bg-brand-teal shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B949E] line-clamp-2">{notif.message}</p>
                  <div className="text-[10px] text-[#8B949E]/70 mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
