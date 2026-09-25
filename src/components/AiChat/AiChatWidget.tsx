import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, X, RotateCcw, Loader2, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Auto-focus input on open
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const query = (customPrompt !== undefined ? customPrompt : input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: query
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: query,
          messages: newMessages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const replyText =
        data.reply ||
        data.response ||
        data.message ||
        data.content ||
        data.text ||
        (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: replyText
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error during AI chat submit:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to communicate with AI service. Please verify server connection.'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
  };

  const suggestedPrompts = [
    {
      title: "Analyze Client Funds",
      desc: "Check budget burn rate & used funds",
      icon: <DollarSign className="w-3.5 h-3.5 text-brand-teal" />,
      prompt: "Analyze client funds for the current quarter"
    },
    {
      title: "Optimize Roster",
      desc: "Calculate surplus hours & weekly baseline",
      icon: <Calendar className="w-3.5 h-3.5 text-emerald-400" />,
      prompt: "Optimize quarterly roster for Trilogy Care funding"
    },
    {
      title: "Budget Burn Rate",
      desc: "Assess remaining weeks & weekly spend",
      icon: <TrendingUp className="w-3.5 h-3.5 text-sky-400" />,
      prompt: "What is the recommended weekly budget pace for this quarter?"
    }
  ];

  return (
    <>
      {/* 3. Chat Window Component: Anchored directly above FAB */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="AI Care & Rostering Assistant"
          className="fixed bottom-[80px] right-[20px] z-50 w-[350px] sm:w-[380px] max-w-[calc(100vw-32px)] h-[500px] max-h-[calc(100vh-100px)] bg-brand-navy border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-bg/90 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-teal/20 border border-brand-teal/40 flex items-center justify-center text-brand-teal">
                <Sparkles className="w-4 h-4 text-brand-teal animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                  AI Assistant
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MCP Ready
                  </span>
                </h3>
                <p className="text-[11px] text-[#8B949E]">Trilogy Care & Rostering Budget</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-brand-bg/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-between py-2 text-center">
                <div className="pt-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 border border-brand-teal/20 mx-auto flex items-center justify-center text-brand-teal mb-3 shadow-inner">
                    <Bot className="w-6 h-6 text-brand-teal" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Happy in the Home AI
                  </h4>
                  <p className="text-xs text-[#8B949E] px-4 leading-relaxed">
                    Powered by Model Context Protocol (MCP) analytical tools for 3-month quarterly budgets & roster planning.
                  </p>
                </div>

                <div className="space-y-2 mt-4 text-left">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E] px-1">
                    Quick suggestions
                  </p>
                  {suggestedPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSubmit(undefined, item.prompt)}
                      className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-brand-teal/30 transition-all flex items-start gap-2.5 group cursor-pointer"
                    >
                      <span className="p-1 rounded-md bg-white/[0.04] group-hover:bg-brand-teal/10 transition-colors">
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white group-hover:text-brand-teal transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#8B949E] truncate">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-[#8B949E] mb-1 px-1">
                        {isUser ? 'You' : 'Care AI Assistant'}
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed break-words max-w-[88%] ${
                          isUser
                            ? 'bg-brand-teal/20 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-xs shadow-sm'
                            : 'bg-white/[0.05] text-[#E6EDF3] border border-white/[0.08] rounded-tl-xs shadow-sm whitespace-pre-wrap'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className="flex flex-col items-start animate-in fade-in duration-200">
                    <div className="text-[10px] text-[#8B949E] mb-1 px-1">Care AI Assistant</div>
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-[#8B949E] flex items-center gap-2 shadow-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                      <span>Analyzing quarterly data & roster...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-brand-bg/90 border-t border-border-subtle shrink-0 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about client funds, burn rate..."
              disabled={isLoading}
              className="flex-1 bg-black/40 border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs sm:text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal/70 focus:ring-1 focus:ring-brand-teal/40 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-brand-teal hover:bg-brand-teal/90 disabled:opacity-40 disabled:hover:bg-brand-teal text-white rounded-xl shadow transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. Floating Action Button (FAB): Absolute bottom-right corner (bottom: 20px, right: 20px) */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Open AI Assistant"
        className="fixed bottom-[20px] right-[20px] z-50 w-12 h-12 rounded-full bg-brand-navy hover:bg-brand-navy/90 border border-brand-teal/40 hover:border-brand-teal shadow-xl text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-brand-teal/50 print:hidden cursor-pointer"
      >
        <span className="relative flex items-center justify-center">
          <Bot className="w-5 h-5 text-brand-teal transition-transform group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-brand-navy animate-pulse" />
        </span>
      </button>
    </>
  );
}
