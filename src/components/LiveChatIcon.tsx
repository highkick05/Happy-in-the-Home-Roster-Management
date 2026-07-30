import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatNotifications } from '../context/ChatNotificationContext';

export default function LiveChatIcon() {
  const { unreadCount, subscribeToPush } = useChatNotifications();
  const navigate = useNavigate();

  return (
    <button 
      onClick={() => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') subscribeToPush();
          }).catch(() => {});
        }
        navigate('/chat', { replace: true });
      }}
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
