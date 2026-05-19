import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns/format';
import { subDays } from 'date-fns/subDays';
import { startOfDay } from 'date-fns/startOfDay';
import { compareAsc } from 'date-fns/compareAsc';
import { useAuth } from '../../context/AuthContext';
import ShiftDetailsModal from '../Roster/ShiftDetailsModal';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ShiftEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  staffId?: number;
  staffName?: string;
  clientId: number;
  clientName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS';
  serviceName?: string;
  isRespiteWrapper?: boolean;
  actualStartTime?: string;
  actualEndTime?: string;
}

export default function WallboardView() {
  const { token, settings } = useAuth();
  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [date, setDate] = useState(() => subDays(new Date(), 1));
  
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [manualMode, setManualMode] = useState<boolean | null>(null);
  const [zoomLevel, setZoomLevel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallboard_zoom');
      if (saved) return parseFloat(saved);
    }
    return 1;
  });
  const [dailyQuote, setDailyQuote] = useState<{quote: string; author: string; imageUrl?: string} | null>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isFlickering, setIsFlickering] = useState(false);
  const flickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopFlickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [publicLogo, setPublicLogo] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fn = async () => {
      try {
        const res = await fetch('/api/public-settings');
        if (res.ok) {
          const data = await res.json();
          if (data.websiteLogo) setPublicLogo(data.websiteLogo);
        }
      } catch (e) {
        console.error("Failed to fetch public settings", e);
      }
    };
    if (!settings?.websiteLogo) {
      fn();
    }
  }, [settings?.websiteLogo]);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const [rotation, setRotation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallboard_rotation');
      if (saved) return parseInt(saved, 10);
      const params = new URLSearchParams(window.location.search);
      return parseInt(params.get('rotate') || '0', 10);
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallboard_rotation', rotation.toString());
    }
  }, [rotation]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallboard_zoom', zoomLevel.toString());
    }
  }, [zoomLevel]);

  const resetToolbarTimeout = () => {
    setIsToolbarVisible(true);
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    toolbarTimeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 5000);
  };

  useEffect(() => {
    resetToolbarTimeout();
    window.addEventListener('mousemove', resetToolbarTimeout);
    window.addEventListener('keydown', resetToolbarTimeout);
    window.addEventListener('touchstart', resetToolbarTimeout);
    return () => {
      window.removeEventListener('mousemove', resetToolbarTimeout);
      window.removeEventListener('keydown', resetToolbarTimeout);
      window.removeEventListener('touchstart', resetToolbarTimeout);
      if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const triggerFlicker = () => {
      setIsFlickering(true);
      if (stopFlickerTimeoutRef.current) clearTimeout(stopFlickerTimeoutRef.current);
      // Flicker for 150 to 450 ms
      stopFlickerTimeoutRef.current = setTimeout(() => {
        setIsFlickering(false);
      }, 150 + Math.random() * 300);
      
      // Schedule next flicker anywhere from 5 to 15 seconds
      if (flickerTimeoutRef.current) clearTimeout(flickerTimeoutRef.current);
      flickerTimeoutRef.current = setTimeout(triggerFlicker, 5000 + Math.random() * 10000);
    };

    flickerTimeoutRef.current = setTimeout(triggerFlicker, 3000 + Math.random() * 5000);

    return () => {
      if (flickerTimeoutRef.current) clearTimeout(flickerTimeoutRef.current);
      if (stopFlickerTimeoutRef.current) clearTimeout(stopFlickerTimeoutRef.current);
    };
  }, []);

  const fetchQuote = async () => {
    try {
      const res = await fetch('/api/awesome-quotes/daily');
      const data = await res.json();
      
      try {
        if (data.author && data.author !== 'Unknown' && !data.author.includes('Proverb')) {
            const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(data.author)}&prop=pageimages&format=json&pithumbsize=200&origin=*&redirects=1`);
            const wikiData = await wikiRes.json();
            const pages = wikiData.query?.pages;
            if (pages) {
                const pageValues = Object.values(pages)[0] as any;
                if (pageValues.thumbnail?.source) {
                    data.imageUrl = pageValues.thumbnail.source;
                }
            }
        }
      } catch (e) {
          console.error("Failed to fetch wiki image", e);
      }

      setDailyQuote(data);
    } catch(e) {
       console.error(e);
    }
  };

  useEffect(() => {
    fetchQuote();
    const interval = setInterval(fetchQuote, 24 * 60 * 60 * 1000); // Daily
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [shiftsRes, respiteRes] = await Promise.all([
        fetch('/api/shifts?wallboard=true', { headers }),
        fetch('/api/respite-bookings?wallboard=true', { headers })
      ]);

      if (shiftsRes.ok && respiteRes.ok) {
        const shiftsData = await shiftsRes.json();
        const respiteData = await respiteRes.json();
        
        const individualShifts = shiftsData.filter((d: any) => !d.respite_booking_id);

        const mappedShifts = individualShifts.map((d: any) => ({
          id: d.id,
          title: `${d.client_first_name} ${d.client_last_name} (${d.staff_first_name || 'Unassigned'})`,
          start: new Date(d.start_time),
          end: new Date(d.end_time),
          staffId: d.staff_id,
          staffName: `${d.staff_first_name} ${d.staff_last_name}`.trim(),
          clientId: d.client_id,
          clientName: `${d.client_first_name} ${d.client_last_name}`.trim(),
          status: d.status,
          serviceName: d.service_name,
          actualStartTime: d.actual_start_time,
          actualEndTime: d.actual_finish_time,
        }));
        
        const mappedRespites: any[] = [];
        const childShifts: any[] = [];

        respiteData.forEach((d: any) => {
          mappedRespites.push({
            id: `rb_${d.id}`,
            title: `${d.client_first_name} ${d.client_last_name} (STA / Respite)`,
            start: new Date(d.start_time),
            end: new Date(d.end_time),
            clientId: d.client_id,
            clientName: `${d.client_first_name} ${d.client_last_name}`.trim(),
            status: d.status,
            isRespiteWrapper: true,
          });

          if (Array.isArray(d.shifts)) {
            d.shifts.forEach((s: any) => {
              childShifts.push({
                id: s.id,
                title: `${d.client_first_name} ${d.client_last_name} (${s.staff_first_name || 'Unassigned'})`,
                start: new Date(s.start_time),
                end: new Date(s.end_time),
                staffId: s.staff_id,
                staffName: `${s.staff_first_name} ${s.staff_last_name}`.trim(),
                clientId: d.client_id,
                clientName: `${d.client_first_name} ${d.client_last_name}`.trim(),
                status: s.status,
                serviceName: s.service_name,
                actualStartTime: s.actual_start_time,
                actualEndTime: s.actual_finish_time,
              });
            });
          }
        });

        // Filter out drafts / cancelled so wallboard stays clean if desired, or keep them to show status.
        // Wallboard shouldn't show deleted or cancelled usually, but we'll show what's passed.
        setEvents([...mappedShifts, ...mappedRespites, ...childShifts].filter((e: any) => ['PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'DRAFT'].includes(e.status)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      if (!manualMode) {
        // Keep moving the 'window' forward so yesterday's shifts fall off 24 hours later
        setDate(subDays(new Date(), 1));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token, manualMode]);

  const handleSelectEvent = (event: ShiftEvent) => {
    if (event.isRespiteWrapper) return;
    setSelectedShift(event);
    setIsDetailsModalOpen(true);
  };

  const isRotated90 = rotation === 90 || rotation === 270;
  
  const rotatedContainerStyles = isRotated90 ? {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: '100vh',
    height: '100vw',
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  } : {
    width: '100vw',
    height: '100vh',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center'
  };

  // Group and sort events
  const groupedEvents = useMemo(() => {
    const minDate = startOfDay(date);
    // Filter events to only those > minDate (yesterday)
    const activeEvents = events.filter(e => e.start >= minDate);
    
    // Sort chronologically
    activeEvents.sort((a, b) => compareAsc(a.start, b.start));

    const groups: Record<string, ShiftEvent[]> = {};
    activeEvents.forEach(e => {
      const dayKey = format(e.start, 'EEEE, d MMMM yyyy');
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(e);
    });

    return Object.keys(groups).map(key => ({
      dateLabel: key,
      events: groups[key]
    }));
  }, [events, date]);

  const actualLogo = settings?.websiteLogo || publicLogo;

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 relative" style={{ maxWidth: '100vw', maxHeight: '100vh' }}>
      <div style={rotatedContainerStyles} className="flex flex-col relative transition-transform duration-500 h-full">
        {/* Header with Logo and Animated Title */}
        <div className="flex flex-row items-center justify-between py-1 px-4 gap-0 bg-zinc-900/50 border-b border-zinc-800 min-h-[64px] shrink-0">
          <div className="flex-1 flex justify-start items-center">
            {/* Logo has been moved next to the title */}
          </div>
          <div className="flex-none flex justify-center items-center relative gap-2">
            {actualLogo && (
               <motion.img 
                 src={actualLogo} 
                 alt="Logo" 
                 className="h-12 md:h-14 w-auto object-contain drop-shadow-lg z-10" 
                 animate={{ rotateY: [0, 1080, 1080] }}
                 transition={{ duration: 200, repeat: Infinity, times: [0, 0.015, 1], ease: ["easeOut", "linear"] }}
               />
            )}
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-emerald-400 to-brand-teal bg-[length:200%_auto] ${isFlickering ? 'animate-flicker' : 'animate-gradient'}`}
            >
              Dream Chasers
            </motion.h1>
          </div>
          <div className="flex-1 flex justify-end items-center">
            <div className="text-xl md:text-2xl font-mono text-zinc-300 font-semibold tracking-wider" style={{ zoom: zoomLevel } as any}>
               {format(currentTime, 'h:mm:ss a')}
            </div>
          </div>
          <style>{`
            @keyframes gradient {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            .animate-gradient {
              animation: gradient 4s linear infinite;
            }
            @keyframes flicker-glitch {
              0% { opacity: 1; transform: skew(0deg); }
              10% { opacity: 0.4; transform: skew(-5deg) translate(-1px, 1px); }
              20% { opacity: 1; transform: skew(0deg); }
              30% { opacity: 0.1; transform: skew(5deg) translate(1px, -1px); filter: hue-rotate(90deg) saturate(2); }
              40% { opacity: 1; transform: skew(0deg); }
              50% { opacity: 0.8; transform: skew(-2deg); }
              60% { opacity: 1; transform: skew(0deg); }
              70% { opacity: 0.3; transform: skew(3deg) translate(-1px, -1px); }
              80% { opacity: 1; transform: skew(0deg); }
              90% { opacity: 0.6; transform: scaleY(0.9); }
              100% { opacity: 1; transform: skew(0deg); }
            }
            .animate-flicker {
              animation: flicker-glitch 0.2s linear infinite alternate;
              text-shadow: 2px 0 #0d9488, -2px 0 #34d399;
            }
          `}</style>
        </div>

        <div className="flex-1 w-full flex flex-col p-4 md:p-8 overflow-auto">
          <div style={{ zoom: zoomLevel } as any} className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-8 pb-32">
            {groupedEvents.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-zinc-500 font-medium">
                No shifts found starting from {format(date, 'd MMM yyyy')}.
              </div>
            ) : (
              groupedEvents.map((group) => (
                <div key={group.dateLabel} className="flex flex-col gap-3">
                  <h2 className="text-2xl font-bold tracking-tight text-brand-teal uppercase border-b border-zinc-800 pb-2 mb-2 sticky top-0 bg-zinc-950/80 backdrop-blur-sm z-10">
                    {group.dateLabel}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {group.events.map(event => {
                      const isCompleted = event.status === 'COMPLETED' || !!event.actualEndTime;
                      const isActuallyRunning = event.status === 'IN_PROGRESS' || (!!event.actualStartTime && !event.actualEndTime);
                      const isInProgress = isActuallyRunning && !isCompleted;
                      
                      let containerClass = "transition-all flex items-center p-3 sm:p-4 shadow-sm border-y border-white/[0.05] ";
                      if (event.status === 'DRAFT') {
                        containerClass += "opacity-90 border-l-[6px] border-orange-400 bg-orange-500/25";
                      } else if (isCompleted) {
                        containerClass += "opacity-80 border-l-[6px] border-brand-green bg-brand-green/25";
                      } else if (isInProgress) {
                        containerClass += "border-l-[6px] border-emerald-400 bg-emerald-500/35 shadow-emerald-500/30 shadow-lg pulse-border ring-1 ring-emerald-500/50";
                      } else {
                        // SCHEDULED / PUBLISHED -> Zinc (matches Scheduled badge)
                        containerClass += "opacity-95 border-l-[6px] border-zinc-400 bg-zinc-500/25";
                      }

                      return (
                        <div 
                          key={event.id}
                          onClick={() => handleSelectEvent(event)}
                          className={`w-full hover:brightness-110 cursor-pointer ${containerClass} rounded-r-xl`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
                            <div className="text-zinc-300 font-mono text-lg whitespace-nowrap min-w-[140px]">
                              {format(event.start, 'h:mm a')} <span className="text-zinc-600 px-1">–</span> {format(event.end, 'h:mm a')}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-grow truncate px-0 sm:px-4 sm:border-l sm:border-zinc-700/50">
                              <span className={`font-bold text-xl truncate ${isInProgress ? 'text-emerald-50' : 'text-[#E6EDF3]'}`}>
                                {event.clientName || 'Unknown Client'}
                              </span>
                              <span className="hidden sm:inline text-zinc-600">•</span>
                              <span className={`text-lg truncate ${isInProgress ? 'text-emerald-400 font-medium' : 'text-brand-teal'}`}>
                                {event.staffName || 'Unassigned'}
                              </span>
                              <span className="hidden sm:inline text-zinc-600">•</span>
                              <span className={`text-base truncate ${isInProgress ? 'text-emerald-200' : 'text-[#8B949E]'}`}>
                                {event.serviceName || (event.isRespiteWrapper ? 'STA / Respite' : 'Support Worker')} 
                              </span>
                            </div>

                            <div className="flex items-center justify-start sm:justify-end whitespace-nowrap">
                              {isInProgress && (
                                <span className="flex items-center">
                                  <span className="flex h-3 w-3 relative mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                                    In Progress
                                  </span>
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-xs bg-blue-500/20 text-blue-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                                  Completed
                                </span>
                              )}
                              {!isInProgress && !isCompleted && event.status !== 'DRAFT' && (
                                <span className="text-xs bg-zinc-500/20 text-zinc-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                                  Scheduled
                                </span>
                              )}
                              {event.status === 'DRAFT' && (
                                <span className="text-xs bg-orange-500/20 text-orange-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                                  Draft
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer with Quote */}
        <div className="flex flex-col items-center justify-center p-3 sm:px-6 bg-zinc-900/50 border-t border-zinc-800 min-h-[64px] shrink-0">
          <AnimatePresence mode="wait">
            {dailyQuote ? (
              <motion.div 
                key={dailyQuote.quote}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8 }}
                className="text-center w-full max-w-4xl mx-auto flex flex-col items-center justify-center"
              >
                <div className="flex items-center justify-center gap-4">
                  {dailyQuote.imageUrl && (
                    <img 
                      src={dailyQuote.imageUrl} 
                      alt={dailyQuote.author} 
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-zinc-700 shadow-sm"
                    />
                  )}
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <p className="text-sm md:text-base font-medium text-zinc-200 italic leading-snug">"{dailyQuote.quote}"</p>
                    <p className="text-xs md:text-sm text-brand-teal mt-0.5 font-semibold tracking-wide uppercase">— {dailyQuote.author}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
               <div className="h-8 md:h-10 w-full animate-pulse bg-zinc-800/50 rounded-md"></div>
            )}
          </AnimatePresence>
        </div>

        <div className={`fixed bottom-24 right-6 transition-all duration-1000 flex flex-col items-end gap-2 z-50 ${isToolbarVisible ? 'opacity-30 hover:opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center bg-zinc-900 border border-zinc-700 rounded-full shadow-lg p-1">
            <button 
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 2.5))}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <span className="text-zinc-500 font-mono text-[10px] w-full text-center py-1 select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.4))}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => {
              const nextVal = (rotation + 90) % 360;
              setRotation(nextVal);
            }}
            className="p-3 bg-zinc-900 border border-zinc-700 rounded-full shadow-lg text-zinc-400 hover:text-white"
            title="Rotate Display"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {isDetailsModalOpen && selectedShift && (
          <ShiftDetailsModal
            isOpen={isDetailsModalOpen}
            shift={selectedShift}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedShift(null);
            }}
            onSave={fetchData}
          />
        )}
      </div>
      <style>{`
        .pulse-border {
          animation: borderPulse 2s infinite;
        }
        @keyframes borderPulse {
          0% { border-left-color: rgb(16, 185, 129); }
          50% { border-left-color: rgb(52, 211, 153); }
          100% { border-left-color: rgb(16, 185, 129); }
        }
      `}</style>
    </div>
  );
}
