import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, RotateCcw, Loader2, DollarSign, Calendar, TrendingUp, Maximize2, Minimize2, Search, ArrowLeft, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HappyMascot from './HappyMascot';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface PortalClient {
  id: number;
  first_name: string;
  last_name: string;
  funding_type?: string;
  status?: string;
  avatar_url?: string;
}

export interface SuggestedAction {
  title: string;
  desc: string;
  icon: React.ReactNode;
  promptTemplate: (clientName: string) => string;
}

export interface PortalPromptQuestion {
  id: string;
  category: string;
  question: string;
  prompt: string;
}

const PORTAL_QUESTIONS: PortalPromptQuestion[] = [
  {
    id: 'ndis-budget',
    category: 'NDIS Agreement',
    question: "Want me to analyze NDIS Service Agreement funds & line items for Dean Davies?",
    prompt: "Analyze NDIS Service Agreement funds for Dean Davies"
  },
  {
    id: 'roster-optimize',
    category: 'Roster Capacity',
    question: "Need to optimize weekly roster hours for a client to prevent budget overruns?",
    prompt: "Optimize roster for a client"
  },
  {
    id: 'burn-rate',
    category: 'Home Care',
    question: "Shall we check the budget burn rate and remaining funding weeks for Gary Rodwell?",
    prompt: "Assess budget burn rate and remaining funding weeks for Gary Rodwell"
  },
  {
    id: 'pauline-funds',
    category: 'Home Care',
    question: "Would you like me to review Pauline's Level 2 HCP cycle allocation and spent funds?",
    prompt: "Analyze client funds for Pauline"
  },
  {
    id: 'travel-logs',
    category: 'Operations',
    question: "Have you reviewed today's staff travel logs and cascading km claims?",
    prompt: "How do travel logs and cascading travel calculations work in the portal?"
  },
  {
    id: 'unspent-pool',
    category: 'Funding',
    question: "Would you like to check unspent funds pool rollovers for Home Care clients?",
    prompt: "Check unspent funds pool and rollover balances for clients"
  },
  {
    id: 'ndis-dates',
    category: 'NDIS Planning',
    question: "Did you know NDIS budgets track specific Service Agreement dates instead of quarters?",
    prompt: "Explain how NDIS Service Agreement dates and line item sub-totals work"
  },
  {
    id: 'invoice-check',
    category: 'Finance',
    question: "Do you have any completed shifts ready for billing or invoice generation?",
    prompt: "What is the procedure for verifying completed shifts before generating invoices?"
  },
  {
    id: 'compliance-audit',
    category: 'Compliance',
    question: "Would you like a reminder on generating evidence matrices for quality compliance?",
    prompt: "How does the Evidence Matrix and compliance auditing work in the portal?"
  }
];

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Mascot movement & occasional question state
  const [isMascotJumping, setIsMascotJumping] = useState<boolean>(false);
  const [activeQuestion, setActiveQuestion] = useState<PortalPromptQuestion | null>(null);
  const [showQuestionBubble, setShowQuestionBubble] = useState<boolean>(false);

  // Portal client selection state
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [clientSearch, setClientSearch] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null);
  const [showClientPicker, setShowClientPicker] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Periodic jumping movement: Happy jumps up and down every 25-35 seconds
  useEffect(() => {
    const triggerJump = () => {
      setIsMascotJumping(true);
      setTimeout(() => setIsMascotJumping(false), 2400);
    };

    // Initial cheerful jump after 6 seconds of page load
    const initialJumpTimer = setTimeout(triggerJump, 6000);

    const jumpInterval = setInterval(() => {
      triggerJump();
    }, 28000);

    return () => {
      clearTimeout(initialJumpTimer);
      clearInterval(jumpInterval);
    };
  }, []);

  // 2. Random portal questions: Happy asks a question every 3-5 minutes (with first at 30 seconds)
  useEffect(() => {
    let questionDismissTimeout: NodeJS.Timeout | null = null;
    let nextQuestionTimer: NodeJS.Timeout | null = null;

    const askRandomQuestion = () => {
      const randomIndex = Math.floor(Math.random() * PORTAL_QUESTIONS.length);
      const chosen = PORTAL_QUESTIONS[randomIndex];
      setActiveQuestion(chosen);
      setShowQuestionBubble(true);

      // Trigger energetic jump sequence when asking a question!
      setIsMascotJumping(true);
      setTimeout(() => setIsMascotJumping(false), 3200);

      // Auto-hide bubble after 22 seconds if untouched
      if (questionDismissTimeout) clearTimeout(questionDismissTimeout);
      questionDismissTimeout = setTimeout(() => {
        setShowQuestionBubble(false);
      }, 22000);
    };

    // First question after 30 seconds of user loading portal
    const firstTimer = setTimeout(askRandomQuestion, 30000);

    // Schedule subsequent questions every 3 to 5 minutes (180,000ms - 300,000ms)
    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * (300000 - 180000 + 1)) + 180000;
      nextQuestionTimer = setTimeout(() => {
        askRandomQuestion();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      clearTimeout(firstTimer);
      if (nextQuestionTimer) clearTimeout(nextQuestionTimer);
      if (questionDismissTimeout) clearTimeout(questionDismissTimeout);
    };
  }, []);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/clients', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = data.sort((a: any, b: any) => {
            const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
            const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
          });
          setClients(sorted);
        }
      }
    } catch (err) {
      console.error('Failed to load clients for AI Assistant:', err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (isOpen && clients.length === 0) {
      fetchClients();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Auto-focus input on open
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, isLoading, selectedAction, showClientPicker]);

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
    setSelectedAction(null);
    setShowClientPicker(false);
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
    setSelectedAction(null);
    setShowClientPicker(false);
  };

  const suggestedActions: SuggestedAction[] = [
    {
      title: "Analyze Client Funds",
      desc: "Check budget burn rate & used funds",
      icon: <DollarSign className="w-3.5 h-3.5 text-brand-teal" />,
      promptTemplate: (name: string) => `Analyze client funds for ${name} for the current quarter`
    },
    {
      title: "Optimize Roster",
      desc: "Calculate surplus hours & weekly baseline",
      icon: <Calendar className="w-3.5 h-3.5 text-emerald-400" />,
      promptTemplate: (name: string) => `Optimize quarterly roster for ${name} for the current quarter`
    },
    {
      title: "Budget Burn Rate",
      desc: "Assess remaining weeks & weekly spend",
      icon: <TrendingUp className="w-3.5 h-3.5 text-sky-400" />,
      promptTemplate: (name: string) => `Assess budget burn rate and remaining funding weeks for ${name} for the current quarter`
    }
  ];

  const handleActionClick = (action: SuggestedAction) => {
    setSelectedAction(action);
    setClientSearch('');
    if (clients.length === 0) {
      fetchClients();
    }
  };

  const handleSelectClient = (client: PortalClient, actionToUse?: SuggestedAction | null) => {
    const action = actionToUse || selectedAction || suggestedActions[0];
    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || `Client #${client.id}`;
    const isNdis = String(client.funding_type || '').trim().toUpperCase() === 'NDIS';

    let query = action.promptTemplate(clientName);
    if (isNdis) {
      if (action.title === "Analyze Client Funds") {
        query = `Analyze NDIS Service Agreement funds for ${clientName}`;
      } else if (action.title === "Optimize Roster") {
        query = `Optimize roster for ${clientName}`;
      } else if (action.title === "Budget Burn Rate") {
        query = `Assess NDIS Service Agreement burn rate and remaining funding for ${clientName}`;
      }
    }

    handleSubmit(undefined, query);
  };

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const funding = (c.funding_type || '').toLowerCase();
    return fullName.includes(q) || funding.includes(q);
  });

  return (
    <>
      {/* 3. Chat Window Component: Anchored directly above FAB */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Happy in the Home Portal Assistant"
          className={`fixed bottom-[76px] sm:bottom-[80px] right-3 sm:right-[20px] left-3 sm:left-auto z-50 bg-brand-navy border border-border-subtle rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-3 ${
            isExpanded
              ? 'w-auto sm:w-[680px] md:w-[780px] lg:w-[880px] h-[72vh] sm:h-[580px] md:h-[640px] lg:h-[680px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-32px)] max-h-[calc(100vh-110px)] sm:max-h-[calc(100vh-120px)]'
              : 'w-auto sm:w-[390px] md:w-[410px] max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-32px)] h-[68vh] sm:h-[520px] md:h-[560px] lg:h-[580px] max-h-[calc(100vh-110px)] sm:max-h-[calc(100vh-120px)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-bg/90 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-brand-teal/30 flex items-center justify-center shadow-inner">
                <HappyMascot size="sm" isJumping={isMascotJumping} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                  Happy
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MCP Ready
                  </span>
                </h3>
                <p className="text-[11px] text-teal-300/90 font-medium">Happy in the Home Portal Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                title={isExpanded ? "Collapse window" : "Expand window"}
                aria-label={isExpanded ? "Collapse chat window" : "Expand chat window"}
                className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-[#8B949E] hover:text-white hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-brand-bg/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-between py-2 text-center">
                <div className="pt-2">
                  <div className="mx-auto flex items-center justify-center mb-2.5">
                    <HappyMascot size="xl" isJumping={isMascotJumping} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/15 border border-brand-teal/30 text-teal-300 text-xs font-semibold mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Hi! My name is Happy
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Happy in the Home Portal Assistant
                  </h4>
                  <p className="text-xs text-[#8B949E] px-4 leading-relaxed max-w-sm mx-auto">
                    I'm your assistant for 3-month quarterly budgets, NDIS & Home Care funding, roster planning, and live portal analytics.
                  </p>
                </div>

                {/* Quick suggestions OR Client Selection Step */}
                {!selectedAction ? (
                  <div className="mt-4 text-left">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E] px-1 mb-2">
                      Quick suggestions
                    </p>
                    <div className={`space-y-2 ${isExpanded ? 'md:space-y-0 md:grid md:grid-cols-3 md:gap-3' : ''}`}>
                      {suggestedActions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleActionClick(item)}
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
                  /* Client Selector View after clicking a button */
                  <div className="mt-2 text-left animate-in fade-in zoom-in-95 duration-200 bg-white/[0.03] border border-brand-teal/30 rounded-2xl p-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-teal/20 border border-brand-teal/40 flex items-center justify-center text-teal-300">
                          {selectedAction.icon}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            Which client would you like to use?
                          </h5>
                          <p className="text-[11px] text-[#8B949E]">
                            Select a client for <span className="text-teal-300 font-semibold">{selectedAction.title}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.08] transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-2.5">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients from portal..."
                        autoFocus
                        className="w-full bg-black/50 border border-white/[0.12] rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal/70 focus:ring-1 focus:ring-brand-teal/40 transition-colors"
                      />
                      {clientSearch && (
                        <button
                          type="button"
                          onClick={() => setClientSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Scrollable Client List from the portal */}
                    <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {isLoadingClients ? (
                        <div className="py-6 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-brand-teal" />
                          <span>Loading clients from portal...</span>
                        </div>
                      ) : filteredClients.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-400 bg-black/20 rounded-xl border border-white/[0.05]">
                          {clients.length === 0 ? (
                            <div>
                              <p className="font-semibold text-white mb-1">No clients found in portal</p>
                              <p className="text-[11px] text-zinc-400 px-3">You can add clients in the Directory tab, or ask a general question below.</p>
                            </div>
                          ) : (
                            <p>No clients matching &quot;{clientSearch}&quot;</p>
                          )}
                        </div>
                      ) : (
                        filteredClients.map((client) => {
                          const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || `Client #${client.id}`;
                          const initials = `${client.first_name?.[0] || ''}${client.last_name?.[0] || ''}`.toUpperCase() || 'C';
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-brand-teal/50 transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-brand-teal/15 border border-brand-teal/30 flex items-center justify-center text-xs font-semibold text-teal-300 shrink-0 group-hover:scale-105 transition-transform">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-white group-hover:text-brand-teal transition-colors truncate">
                                    {fullName}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>{client.funding_type || 'NDIS & Home Care'}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-medium text-teal-300 bg-brand-teal/15 border border-brand-teal/30 px-2 py-0.5 rounded-md group-hover:bg-brand-teal group-hover:text-white transition-all shrink-0">
                                Select →
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="flex items-center gap-1 text-teal-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to suggestions
                      </button>
                      <span>{filteredClients.length} client{filteredClients.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                )}
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
                      <div className="text-[10px] text-[#8B949E] mb-1 px-1 flex items-center gap-1.5">
                        {isUser ? (
                          'You'
                        ) : (
                          <>
                            <HappyMascot size="xs" animated={false} />
                            <span className="font-semibold text-teal-300">Happy</span>
                          </>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed break-words max-w-[88%] ${
                          isUser
                            ? 'bg-brand-teal/20 text-[#E6EDF3] border border-brand-teal/30 rounded-tr-xs shadow-sm whitespace-pre-wrap'
                            : 'bg-white/[0.05] text-[#E6EDF3] border border-white/[0.08] rounded-tl-xs shadow-sm'
                        }`}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
                          <div className="prose prose-invert prose-xs max-w-none text-xs sm:text-[13px] leading-relaxed [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-white [&_strong]:font-bold [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:my-2 [&_h2]:my-1.5 [&_h3]:my-1 [&_code]:bg-white/[0.1] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-emerald-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className="flex flex-col items-start animate-in fade-in duration-200">
                    <div className="text-[10px] text-[#8B949E] mb-1 px-1 flex items-center gap-1.5">
                      <HappyMascot size="xs" isThinking />
                      <span className="font-semibold text-teal-300">Happy</span>
                    </div>
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-[#8B949E] flex items-center gap-2 shadow-sm">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-teal" />
                      <span>Happy is analyzing quarterly data & roster...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Interactive in-chat Client Picker Modal/Sheet when toggled */}
          {showClientPicker && (
            <div className="p-3 bg-brand-navy border-t border-brand-teal/30 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-brand-teal/20 text-teal-300 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Which client would you like to use?</h5>
                    <p className="text-[10px] text-zinc-400">Choose a client from your portal to analyze</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClientPicker(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.08] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search portal clients..."
                  autoFocus
                  className="w-full bg-black/50 border border-white/[0.12] rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal/70"
                />
              </div>

              <div className="max-h-[180px] overflow-y-auto space-y-1 custom-scrollbar">
                {isLoadingClients ? (
                  <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
                    <span>Loading clients...</span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-3 text-center text-xs text-zinc-400">
                    No clients found.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || `Client #${client.id}`;
                    return (
                      <div
                        key={client.id}
                        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{fullName}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{client.funding_type || 'NDIS & Home Care'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectClient(client, suggestedActions[0])}
                            className="px-2 py-0.5 rounded bg-brand-teal/20 hover:bg-brand-teal text-teal-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                            title="Analyze funds for this client"
                          >
                            Analyze
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectClient(client, suggestedActions[1])}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-medium transition-colors cursor-pointer"
                            title="Optimize roster for this client"
                          >
                            Roster
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick client select trigger bar if in chat */}
          {messages.length > 0 && !showClientPicker && (
            <div className="px-3 py-1.5 bg-black/20 border-t border-white/[0.04] flex items-center justify-between text-xs text-zinc-400">
              <span className="text-[11px] text-zinc-400">Want to check another client?</span>
              <button
                type="button"
                onClick={() => {
                  setShowClientPicker(true);
                  if (clients.length === 0) fetchClients();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-teal-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <User className="w-3 h-3" />
                Select Client
              </button>
            </div>
          )}

          {/* Active Question Suggestion Banner when chat is open */}
          {activeQuestion && showQuestionBubble && (
            <div className="mx-3 my-1.5 p-2 rounded-xl bg-gradient-to-r from-brand-teal/20 via-brand-navy to-emerald-500/15 border border-brand-teal/40 flex items-center justify-between gap-2 text-xs shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-lg bg-brand-teal/20 text-teal-300 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                </span>
                <p className="text-[11px] text-zinc-200 truncate">
                  <span className="font-semibold text-teal-300">Happy asks:</span> {activeQuestion.question}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionBubble(false);
                    handleSubmit(undefined, activeQuestion.prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-brand-teal hover:bg-brand-teal/80 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Ask
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuestionBubble(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

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
              placeholder="Ask Happy about client funds, burn rate..."
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

      {/* Floating Speech Bubble from Happy Mascot (When Chat is Closed) */}
      {showQuestionBubble && activeQuestion && !isOpen && (
        <div 
          className="fixed bottom-[84px] right-[20px] z-50 max-w-[285px] sm:max-w-[320px] bg-brand-navy/95 backdrop-blur-md border border-brand-teal/50 rounded-2xl p-3.5 shadow-2xl shadow-black/80 text-white animate-in fade-in slide-in-from-bottom-3 duration-300 print:hidden select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-brand-teal tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Happy asks
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-teal-200/80 font-medium">
                {activeQuestion.category}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuestionBubble(false)}
              className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Question Text */}
          <p className="text-xs text-zinc-200 leading-relaxed font-medium mb-3">
            "{activeQuestion.question}"
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowQuestionBubble(false)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuestionBubble(false);
                setIsOpen(true);
                handleSubmit(undefined, activeQuestion.prompt);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-teal to-emerald-500 hover:from-brand-teal/90 hover:to-emerald-500/90 text-white text-[11px] font-semibold shadow-md shadow-emerald-950/40 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <span>Ask Happy</span>
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* Speech bubble pointer notch */}
          <div className="absolute -bottom-1.5 right-6 w-3.5 h-3.5 bg-brand-navy border-r border-b border-brand-teal/50 transform rotate-45" />
        </div>
      )}

      {/* 2. Floating Action Button (FAB): Absolute bottom-right corner (bottom: 20px, right: 20px) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setShowQuestionBubble(false);
        }}
        aria-label="Open Happy in the Home Portal Assistant"
        title="Chat with Happy - Portal Assistant"
        className={`fixed bottom-[20px] right-[20px] z-50 w-13 h-13 rounded-full bg-brand-navy hover:bg-brand-navy/90 border border-brand-teal/50 hover:border-brand-teal shadow-2xl text-white flex items-center justify-center transition-all group focus:outline-none focus:ring-2 focus:ring-brand-teal/50 print:hidden cursor-pointer ${
          isMascotJumping
            ? 'animate-bounce shadow-brand-teal/60 ring-2 ring-brand-teal/60 scale-105'
            : 'hover:scale-105 active:scale-95'
        }`}
      >
        <span className="relative flex items-center justify-center">
          <HappyMascot 
            size="sm" 
            isJumping={isMascotJumping}
            className="transition-transform group-hover:scale-110" 
          />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-brand-navy animate-pulse" />
        </span>
      </button>
    </>
  );
}
