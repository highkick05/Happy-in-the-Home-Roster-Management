import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import { useLocation } from 'react-router-dom';

interface ChatNotificationContextType {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  subscribeToPush: () => Promise<void>;
}

const ChatNotificationContext = createContext<ChatNotificationContextType | undefined>(undefined);

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { token, user } = useAuth();
  const location = useLocation();

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const response = await fetch('/api/push/public-key');
        const vapidPublicKey = await response.text();
        
        function urlBase64ToUint8Array(base64String: string) {
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

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/unread?_t=${Date.now()}`, {
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
    if (!token || !user) return;
    
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
    
    socket.on('chat_read_by_user', (data: any) => {
      if (user && data.user_id === user.id) {
        setUnreadCount(0);
      }
    });
    
    socket.on('message_reaction', () => {
      if (!window.location.pathname.includes('/chat')) {
        fetchUnread();
      }
    });

    socket.on('chat_message_edited', () => {
      if (!window.location.pathname.includes('/chat')) {
        fetchUnread();
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
    <ChatNotificationContext.Provider value={{ unreadCount, setUnreadCount, subscribeToPush }}>
      {children}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications() {
  const context = useContext(ChatNotificationContext);
  if (!context) throw new Error("useChatNotifications must be used within a ChatNotificationProvider");
  return context;
}
