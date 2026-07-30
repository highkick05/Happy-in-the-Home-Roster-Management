import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function LiveChatIcon() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const response = await fetch('/api/push/public-key');
        const vapidPublicKey = await response.text();
        
        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
        
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });
    } catch (e) {
      console.error('Failed to subscribe to push notifications', e);
    }
  };

  useEffect(() => {
    if (token && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPush();
    }
  }, [token]);

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

    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

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

    socket.on('chat_read_by_user', (data: any) => {
      if (user && data.user_id === user.id) {
        setUnreadCount(0);
      }
    });
    
    socket.on('chat_cleared', () => {
      setUnreadCount(0);
    });

    const handleChatRead = () => {
      setUnreadCount(0);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_NOTIFICATIONS' });
      }
    };
    window.addEventListener('chat_read', handleChatRead);

    return () => {
      clearInterval(interval);
      socket.disconnect();
      window.removeEventListener('chat_read', handleChatRead);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [token, user]);

  
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        // @ts-ignore
        navigator.setAppBadge(unreadCount).catch(() => {});
      } else {
        // @ts-ignore
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);
return (
    <button 
      onClick={() => {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') subscribeToPush();
          }).catch(() => {});
        }
        navigate('/chat');
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
