import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Send, User as UserIcon, Paperclip, File, X, Loader2, Image as ImageIcon, Smile, Sticker, MoreHorizontal, Camera, Edit2, Quote, Trash2, Check, ArrowLeft, Search, Users, MessageSquare, Hash, Shield, Lock, Play, Pause, Video, Maximize2, Download } from 'lucide-react';
// @ts-ignore
import data from '@emoji-mart/data';
// @ts-ignore
import Picker from '@emoji-mart/react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';

interface ChatMessage {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  reactions?: string;
  is_edited?: number;
  conversation_id?: number;
}

interface ConversationUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status?: string;
  canSwitchAdmin?: boolean;
  avatarUrl: string | null;
  primaryPosition: string;
  additionalPositions?: string[] | string;
}

export const formatStaffPositions = (
  primary?: string | null,
  additionals?: string[] | string | null,
  role?: string | null
): string => {
  const primaryPos = (primary && primary.trim()) || (role === 'ADMIN' ? 'Administrator' : 'Support Worker');
  
  let addList: string[] = [];
  if (Array.isArray(additionals)) {
    addList = additionals;
  } else if (typeof additionals === 'string' && additionals.trim()) {
    try {
      const parsed = JSON.parse(additionals);
      if (Array.isArray(parsed)) addList = parsed;
    } catch {
      addList = additionals.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const result: string[] = [primaryPos];
  for (const pos of addList) {
    if (pos && typeof pos === 'string') {
      const trimmed = pos.trim();
      if (trimmed && !result.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
        result.push(trimmed);
      }
    }
  }

  return result.join(' / ');
};

export const isVideoAttachment = (
  fileType?: string | null,
  fileName?: string | null,
  fileUrl?: string | null
): boolean => {
  if (fileType && fileType.toLowerCase().startsWith('video/')) return true;
  const name = (fileName || fileUrl || '').toLowerCase().split('?')[0];
  const videoExts = ['.mp4', '.webm', '.mov', '.ogg', '.m4v', '.ogv', '.mkv', '.avi'];
  return videoExts.some(ext => name.endsWith(ext));
};

interface ChatVideoPlayerProps {
  url: string;
  fileName: string;
  onExpand?: () => void;
  onLoaded?: () => void;
}

function ChatVideoPlayer({ url, fileName, onExpand, onLoaded }: ChatVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Video play interrupted:", err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative group/player rounded-lg overflow-hidden bg-black/70 border border-white/10 my-1.5 max-w-full sm:max-w-[380px] md:max-w-[440px] shadow-lg">
      {/* Top Bar with filename and action buttons */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20 pointer-events-auto">
        <div className="flex items-center space-x-1.5 min-w-0 pr-2">
          <Video className="w-3.5 h-3.5 text-brand-teal shrink-0" />
          <span className="text-[11px] font-medium text-white/90 truncate" title={fileName}>
            {fileName}
          </span>
          {duration !== null && duration > 0 && (
            <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
              ({formatDuration(duration)})
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          {onExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/20 transition-colors"
              title="Expand player"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <a
            href={url}
            download={fileName}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/20 transition-colors"
            title="Download video"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Video Element */}
      <div className="relative aspect-video flex items-center justify-center bg-black/90">
        {error ? (
          <div className="p-4 text-center text-xs text-zinc-400 flex flex-col items-center space-y-2">
            <Video className="w-8 h-8 text-zinc-500" />
            <span>Unable to preview video in browser</span>
            <a
              href={url}
              download={fileName}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 bg-brand-teal/20 hover:bg-brand-teal text-white hover:text-black rounded text-[11px] font-medium transition-colors"
            >
              Download Video
            </a>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                if (onLoaded) onLoaded();
              }}
              onError={() => setError(true)}
            />

            {/* Big Center Play Button Overlay (when paused / not started) */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10 cursor-pointer group/btn"
                title="Play Video"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-teal/90 group-hover/btn:bg-brand-teal text-[#0d1117] flex items-center justify-center shadow-2xl shadow-brand-teal/30 transform transition-all duration-200 group-hover/btn:scale-110 active:scale-95">
                  <Play className="w-6 h-6 md:w-7 md:h-7 ml-1 fill-current" />
                </div>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}


interface ConversationItem {
  id: number | null;
  type: 'TEAM' | 'DIRECT';
  title?: string;
  targetUserId?: number;
  user?: ConversationUser;
  unreadCount: number;
  lastMessage?: ChatMessage | null;
}

export default function ChatView({ isMini = false }: { isMini?: boolean }) {
  const { user, token, settings } = useAuth();

  const gf = React.useMemo(() => {
    const apiKey = settings?.giphyApiKey || '1DZoHBs8dDry795Nu0JqbYMYXuhcmrRo';
    return new GiphyFetch(apiKey);
  }, [settings?.giphyApiKey]);

  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [conversations, setConversations] = useState<{ team: ConversationItem; direct: ConversationItem[] }>({
    team: { id: 1, type: 'TEAM', title: 'Team Chat', unreadCount: 0 },
    direct: []
  });

  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(() => {
    if (isMini) return null;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return null;
    return { id: 1, type: 'TEAM', title: 'Team Chat', unreadCount: 0 };
  });

  const activeConversationRef = useRef<ConversationItem | null>(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const isDirect = Boolean(
    activeConversation && (
      activeConversation.type === 'DIRECT' ||
      Boolean(activeConversation.targetUserId) ||
      Boolean(activeConversation.user) ||
      (activeConversation.id !== null && activeConversation.id !== 1)
    )
  );

  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<string>('');
  const [isEditingPinned, setIsEditingPinned] = useState(false);
  const [pinnedEditValue, setPinnedEditValue] = useState('');

  const filteredDirect = React.useMemo(() => {
    // Omit Admin-only accounts and suspended staff from the private chat list; keep staff accounts including those with canSwitchAdmin
    const eligibleDirect = (conversations.direct || []).filter(c => {
      const isRoleAdmin = c.user?.role === 'ADMIN';
      const canSwitch = Boolean(c.user?.canSwitchAdmin || (c.user as any)?.can_switch_admin);
      const isSuspended = c.user?.status === 'SUSPENDED' || (c.user as any)?.status?.toUpperCase() === 'SUSPENDED';
      return (!isRoleAdmin || canSwitch) && !isSuspended;
    });

    if (!searchQuery.trim()) return eligibleDirect;
    const q = searchQuery.toLowerCase().trim();
    return eligibleDirect.filter(c => {
      const name = `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.toLowerCase();
      const pos = formatStaffPositions(c.user?.primaryPosition, c.user?.additionalPositions, c.user?.role).toLowerCase();
      return name.includes(q) || pos.includes(q);
    });
  }, [conversations.direct, searchQuery]);

  const [newMessage, setNewMessage] = useState('');
  const [selectedGif, setSelectedGif] = useState<any>(null);
  const [quotedMessages, setQuotedMessages] = useState<ChatMessage[]>([]);
  const [gifSearch, setGifSearch] = useState('');
  const [debouncedGifSearch, setDebouncedGifSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGifSearch(gifSearch), 500);
    return () => clearTimeout(timer);
  }, [gifSearch]);

  const [attachments, setAttachments] = useState<globalThis.File[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const giphyButtonRef = useRef<HTMLButtonElement>(null);
  const giphyPickerRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);

  const [inlineEditMessageId, setInlineEditMessageId] = useState<number | null>(null);
  const [inlineEditContent, setInlineEditContent] = useState('');

  const [reactionPicker, setReactionPicker] = useState<{msgId: number, position: 'up' | 'down'} | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userNamesMap, setUserNamesMap] = useState<Record<number, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const typingThrottleRef = useRef<boolean>(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) && (!emojiButtonRef.current || !emojiButtonRef.current.contains(event.target as Node))) {
        setShowEmojiPicker(false);
      }
      if (giphyPickerRef.current && !giphyPickerRef.current.contains(event.target as Node) && (!giphyButtonRef.current || !giphyButtonRef.current.contains(event.target as Node))) {
        setShowGiphyPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('/api/users/names', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(users => {
        if (Array.isArray(users)) {
          const map: Record<number, string> = {};
          users.forEach(u => map[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim());
          setUserNamesMap(map);
        }
      })
      .catch(console.error);

    fetch('/api/chat/online-users', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.onlineUserIds)) {
          setOnlineUsers(new Set(data.onlineUserIds));
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (selectedGif || attachments.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedGif, attachments]);

  const scrollToBottom = (instant = false, force = false) => {
    const shouldScroll = () => {
      if (instant || force) return true;
      const container = scrollContainerRef.current;
      if (container) {
        return container.scrollHeight - container.scrollTop - container.clientHeight < 250;
      }
      return true;
    };

    if (!shouldScroll()) return;

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }, 100);
    setTimeout(() => {
      if (!shouldScroll()) return;
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }, 500);
  };

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/conversations?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.team && Array.isArray(data.direct)) {
          setConversations(data);
          // Sync activeConversation details if present
          if (activeConversationRef.current) {
            const curr = activeConversationRef.current;
            if (curr.type === 'TEAM' || curr.id === 1) {
              setActiveConversation(prev => prev ? { ...prev, unreadCount: data.team.unreadCount } : prev);
            } else if (curr.targetUserId) {
              const matched = data.direct.find((d: any) => d.targetUserId === curr.targetUserId);
              if (matched) {
                setActiveConversation(prev => prev ? {
                  ...prev,
                  id: matched.id || prev.id,
                  type: 'DIRECT',
                  unreadCount: matched.unreadCount,
                  user: matched.user || prev.user
                } : prev);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, [token]);

  const fetchMessages = useCallback((convId?: number) => {
    if (!token) return;
    const targetConvId = convId !== undefined ? convId : activeConversationRef.current?.id;
    if (!targetConvId) return;

    fetch(`/api/chat/messages?conversation_id=${targetConvId}&_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          setTimeout(() => scrollToBottom(false), 50);
        }
      })
      .catch(err => console.error("Failed to load messages", err));
  }, [token]);

  const markRead = useCallback((convId?: number) => {
    if (!token || document.hidden) return;
    const targetConvId = convId !== undefined ? convId : activeConversationRef.current?.id;
    if (!targetConvId) return;

    fetch('/api/chat/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ conversation_id: targetConvId })
    })
      .then(res => res.json())
      .then(data => {
        if (typeof data.remainingUnread === 'number') {
          window.dispatchEvent(new CustomEvent('chat_read', { detail: { remainingUnread: data.remainingUnread } }));
        } else {
          window.dispatchEvent(new CustomEvent('chat_read'));
        }
        setConversations(prev => {
          if (targetConvId === 1) {
            return { ...prev, team: { ...prev.team, unreadCount: 0 } };
          }
          return {
            ...prev,
            direct: prev.direct.map(d => d.id === targetConvId ? { ...d, unreadCount: 0 } : d)
          };
        });
      })
      .catch(console.error);
  }, [token]);

  const fetchTyping = useCallback((convId?: number) => {
    if (!token) return;
    const targetConvId = convId !== undefined ? convId : activeConversationRef.current?.id;
    if (!targetConvId) return;

    fetch(`/api/chat/typing?conversation_id=${targetConvId}&_t=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.typingUsers) {
          setTypingUsers(data.typingUsers);
        }
      })
      .catch(() => {});
  }, [token]);

  // Initial and socket connections
  useEffect(() => {
    fetchConversations();

    fetch('/api/chat/pinned-message', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPinnedMessage(data.message || ''))
      .catch(console.error);

    if (activeConversationRef.current?.id) {
      fetchMessages(activeConversationRef.current.id);
      markRead(activeConversationRef.current.id);
      fetchTyping(activeConversationRef.current.id);
    }

    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversationRef.current?.id) {
        fetchMessages(activeConversationRef.current.id);
        markRead(activeConversationRef.current.id);
        fetchTyping(activeConversationRef.current.id);
      }
    }, 2500);

    const newSocket = io(window.location.origin, {
      path: '/socket.io'
    });
    setSocket(newSocket);

    if (user?.id) {
      newSocket.emit('user_online', user.id);
    }

    newSocket.on('online_users', (ids: number[]) => {
      setOnlineUsers(new Set(ids));
    });

    newSocket.on('chat_message_edited', (msg: ChatMessage) => {
      const activeConvId = activeConversationRef.current?.id || 1;
      if ((msg.conversation_id || 1) === activeConvId) {
        setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
      }
    });

    newSocket.on('message_reaction', ({ messageId, reactions, conversation_id }: { messageId: number, reactions: any, conversation_id?: number }) => {
      const activeConvId = activeConversationRef.current?.id || 1;
      if (!conversation_id || conversation_id === activeConvId) {
        setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, reactions: JSON.stringify(reactions) } : m));
      }
    });

    newSocket.on('chat_pinned_message_updated', ({ message }: { message: string }) => {
      setPinnedMessage(message);
    });

    newSocket.on('chat_cleared', (data: any) => {
      const activeConvId = activeConversationRef.current?.id || 1;
      const clearedConvId = data?.conversation_id || 1;
      if (clearedConvId === activeConvId) {
        setMessages([]);
        markRead(activeConvId);
      }
      fetchConversations();
    });

    newSocket.on('chat_typing_update', (active: {userId: number, userName: string, conversationId?: number}[]) => {
      const activeConvId = activeConversationRef.current?.id || 1;
      const others = active
        .filter(u => u.userId !== user?.id && (u.conversationId || 1) === activeConvId)
        .map(u => u.userName);
      setTypingUsers(others);
    });

    newSocket.on('chat_read_by_user', () => {
      fetchConversations();
    });

    newSocket.on('new_message', (msg: any) => {
      fetchConversations();
      const currentActive = activeConversationRef.current;
      const currentActiveId = currentActive?.id;
      const msgConvId = msg.conversation_id || 1;

      if (currentActive && (msgConvId === currentActiveId || (!currentActiveId && currentActive.type === 'DIRECT' && msg.participant_ids?.includes(currentActive.targetUserId)))) {
        markRead(msgConvId);
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const hasOptimistic = prev.some(m => m.user_id === msg.user_id && m.content === msg.content && m.id > 1000000000000);
          if (hasOptimistic) {
            return prev.map(m => (m.user_id === msg.user_id && m.content === msg.content && m.id > 1000000000000) ? msg : m);
          }
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(false, true), 100);
      }
    });

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  // When active conversation changes, reset messages and load
  useEffect(() => {
    if (!token) return;
    if (!activeConversation) {
      setMessages([]);
      return;
    }
    if (activeConversation.id) {
      fetchMessages(activeConversation.id);
      markRead(activeConversation.id);
      fetchTyping(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?.id, activeConversation?.type, activeConversation?.targetUserId, token]);

  const handleSelectConversation = async (conv: ConversationItem) => {
    if (conv.type === 'TEAM' || conv.id === 1) {
      const teamItem: ConversationItem = { id: 1, type: 'TEAM', title: 'Team Chat', unreadCount: 0 };
      setActiveConversation(teamItem);
      return;
    }

    // Direct chat
    if (conv.id) {
      setActiveConversation({ ...conv, type: 'DIRECT', unreadCount: 0 });
    } else {
      // Optimistically switch to direct conversation view with staff info immediately
      const initialItem: ConversationItem = { ...conv, type: 'DIRECT', unreadCount: 0 };
      setActiveConversation(initialItem);

      try {
        const res = await fetch('/api/chat/conversations/direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUserId: conv.targetUserId })
        });
        const data = await res.json();
        if (data.conversationId) {
          const updated: ConversationItem = { ...initialItem, id: data.conversationId };
          setConversations(prev => ({
            ...prev,
            direct: prev.direct.map(d => d.targetUserId === conv.targetUserId ? updated : d)
          }));
          setActiveConversation(updated);
        }
      } catch (e) {
        console.error("Failed to start direct conversation", e);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
      scrollToBottom();
    }
    
    const convId = activeConversation?.id || (isDirect ? null : 1);
    if (convId && !typingThrottleRef.current) {
      typingThrottleRef.current = true;
      fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isTyping: true, userName: `${user?.firstName} ${user?.lastName}`.trim() || 'User', conversation_id: convId })
      }).catch(() => {});
      setTimeout(() => { typingThrottleRef.current = false; }, 1500);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (convId) {
      typingTimeoutRef.current = setTimeout(() => {
        fetch('/api/chat/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ isTyping: false, conversation_id: convId })
        }).catch(() => {});
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    const filesToAdd: globalThis.File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          filesToAdd.push(file);
        }
      }
    }

    if (filesToAdd.length > 0) {
      e.preventDefault();
      setAttachments(prev => [...prev, ...filesToAdd]);
    }
  }, []);
  
  const isOnlyEmojis = (text: string) => {
    if (!text || text.trim().length === 0) return false;
    const stripped = text.replace(/[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\uFE0F\u200D\s\u200B-\u200D\uFEFF]/gu, '');
    return stripped.length === 0;
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.native);
  };

  const onGifClick = (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => {
    e.preventDefault();
    setSelectedGif(gif);
    setShowGiphyPicker(false);
  };

  const fetchGifs = (offset: number) => debouncedGifSearch ? gf.search(debouncedGifSearch, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });

  const handleQuote = (msg: ChatMessage) => {
    setQuotedMessages(prev => [...prev, msg]);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleSaveEdit = async (msgId: number) => {
    if (!inlineEditContent.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: inlineEditContent.trim() })
      });
      if (res.ok) {
        setInlineEditMessageId(null);
        setInlineEditContent('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        alert("Failed to delete message. You may not have permission.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReaction = async (messageId: number, emoji: string) => {
    setHoveredMessageId(null);
    setReactionPicker(null);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: JSON.stringify(data.reactions) };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const savePinnedMessage = async () => {
    try {
      const res = await fetch('/api/chat/pinned-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: pinnedEditValue })
      });
      if (res.ok) {
        setIsEditingPinned(false);
        setPinnedMessage(pinnedEditValue);
      } else {
        alert("Failed to save pinned message. You may not be an admin.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  useEffect(() => {
    if (typingUsers.length > 0) {
      scrollToBottom();
    }
  }, [typingUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0 && !selectedGif && quotedMessages.length === 0) || !user || isUploading) return;

    let convId = activeConversation?.id;

    // If direct conversation without an id yet, ensure it is created before sending
    if (isDirect && !convId && activeConversation?.targetUserId) {
      try {
        const res = await fetch('/api/chat/conversations/direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ targetUserId: activeConversation.targetUserId })
        });
        const d = await res.json();
        if (d.conversationId) {
          convId = d.conversationId;
          setActiveConversation(prev => prev ? { ...prev, id: convId, type: 'DIRECT' } : prev);
        }
      } catch (err) {
        console.error("Failed to ensure direct conversation exists", err);
      }
    }

    if (!convId) {
      convId = isDirect ? null : 1;
    }

    if (!convId) {
      console.error("No valid conversation ID for sending message");
      return;
    }

    let content = newMessage.trim();
    if (quotedMessages.length > 0) {
      const quotePrefix = quotedMessages.map(qMsg => {
        let contentToQuote = qMsg.content || '';
        if (!contentToQuote && qMsg.file_url) {
          contentToQuote = `[${qMsg.file_name || 'Attachment'}]`;
        } else {
          contentToQuote = contentToQuote.split('\n').filter(line => !line.startsWith('> ')).join(' ').trim();
          if (!contentToQuote) contentToQuote = '[Attachment]';
        }
        return `> ${qMsg.first_name}: ${contentToQuote}\n\n`;
      }).join('');
      content = quotePrefix + content;
      setQuotedMessages([]);
    }
    
    if (selectedGif) {
      content += (content ? '\n\n' : '') + selectedGif.images.fixed_height.url;
    }

    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/files?folderPath=/Chat', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (data.success && data.id) {
            const fileUrl = `/api/files/download/${data.id}?preview=true`;
            const fileName = file.name;
            const fileType = file.type;

            const tempId = Date.now() + i;
            if (content !== '/clear') {
              const tempMessage = {
                id: tempId,
                user_id: user.id,
                content: i === 0 ? content : '',
                created_at: new Date().toISOString(),
                first_name: user.firstName,
                last_name: user.lastName,
                avatar_url: user.avatarUrl || null,
                file_url: fileUrl,
                file_name: fileName,
                file_type: fileType,
                conversation_id: convId
              };

              setMessages(prev => [...prev, tempMessage as any]);
              setTimeout(() => scrollToBottom(false, true), 50);
            }

            try {
              const res2 = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  content: i === 0 ? content : '',
                  file_url: fileUrl,
                  file_name: fileName,
                  file_type: fileType,
                  conversation_id: convId
                })
              });
              if (res2.ok) {
                const realMsg = await res2.json();
                if (content !== '/clear') {
                  setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
                }
                fetchConversations();
              }
            } catch (e) {
              console.error("Failed to send message via API", e);
            }
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
        setAttachments([]);
      }
    } else if (content || selectedGif) {
      const tempId = Date.now();
      if (content !== '/clear') {
        const tempMessage = {
          id: tempId,
          user_id: user.id,
          content,
          created_at: new Date().toISOString(),
          first_name: user.firstName,
          last_name: user.lastName,
          avatar_url: user.avatarUrl || null,
          file_url: null,
          file_name: null,
          file_type: null,
          conversation_id: convId
        };

        setMessages(prev => [...prev, tempMessage as any]);
        setTimeout(() => scrollToBottom(false, true), 50);
      }

      try {
        const res = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            file_url: null,
            file_name: null,
            file_type: null,
            conversation_id: convId
          })
        });
        if (res.ok) {
          const realMsg = await res.json();
          if (content !== '/clear') {
            setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
          }
          fetchConversations();
        }
      } catch (e) {
        console.error("Failed to send message via API", e);
      }
    }

    setNewMessage('');
    setSelectedGif(null);
    setQuotedMessages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ isTyping: false, conversation_id: convId })
    }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const parseChatDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    let safeStr = dateStr;
    if (!safeStr.includes('T')) safeStr = safeStr.replace(' ', 'T');
    if (!safeStr.endsWith('Z') && !safeStr.match(/[+-]\d{2}:?\d{2}$/)) {
      safeStr += 'Z';
    }
    return new Date(safeStr);
  };

  // Render Conversations Sidebar / List
  const renderConversationsList = () => (
    <div className="flex flex-col h-full min-h-0 bg-brand-navy/60 border-r border-border-subtle">
      {/* Search Header */}
      <div className="p-3 border-b border-border-subtle shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-8 pr-7 py-1.5 bg-black/30 border border-border-subtle rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {/* Team Chat Channel */}
        <button
          type="button"
          onClick={() => handleSelectConversation(conversations.team)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
            !isDirect && activeConversation?.id === 1
              ? 'bg-brand-teal/20 border border-brand-teal/40 text-white shadow-sm'
              : 'hover:bg-white/5 text-zinc-200 border border-transparent'
          }`}
        >
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/30 flex items-center justify-center font-bold">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                Team Chat
              </span>
              {conversations.team.unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-emerald-500 rounded-full shadow animate-pulse">
                  {conversations.team.unreadCount > 99 ? '99+' : conversations.team.unreadCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {conversations.team.lastMessage ? (
                `${conversations.team.lastMessage.first_name}: ${conversations.team.lastMessage.content || 'Attachment'}`
              ) : (
                'Company-wide discussion'
              )}
            </p>
          </div>
        </button>

        {/* Section Divider */}
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
          <span>Direct Messages</span>
          <span className="text-zinc-600 font-mono text-[9px]">{filteredDirect.length}</span>
        </div>

        {/* Direct Conversations with Staff */}
        {filteredDirect.map(c => {
          const isTargetOnline = c.targetUserId ? onlineUsers.has(c.targetUserId) : false;
          const isSelected = isDirect && activeConversation?.targetUserId === c.targetUserId;
          return (
            <button
              key={c.targetUserId}
              type="button"
              onClick={() => handleSelectConversation(c)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-brand-teal/20 border border-brand-teal/40 text-white shadow-sm'
                  : 'hover:bg-white/5 text-zinc-200 border border-transparent'
              }`}
            >
              <div className="relative shrink-0">
                {c.user?.avatarUrl ? (
                  <img
                    src={c.user.avatarUrl.startsWith('http') ? c.user.avatarUrl : `${window.location.origin}${c.user.avatarUrl}`}
                    alt={c.user.firstName}
                    className="w-8 h-8 rounded-full object-cover bg-brand-navy border border-border-subtle"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${c.user?.firstName}+${c.user?.lastName}&background=0D8B93&color=fff`;
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
                    {c.user?.firstName?.charAt(0) || <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
                {/* Online indicator dot */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#11161d] ${
                    isTargetOnline ? 'bg-emerald-400 ring-1 ring-emerald-500' : 'bg-zinc-600'
                  }`}
                  title={isTargetOnline ? 'Online' : 'Offline'}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                    {c.user?.firstName} {c.user?.lastName}
                    {(c.user?.role === 'ADMIN' || c.user?.canSwitchAdmin) && (
                      <span className="px-1 py-0.2 text-[9px] bg-brand-teal/20 text-brand-teal rounded font-medium">Admin</span>
                    )}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-emerald-500 rounded-full shadow animate-pulse">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[11px] text-zinc-400 truncate" title={formatStaffPositions(c.user?.primaryPosition, c.user?.additionalPositions, c.user?.role)}>
                    {formatStaffPositions(c.user?.primaryPosition, c.user?.additionalPositions, c.user?.role)}
                  </p>
                  {isTargetOnline && (
                    <span className="text-[9px] text-emerald-400 font-medium shrink-0 ml-1">
                      Online
                    </span>
                  )}
                </div>
                {c.lastMessage && (
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {c.lastMessage.content || 'Attachment'}
                  </p>
                )}
              </div>
            </button>
          );
        })}

        {filteredDirect.length === 0 && (
          <div className="text-center py-6 text-xs text-zinc-500">
            No staff found
          </div>
        )}
      </div>
    </div>
  );

  // Render Conversation View (header, pinned, messages, input)
  const renderConversationView = () => {
    const targetUser = activeConversation?.user;
    const isTargetOnline = activeConversation?.targetUserId ? onlineUsers.has(activeConversation.targetUserId) : false;

    return (
      <div 
        className="flex-1 flex flex-col overflow-hidden min-h-0 relative"
        style={{ backgroundColor: settings?.chatBackgroundTint || '#11161d' }}
      >
        {/* Background Media */}
        {settings?.chatBackgroundImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            {(() => {
              const srcWithToken = settings.chatBackgroundImage.startsWith('/api/files/download') 
                ? `${settings.chatBackgroundImage}${settings.chatBackgroundImage.includes('?') ? '&' : '?'}token=${token}`
                : settings.chatBackgroundImage;
              return settings.chatBackgroundImage.match(/\.(mp4|webm|ogg)$/i) ? (
                <video 
                  src={srcWithToken} 
                  className="w-full h-full object-cover" 
                  autoPlay loop muted playsInline 
                  style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
                />
              ) : (
                <img 
                  src={srcWithToken} 
                  alt="Chat Background" 
                  className="w-full h-full object-cover"
                  style={{ opacity: (parseInt(settings.chatBackgroundOpacity || '100') / 100) }}
                />
              );
            })()}
          </div>
        )}

        {/* Conversation Header */}
        <div className="relative z-20 px-3 py-2.5 md:px-4 bg-[#161b22]/95 border-b border-border-subtle flex items-center justify-between shadow-sm backdrop-blur-md">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Back button for mobile widget or mobile screen */}
            {(isMini || isMobileScreen) && (
              <button
                type="button"
                onClick={() => setActiveConversation(null)}
                className="p-1.5 -ml-1 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors flex items-center gap-1 shrink-0"
                title="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4 text-brand-teal" />
                <span className="text-xs font-semibold">Chats</span>
              </button>
            )}

            {isDirect ? (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  {targetUser?.avatarUrl ? (
                    <img 
                      src={targetUser.avatarUrl.startsWith('http') ? targetUser.avatarUrl : `${window.location.origin}${targetUser.avatarUrl}`} 
                      alt={targetUser.firstName} 
                      className="w-8 h-8 rounded-full object-cover bg-brand-navy border border-border-subtle" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${targetUser?.firstName}+${targetUser?.lastName}&background=0D8B93&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
                      {targetUser?.firstName?.charAt(0) || <UserIcon className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <span 
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161b22] ${
                      isTargetOnline ? 'bg-emerald-400 ring-1 ring-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs md:text-sm font-bold text-white truncate">
                      {targetUser?.firstName} {targetUser?.lastName}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold bg-brand-teal/20 text-brand-teal rounded border border-brand-teal/30 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Direct
                    </span>
                    {(targetUser?.role === 'ADMIN' || targetUser?.canSwitchAdmin) && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded font-semibold shrink-0">Admin</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                    <span>{formatStaffPositions(targetUser?.primaryPosition, targetUser?.additionalPositions, targetUser?.role)}</span>
                    <span>•</span>
                    <span className={isTargetOnline ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                      {isTargetOnline ? 'Active now' : 'Offline'}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/30 flex items-center justify-center font-bold shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs md:text-sm font-bold text-white truncate flex items-center gap-1">
                    Team Chat
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate">
                    Company-wide Channel • {onlineUsers.size} online
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Clear conversation action */}
            {(!isDirect || user?.role === 'ADMIN') && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(isDirect ? `Clear chat history with ${targetUser?.firstName || 'this staff member'}?` : "Clear company-wide Team Chat?")) {
                    handleSendMessage({ preventDefault: () => {} } as any);
                    fetch('/api/chat/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ content: '/clear', conversation_id: activeConversation?.id || 1 })
                    }).then(() => fetchMessages(activeConversation?.id || 1)).catch(console.error);
                  }
                }}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Pinned Message (Team Chat Only) */}
        {!isDirect && (pinnedMessage || user?.role === 'ADMIN') && (
          <div className="relative z-20 bg-brand-teal/10 border-b border-brand-teal/20 px-3 py-2 md:px-4 flex items-start justify-between text-sm shadow-md backdrop-blur-sm">
            <div className="flex items-start space-x-2 flex-1 min-w-0">
              {user?.role === 'ADMIN' && <span className="text-brand-teal font-semibold shrink-0 mt-1 md:mt-0"><span className="hidden sm:inline">📌</span> Pinned:</span>}
              {isEditingPinned ? (
                <textarea
                  value={pinnedEditValue}
                  onChange={e => setPinnedEditValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      savePinnedMessage();
                    }
                  }}
                  className="flex-1 bg-black/40 border border-brand-teal/30 rounded px-2 py-1 text-zinc-200 outline-none focus:border-brand-teal/70 min-h-[32px] resize-none"
                  autoFocus
                  rows={1}
                />
              ) : (
                <span className="text-zinc-200 pr-2 break-words mt-1 md:mt-0" title={pinnedMessage || "No pinned message"}>
                  {pinnedMessage || <span className="text-zinc-500 italic">No pinned message</span>}
                </span>
              )}
            </div>
            {user?.role === 'ADMIN' && (
              <div className="flex items-center space-x-1 shrink-0 ml-2 mt-0.5 md:mt-0">
                {isEditingPinned ? (
                  <>
                    <button onClick={savePinnedMessage} className="p-1.5 rounded hover:bg-brand-teal/20 text-brand-teal" title="Save">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditingPinned(false)} className="p-1.5 rounded hover:bg-black/20 text-zinc-400" title="Cancel">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => { setPinnedEditValue(pinnedMessage); setIsEditingPinned(true); }}
                    className="p-1.5 rounded hover:bg-black/20 text-zinc-400 hover:text-brand-teal transition-colors"
                    title="Edit pinned message"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-4 relative z-10">

          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 py-6 text-xs md:text-sm">
              {isDirect ? `No previous messages. Say hello to ${targetUser?.firstName || 'staff'}!` : 'No messages yet. Start the conversation!'}
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = Number(user?.id) === Number(msg.user_id);
              const nonQuotedText = msg.content.split('\n').filter(line => !line.startsWith('> ')).join('\n').trim();
              const hasQuote = msg.content.includes('> ');
              const isEmojiOnly = isOnlyEmojis(nonQuotedText) && !msg.file_url && nonQuotedText.length > 0 && !hasQuote;
              
              const contentToRender = (
                <div className="prose prose-sm prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 max-w-none text-zinc-100">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, ...props}) => {
                        const href = props.href || '';
                        if (href && (href.includes('giphy.com') || href.match(/\.(gif|jpe?g|png)$/i))) {
                          return <img src={href} alt="gif" className="max-w-[200px] rounded my-1 block" onLoad={() => scrollToBottom()} />;
                        }
                        return <a {...props} className="text-brand-teal hover:underline break-words" target="_blank" rel="noopener noreferrer" />;
                      },
                      blockquote: ({node, ...props}) => {
                        return (
                          <blockquote className="pl-3 py-1 my-1 border-l-[3px] border-brand-teal/50 bg-black/10 text-zinc-300 italic text-[11px] md:text-xs rounded-r-md overflow-hidden max-w-full">
                            {props.children}
                          </blockquote>
                        );
                      },
                      p: ({node, ...props}) => <p className="whitespace-pre-wrap break-words" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>
              );
              
              return (
                <div key={msg.id} className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex ${!msg.file_url ? 'w-full max-w-full' : 'max-w-[85%] md:max-w-[70%]'} min-w-0 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-2.5' : 'mr-2.5'}`}>
                      {msg.avatar_url ? (
                        <img 
                          src={msg.avatar_url.startsWith('http') ? msg.avatar_url : `${window.location.origin}${msg.avatar_url}`} 
                          alt={msg.first_name} 
                          className="w-6 h-6 rounded-full object-cover bg-brand-navy border border-border-subtle" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${msg.first_name}+${msg.last_name}&background=0D8B93&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-xs border border-brand-teal/30">
                          {msg.first_name?.charAt(0) || <UserIcon className="w-3.5 h-3.5" />}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div 
                      className={`flex flex-col min-w-0 ${!msg.file_url ? 'max-w-full' : 'max-w-full'} ${isOwnMessage ? 'items-end' : 'items-start'} relative`}
                    >
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {msg.first_name} {msg.last_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis">
                          {new Intl.DateTimeFormat('en-US', { timeZone: settings?.timezone || 'Australia/Perth', hour: 'numeric', minute: 'numeric', hour12: true }).format(parseChatDate(msg.created_at))}
                        </span>
                      </div>
                      
                      <div 
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        className="relative max-w-full flex flex-col"
                      >
                        <div 
                          onClick={() => setHoveredMessageId(prev => prev === msg.id ? null : msg.id)}
                          className={`rounded-lg font-normal tracking-wide break-words max-w-full cursor-default ${
                            isEmojiOnly
                              ? 'text-5xl md:text-7xl py-1 leading-normal overflow-visible'
                              : `px-3.5 py-2 text-xs overflow-hidden ${isOwnMessage 
                                ? 'bg-brand-teal/15 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-none' 
                                : 'bg-brand-navy text-[#8B949E] border border-border-subtle rounded-tl-none'}`
                          }`}
                        >
                          {msg.file_url && (
                            <div className="mb-2">
                              {msg.file_type?.startsWith('image/') ? (
                                <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="text-left w-full">
                                  <img src={`${msg.file_url}&token=${token}`} alt="attachment" className="max-w-full max-h-[200px] rounded object-cover cursor-pointer hover:opacity-90 border border-black/20" onLoad={() => scrollToBottom()} />
                                </button>
                              ) : isVideoAttachment(msg.file_type, msg.file_name, msg.file_url) ? (
                                <ChatVideoPlayer
                                  url={`${msg.file_url}&token=${token}`}
                                  fileName={msg.file_name || 'Video'}
                                  onExpand={() => setPreviewFile({ url: msg.file_url!, type: msg.file_type || 'video/mp4', name: msg.file_name || 'Video' })}
                                  onLoaded={() => scrollToBottom()}
                                />
                              ) : (
                                <button type="button" onClick={() => setPreviewFile({url: msg.file_url!, type: msg.file_type!, name: msg.file_name!})} className="flex items-center space-x-2 p-2 bg-black/20 rounded cursor-pointer hover:bg-black/30 w-full text-left">
                                  <File className="w-4 h-4 flex-shrink-0" />
                                  <span className="underline truncate max-w-[150px]">{msg.file_name || 'Document'}</span>
                                </button>
                              )}
                            </div>
                          )}
                          {inlineEditMessageId === msg.id ? (
                            <div className="flex flex-col space-y-2 mt-1 min-w-[200px]" onClick={e => e.stopPropagation()}>
                              <textarea 
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-teal resize-none"
                                value={inlineEditContent}
                                onChange={e => setInlineEditContent(e.target.value)}
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end space-x-2">
                                <button onClick={() => { setInlineEditMessageId(null); setInlineEditContent(''); }} className="px-3 py-1 bg-black/30 hover:bg-black/50 text-zinc-300 text-xs rounded transition-colors">Cancel</button>
                                <button onClick={() => handleSaveEdit(msg.id)} className="px-3 py-1 bg-brand-teal hover:bg-brand-teal/80 text-black font-medium text-xs rounded transition-colors">Save</button>
                              </div>
                            </div>
                          ) : (
                            <span>{contentToRender}</span>
                          )}
                          {msg.is_edited ? <span className="text-[9px] opacity-50 ml-2 italic">(edited)</span> : null}
                        </div>
                      
                        {(hoveredMessageId === msg.id || reactionPicker?.msgId === msg.id) && (
                          <div className={`absolute -top-10 ${isOwnMessage ? 'right-0' : 'left-0'} bg-[#1c2128] border border-border-subtle rounded-lg px-2 py-1.5 flex items-center space-x-2 shadow-xl z-[60] after:content-[''] after:absolute after:-bottom-4 after:left-0 after:right-0 after:h-4`}>
                            <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '👍'); }} className="hover:scale-125 transition-transform text-base">👍</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '❤️'); }} className="hover:scale-125 transition-transform text-base">❤️</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😂'); }} className="hover:scale-125 transition-transform text-base">😂</button>
                            <button onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, '😮'); }} className="hover:scale-125 transition-transform text-base">😮</button>
                            
                            <div className="relative" ref={reactionPickerRef}>
                              <button onClick={(e) => { 
                                e.stopPropagation(); 
                                if (reactionPicker?.msgId === msg.id) {
                                  setReactionPicker(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const position = rect.top > window.innerHeight / 2 ? 'up' : 'down';
                                  setReactionPicker({ msgId: msg.id, position });
                                }
                              }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center">
                                <MoreHorizontal className="w-3 h-3" />
                              </button>
                              {reactionPicker?.msgId === msg.id && (
                                <>
                                  <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setReactionPicker(null); }} />
                                  <div className={`absolute z-[100] shadow-2xl ${reactionPicker.position === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${isOwnMessage ? 'right-0' : 'left-0'}`} onClick={e => e.stopPropagation()}>
                                    <Picker data={data} onEmojiSelect={(emoji: any) => { handleAddReaction(msg.id, emoji.native); setReactionPicker(null); }} theme="dark" />
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="w-[1px] h-4 bg-border-subtle mx-1" />
                            
                            {(isOwnMessage || user?.role === 'ADMIN') && (
                              <button onClick={(e) => { e.stopPropagation(); setInlineEditContent(msg.content); setInlineEditMessageId(msg.id); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Edit">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}

                            <button onClick={(e) => { e.stopPropagation(); handleQuote(msg); }} className="hover:scale-125 transition-transform text-zinc-400 hover:text-white bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Quote">
                              <Quote className="w-3 h-3" />
                            </button>
                            
                            {(isOwnMessage || user?.role === 'ADMIN') && (
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="hover:scale-125 transition-transform text-red-400 hover:text-red-300 bg-white/5 rounded-full w-5 h-5 flex items-center justify-center" title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        
                        {(() => {
                          try {
                            let reactions = {};
                            try {
                              const parsed = msg.reactions ? JSON.parse(msg.reactions) : {};
                              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                                reactions = parsed;
                              }
                            } catch (e) {}
                            const reactionEntries = Object.entries(reactions) as [string, number[]][];
                            if (reactionEntries.length === 0) return null;
                            
                            return (
                              <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                {reactionEntries.map(([emoji, users]) => {
                                  const hasReacted = users.includes(user?.id);
                                  const reactorNames = users.map(uid => userNamesMap[uid] || 'Unknown').join(', ');
                                  return (
                                    <button
                                      key={emoji}
                                      title={reactorNames}
                                      onClick={(e) => { e.stopPropagation(); handleAddReaction(msg.id, emoji); }}
                                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs border ${hasReacted ? 'bg-brand-teal/20 border-brand-teal text-brand-teal' : 'bg-black/20 border-border-subtle text-zinc-400 hover:bg-black/40'}`}
                                    >
                                      <span className="text-[13px]">{emoji}</span>
                                      <span className="text-[10px] font-semibold">{users.length}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          } catch(e) {
                            return null;
                          }
                        })()}

                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 bg-[#11161d]/95 backdrop-blur-md shrink-0 flex items-center space-x-2 text-xs text-brand-teal italic z-20 border-t border-white/[0.05] shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.5)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="animate-pulse truncate max-w-full">
              {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.join(', ')} are typing...`}
            </span>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 md:p-4 bg-[#11161d]/90 backdrop-blur-md border-t border-border-subtle shrink-0 relative z-10">
          <div className="flex flex-col space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 max-h-32 overflow-y-auto">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-brand-navy p-2 rounded-lg border border-border-subtle max-w-[200px]">
                    <div className="bg-brand-bg p-1.5 rounded shrink-0">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-brand-teal" />
                      ) : isVideoAttachment(file.type, file.name) ? (
                        <Video className="w-4 h-4 text-purple-400" />
                      ) : (
                        <File className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 truncate text-xs text-zinc-300">
                      {file.name}
                    </div>
                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-white shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {quotedMessages.length > 0 && (
              <div className="flex flex-col space-y-1 mb-2 max-h-32 overflow-y-auto">
                {quotedMessages.map((qMsg) => (
                  <div key={qMsg.id} className="flex items-center justify-between bg-black/30 border-l-[3px] border-brand-teal/60 rounded-r p-2 text-xs text-zinc-300">
                    <div className="truncate flex-1 pr-2">
                      <span className="font-semibold text-brand-teal mr-1">{qMsg.first_name}:</span>
                      <span className="italic">{qMsg.content ? qMsg.content.split('\n').filter(l => !l.startsWith('> ')).join(' ') : (qMsg.file_name ? `[${qMsg.file_name}]` : '[Attachment]')}</span>
                    </div>
                    <button type="button" onClick={() => setQuotedMessages(quotedMessages.filter(m => m.id !== qMsg.id))} className="text-zinc-500 hover:text-white shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedGif && (
              <div className="relative inline-block mb-2 max-w-[200px]">
                <img src={selectedGif.images.fixed_height.url} alt="selected gif" className="rounded border border-border-subtle" />
                <button type="button" onClick={() => setSelectedGif(null)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} onPaste={handlePaste} className="flex items-end space-x-2">
              <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.length) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" multiple />
              <input type="file" ref={cameraInputRef} accept="image/*,video/*" capture="environment" onChange={(e) => { if (e.target.files?.length) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" />

              <div className="flex-1 bg-black/20 border border-border-subtle rounded-lg flex flex-col focus-within:border-brand-teal transition-colors">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isDirect ? `Message ${targetUser?.firstName || 'staff'}...` : "Message #Team-Chat..."}
                  rows={1}
                  className="w-full bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none resize-none max-h-48 overflow-y-auto"
                />

                <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5 border-t border-white/[0.05]">
                  <div className="flex items-center space-x-1">
                    {/* Mobile: Plus Button for Attachment Menu */}
                    <div className="relative lg:hidden">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                        title="Add..."
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {showAttachmentMenu && (
                        <>
                          <div className="fixed inset-0 z-[80]" onClick={() => setShowAttachmentMenu(false)} />
                          <div className="absolute bottom-full left-0 mb-2 w-44 bg-[#1c2128] border border-border-subtle rounded-lg shadow-xl z-[90] flex flex-col py-1 animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => { setShowAttachmentMenu(false); setShowGiphyPicker(true); }}
                              className="flex items-center space-x-3 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white w-full text-left"
                            >
                              <Sticker className="w-4 h-4 text-brand-teal" /> <span>GIFs</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(true); }}
                              className="flex items-center space-x-3 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white w-full text-left"
                            >
                              <Smile className="w-4 h-4 text-brand-teal" /> <span>Emojis</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAttachmentMenu(false); cameraInputRef.current?.click(); }}
                              className="flex items-center space-x-3 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white w-full text-left"
                            >
                              <Camera className="w-4 h-4 text-brand-teal" /> <span>Camera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAttachmentMenu(false); fileInputRef.current?.click(); }}
                              className="flex items-center space-x-3 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white w-full text-left"
                            >
                              <Paperclip className="w-4 h-4 text-brand-teal" /> <span>Document</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Desktop: Full Icons */}
                    <div className="hidden lg:flex items-center space-x-1">
                      <button 
                        ref={giphyButtonRef}
                        type="button" 
                        onClick={() => { setShowGiphyPicker(!showGiphyPicker); setShowEmojiPicker(false); setShowAttachmentMenu(false); }}
                        className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                        title="GIFs"
                      >
                        <Sticker className="w-4 h-4" />
                      </button>
                      
                      <button 
                        ref={emojiButtonRef}
                        type="button" 
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGiphyPicker(false); setShowAttachmentMenu(false); }}
                        className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                        title="Emojis"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      
                      <button 
                        type="button" 
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                        title="Camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors"
                        title="Attach File"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={(!newMessage.trim() && attachments.length === 0 && !selectedGif) || isUploading}
                className="flex items-center justify-center w-[36px] h-[36px] text-xs font-semibold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-teal/20 border border-brand-teal/40 hover:bg-brand-teal hover:text-[#0d1117] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Send"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`flex flex-col flex-1 h-full min-h-0 relative ${isMini ? 'p-0 pb-0' : 'p-2 md:p-6 pb-2 md:pb-6'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-teal/10 backdrop-blur-sm border-2 border-dashed border-brand-teal rounded-lg m-2 md:m-6 flex items-center justify-center pointer-events-none transition-all duration-200">
          <div className="bg-brand-navy/90 text-brand-teal px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center">
            <File className="w-12 h-12 mb-3" />
            <h3 className="text-lg font-bold tracking-wide">Drop file to attach</h3>
            <p className="text-sm text-brand-teal/70 mt-1">Images or documents</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div 
        className="flex-1 rounded-lg border border-border-subtle flex overflow-hidden min-h-0 relative"
        style={{ backgroundColor: settings?.chatBackgroundTint || '#11161d' }}
      >
        {isMini || isMobileScreen ? (
          // Single-pane mobile widget or small screen flow
          activeConversation ? renderConversationView() : renderConversationsList()
        ) : (
          // Two-pane desktop layout
          <>
            <div className="w-72 lg:w-80 shrink-0 h-full flex flex-col">
              {renderConversationsList()}
            </div>
            <div className="flex-1 h-full flex flex-col min-w-0">
              {activeConversation ? (
                renderConversationView()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <MessageSquare className="w-12 h-12 text-brand-teal/40 mb-3" />
                  <h3 className="text-sm font-semibold text-zinc-300">Select a conversation</h3>
                  <p className="text-xs text-zinc-500 mt-1">Choose Team Chat or a staff member on the left to start messaging</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0 bg-[#1c2128]">
            <h3 className="text-sm font-semibold text-white truncate pr-4">{previewFile.name}</h3>
            <button 
              onClick={() => setPreviewFile(null)}
              className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-md"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117] p-2 md:p-8 flex items-center justify-center min-h-0">
            {isVideoAttachment(previewFile.type, previewFile.name, previewFile.url) ? (
              <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
                <video
                  src={`${previewFile.url}&token=${token}`}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[75vh] rounded-lg shadow-2xl bg-black"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
            ) : previewFile.type?.startsWith('image/') ? (
              <img src={`${previewFile.url}&token=${token}`} alt={previewFile.name} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded" />
            ) : (
              <iframe src={`${previewFile.url}&token=${token}`} title={previewFile.name} className="w-full h-full bg-white rounded-lg shadow-2xl" />
            )}
          </div>
          <div className="p-4 border-t border-border-subtle shrink-0 bg-[#1c2128] flex justify-end">
            <a 
              href={`${previewFile.url}&token=${token}`} 
              download={previewFile.name}
              target="_blank" rel="noreferrer"
              className="flex items-center px-6 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 rounded-lg text-white bg-brand-teal/20 border border-brand-teal/40 hover:bg-brand-teal hover:text-[#0d1117]"
            >
              Open / Download Original
            </a>
          </div>
        </div>
      )}

      {showGiphyPicker && (
        <div ref={giphyPickerRef} className="absolute z-50 bg-brand-navy border border-border-subtle rounded-lg shadow-xl overflow-hidden p-2 flex flex-col bottom-[70px] left-2 right-2 sm:left-auto sm:right-6 sm:w-[320px] max-w-[400px]" style={{ height: 400 }}>
          <input 
            type="text" 
            placeholder="Search GIFs..." 
            value={gifSearch}
            onChange={(e) => setGifSearch(e.target.value)}
            className="w-full bg-black/20 border border-border-subtle rounded-md px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-brand-teal shrink-0"
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex justify-center">
            <div className="w-full max-w-[280px]">
              <Grid key={debouncedGifSearch} width={280} columns={2} fetchGifs={fetchGifs} onGifClick={onGifClick} hideAttribution={true} noLink={true} />
            </div>
          </div>
        </div>
      )}
      
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute z-50 shadow-xl bottom-[70px] right-2 sm:right-6">
          <Picker data={data} onEmojiSelect={onEmojiClick} theme="dark" />
        </div>
      )}
    </div>
  );
}
