import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns/format';
import { subDays } from 'date-fns/subDays';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addDays } from 'date-fns/addDays';
import { compareAsc } from 'date-fns/compareAsc';
import { useAuth } from '../../context/AuthContext';
import ShiftDetailsModal from '../Roster/ShiftDetailsModal';
import { ZoomIn, ZoomOut, RotateCw, BarChart3, CalendarClock, RefreshCw, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface XeroPnLRowItem {
  label: string;
  accountId?: string;
  isSummary: boolean;
  values: number[];
  ytdValue: number | null;
}

interface XeroPnLSection {
  title: string;
  rows: XeroPnLRowItem[];
}

interface XeroProfitAndLossData {
  success: boolean;
  reportTitle: string;
  organisationName: string;
  periodSubtitle: string;
  monthHeaders: string[];
  hasYtd: boolean;
  sections: XeroPnLSection[];
  updatedAt: string;
  fromCache?: boolean;
  needsReauth?: boolean;
  error?: string;
}

const SHIFTS_DISPLAY_DURATION_MS = 10 * 60 * 1000; // 10 minutes on Live Shift Tracker
const PNL_DISPLAY_DURATION_MS = 2 * 60 * 1000;     // 2 minutes on Xero Profit & Loss


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
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  // Alternating Wallboard View state: 'SHIFTS' (10 mins) <-> 'PNL' (2 mins)
  const [activeSlide, setActiveSlide] = useState<'SHIFTS' | 'PNL'>('SHIFTS');
  const [isRotationLocked, setIsRotationLocked] = useState(false);
  const [pnlData, setPnlData] = useState<XeroProfitAndLossData | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [compactView, setCompactView] = useState(true);

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

  const [isReconnecting, setIsReconnecting] = useState(false);
  const currentQuoteRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);

  const fetchQuote = async (attempt = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const excludeParam = currentQuoteRef.current
        ? `&exclude=${encodeURIComponent(currentQuoteRef.current)}`
        : '';
      const res = await fetch(`/api/awesome-quotes/daily?random=true${excludeParam}&_t=${Date.now()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Quote fetch failed');
      const data = await res.json();

      const wikiLookupTitle = data.wikiTitle || data.author;
      try {
        if (wikiLookupTitle && wikiLookupTitle !== 'Unknown' && !wikiLookupTitle.includes('Proverb')) {
          const wikiController = new AbortController();
          const wikiTimeout = setTimeout(() => wikiController.abort(), 6000);
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiLookupTitle)}&prop=pageimages&format=json&pithumbsize=240&origin=*&redirects=1`,
            { signal: wikiController.signal }
          );
          clearTimeout(wikiTimeout);
          const wikiData = await wikiRes.json();
          const pages = wikiData.query?.pages;
          if (pages) {
            const pageValues = Object.values(pages)[0] as any;
            if (pageValues?.thumbnail?.source) {
              data.imageUrl = pageValues.thumbnail.source;
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch wiki image", e);
      }

      // If no Wikipedia portrait was found and we have retries left, try picking another quote so a picture is always shown
      if (!data.imageUrl && attempt < 2) {
        currentQuoteRef.current = data.quote || '';
        return fetchQuote(attempt + 1);
      }

      currentQuoteRef.current = data.quote || '';
      setDailyQuote(data);
    } catch (e) {
      console.error("Failed to fetch quote:", e);
    }
  };

  useEffect(() => {
    fetchQuote();
    // Rotate random quote every 5 minutes
    const interval = setInterval(() => fetchQuote(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPnLReport = async (forceRefresh = false) => {
    try {
      setPnlLoading(true);
      const fetchOptions: RequestInit = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};
      const res = await fetch(
        `/api/xero/reports/profit-and-loss?wallboard=true${forceRefresh ? '&refresh=true' : ''}&_t=${Date.now()}`,
        fetchOptions
      );
      if (res.ok) {
        const data: XeroProfitAndLossData = await res.json();
        setPnlData(data);
      }
    } catch (e) {
      console.error('Failed to fetch Xero Profit & Loss for Wallboard:', e);
    } finally {
      setPnlLoading(false);
    }
  };

  useEffect(() => {
    fetchPnLReport(false);
    // Refresh P&L data in background every 10 minutes
    const pnlInterval = setInterval(() => fetchPnLReport(false), 10 * 60 * 1000);
    return () => clearInterval(pnlInterval);
  }, [token]);

  // Asymmetric rotation timer: 10 minutes on SHIFTS, 2 minutes on PNL
  useEffect(() => {
    if (isRotationLocked) return;
    const duration = activeSlide === 'SHIFTS' ? SHIFTS_DISPLAY_DURATION_MS : PNL_DISPLAY_DURATION_MS;
    const timer = setTimeout(() => {
      setActiveSlide((prev) => {
        const next = prev === 'SHIFTS' ? 'PNL' : 'SHIFTS';
        if (next === 'PNL') {
          fetchPnLReport(false);
        }
        return next;
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [activeSlide, isRotationLocked]);

  const formatPnLAmount = (val: number | null | undefined) => {
    if (val === null || val === undefined || Math.abs(val) < 0.005) {
      return '-';
    }
    const isNeg = val < 0;
    const formatted = Math.abs(val).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNeg ? `(${formatted})` : formatted;
  };

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const startBound = subDays(new Date(), 2);
      const endBound = addDays(new Date(), 2);
      
      const startIso = startBound.toISOString();
      const endIso = endBound.toISOString();

      const fetchOptions: RequestInit = {
        signal: controller.signal,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      };

      const [shiftsRes, respiteRes] = await Promise.all([
        fetch(`/api/shifts?wallboard=true&start=${startIso}&end=${endIso}&t=` + Date.now(), fetchOptions),
        fetch(`/api/respite-bookings?wallboard=true&start=${startIso}&end=${endIso}&t=` + Date.now(), fetchOptions)
      ]);

      if (!shiftsRes.ok) {
        throw new Error(`HTTP ${shiftsRes.status}`);
      }

      const shiftsData = await shiftsRes.json();
      const respiteData = respiteRes.ok ? await respiteRes.json() : [];
      
      if (!Array.isArray(shiftsData)) {
        throw new Error("Invalid shifts response format");
      }

      const individualShifts = shiftsData.filter((d: any) => !d.respite_booking_id);

      const mappedShifts = individualShifts.map((d: any) => ({
        id: d.id,
        title: `${d.client_first_name} ${d.client_last_name} (${d.staff_first_name || 'Unassigned'})`,
        start: new Date((d.start_time || '').includes('T') ? (d.start_time || '') : (d.start_time || '').replace(' ', 'T')),
        end: new Date((d.end_time || '').includes('T') ? (d.end_time || '') : (d.end_time || '').replace(' ', 'T')),
        staffId: d.staff_id,
        staffName: `${d.staff_first_name} ${d.staff_last_name}`.trim(),
        clientId: d.client_id,
        clientName: `${d.client_first_name} ${d.client_last_name}`.trim(),
        status: d.status,
        serviceName: d.service_name || (d.services_json && String(d.services_json).includes('orientation') ? 'Orientation' : (d.services_json && String(d.services_json).includes('custom') ? 'Custom Service' : '')),
        actualStartTime: d.actual_start_time,
        actualEndTime: d.actual_finish_time,
      }));
      
      const mappedRespites: any[] = [];
      const childShifts: any[] = [];

      respiteData.forEach((d: any) => {
        mappedRespites.push({
          id: `rb_${d.id}`,
          title: `${d.client_first_name} ${d.client_last_name} (STA / Respite)`,
          start: new Date((d.start_time || '').includes('T') ? (d.start_time || '') : (d.start_time || '').replace(' ', 'T')),
          end: new Date((d.end_time || '').includes('T') ? (d.end_time || '') : (d.end_time || '').replace(' ', 'T')),
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
              start: new Date((s.start_time || '').includes('T') ? (s.start_time || '') : (s.start_time || '').replace(' ', 'T')),
              end: new Date((s.end_time || '').includes('T') ? (s.end_time || '') : (s.end_time || '').replace(' ', 'T')),
              staffId: s.staff_id,
              staffName: `${s.staff_first_name} ${s.staff_last_name}`.trim(),
              clientId: d.client_id,
              clientName: `${d.client_first_name} ${d.client_last_name}`.trim(),
              status: s.status,
              serviceName: s.service_name || (s.services_json && String(s.services_json).includes('orientation') ? 'Orientation' : (s.services_json && String(s.services_json).includes('custom') ? 'Custom Service' : '')),
              actualStartTime: s.actual_start_time,
              actualEndTime: s.actual_finish_time,
            });
          });
        }
      });

      setEvents([...mappedShifts, ...mappedRespites, ...childShifts].filter((e: any) => {
        if (!e.status) return true;
        return ['PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(e.status.toUpperCase());
      }));

      // Clear any previous error or reconnecting state once connection succeeds
      setFetchError(null);
      setIsReconnecting(false);
    } catch (e: any) {
      console.error("Wallboard fetch error:", e);
      setIsReconnecting(true);
      setEvents((prev) => {
        if (prev.length === 0) {
          setFetchError(e?.message || 'Connection interrupted');
        }
        return prev;
      });
    } finally {
      clearTimeout(timeoutId);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();

    // Poll every 5 seconds while reconnecting after a Wi-Fi drop, or every 25 seconds when healthy
    const pollDelay = isReconnecting ? 5000 : 25000;
    const interval = setInterval(() => {
      fetchData();
      if (!manualMode) {
        setDate(subDays(new Date(), 1));
      }
    }, pollDelay);

    const handleOnline = () => {
      fetchData();
      if (!dailyQuote || !dailyQuote.imageUrl) {
        fetchQuote();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, manualMode, isReconnecting]);

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
    const minDate = startOfDay(subDays(new Date(), 1));
    const maxDate = endOfDay(addDays(new Date(), 1));
    
    // Filter events to only those between yesterday and tomorrow
    const activeEvents = events.filter(e => e.start >= minDate && e.start <= maxDate);
    
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
          <div className="flex-none flex justify-center items-center relative gap-0">
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
              className={`-ml-2 text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-emerald-400 to-brand-teal bg-[length:200%_auto] ${isFlickering ? 'animate-flicker' : 'animate-gradient'}`}
            >
              Dream Chasers
            </motion.h1>
          </div>
          <div className="flex-1 flex justify-end items-center gap-3">
            {isReconnecting && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Reconnecting...
              </span>
            )}
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
            <AnimatePresence mode="wait">
              {activeSlide === 'SHIFTS' ? (
                <motion.div
                  key="wallboard-shifts"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="w-full flex flex-col gap-8"
                >
                  {fetchError && groupedEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-amber-400 font-medium text-lg gap-2">
                      <span>Connection interrupted ({fetchError}). Automatically reconnecting...</span>
                    </div>
                  ) : groupedEvents.length === 0 ? (
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
                            const isCancelled = event.status === 'CANCELLED';
                            const isCompleted = (event.status === 'COMPLETED' || !!event.actualEndTime) && !isCancelled;
                            const isActuallyRunning = (event.status === 'IN_PROGRESS' || (!!event.actualStartTime && !event.actualEndTime)) && !isCancelled;
                            const isInProgress = isActuallyRunning && !isCompleted;
                            
                            let containerClass = "transition-all flex items-center p-3 sm:p-4 shadow-sm border-y border-white/[0.05] ";
                            if (isCancelled) {
                              containerClass += "opacity-80 border-l-[6px] border-red-500 bg-red-500/25";
                            } else if (event.status === 'DRAFT') {
                              containerClass += "opacity-90 border-l-[6px] border-orange-400 bg-orange-500/25";
                            } else if (isCompleted) {
                              containerClass += "opacity-80 border-l-[6px] border-brand-green bg-brand-green/25";
                            } else if (isInProgress) {
                              containerClass += "border-l-[6px] border-emerald-400 bg-emerald-500/35 shadow-emerald-500/30 shadow-lg pulse-border ring-1 ring-emerald-500/50";
                            } else {
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
                                    {isCancelled && (
                                      <span className="text-xs bg-red-500/20 text-red-400 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                                        Cancelled
                                      </span>
                                    )}
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
                                    {!isInProgress && !isCompleted && !isCancelled && event.status !== 'DRAFT' && (
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
                </motion.div>
              ) : (
                <motion.div
                  key="wallboard-pnl"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="w-full"
                >
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                    {/* Xero Report Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 mb-6 border-b border-zinc-800">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            {pnlData?.reportTitle || 'Profit and Loss'}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Xero Live
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-zinc-300 font-medium mt-1">
                          {pnlData?.organisationName || 'Happy in the HOME'}
                        </p>
                        {pnlData?.periodSubtitle && (
                          <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
                            {pnlData.periodSubtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-start">
                        <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-950/70 px-3 py-1.5 rounded-lg border border-zinc-800">
                          <input
                            type="checkbox"
                            checked={compactView}
                            onChange={(e) => setCompactView(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-brand-teal focus:ring-brand-teal"
                          />
                          <span>Compact view</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => fetchPnLReport(true)}
                          disabled={pnlLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                          title="Refresh from Xero"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${pnlLoading ? 'animate-spin text-brand-teal' : ''}`} />
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>

                    {/* Report Body */}
                    {pnlLoading && !pnlData ? (
                      <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <RefreshCw className="w-7 h-7 animate-spin text-brand-teal" />
                        <span className="text-sm font-medium">Loading Xero Profit and Loss report...</span>
                      </div>
                    ) : !pnlData || !pnlData.success ? (
                      <div className="py-12 px-6 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center max-w-2xl mx-auto my-4">
                        <p className="text-base font-bold text-amber-300 mb-2">
                          Unable to Load Xero Profit &amp; Loss Report
                        </p>
                        <p className="text-xs md:text-sm text-amber-100/90 leading-relaxed">
                          {pnlData?.error || 'Please ensure Xero is connected in Settings > Xero Integration and that the accounting.reports.profitandloss.read permission is authorized.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-zinc-700/80 text-xs md:text-sm font-semibold text-zinc-400">
                              <th className="py-3 pr-4 w-[40%]"></th>
                              {pnlData.monthHeaders.map((header, idx) => (
                                <th
                                  key={header + idx}
                                  className={`py-3 px-4 text-right whitespace-nowrap ${
                                    idx === 0 ? 'text-brand-teal font-bold' : 'text-zinc-300'
                                  }`}
                                >
                                  {header}
                                  {idx === 0 && (
                                    <span className="block text-[10px] font-normal text-brand-teal/80 uppercase tracking-wider">
                                      Current (MTD)
                                    </span>
                                  )}
                                </th>
                              ))}
                              {pnlData.hasYtd && (
                                <th className="py-3 pl-4 text-right whitespace-nowrap text-zinc-200 font-bold">
                                  Year to date
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="text-sm md:text-base">
                            {pnlData.sections.map((section, sIdx) => {
                              const visibleRows = section.rows.filter((row) => {
                                if (!compactView || row.isSummary) return true;
                                const hasNonZeroMonth = row.values.some((v) => Math.abs(v) >= 0.005);
                                const hasNonZeroYtd = row.ytdValue !== null && Math.abs(row.ytdValue) >= 0.005;
                                return hasNonZeroMonth || hasNonZeroYtd;
                              });

                              if (visibleRows.length === 0) return null;

                              return (
                                <React.Fragment key={(section.title || 'sec') + sIdx}>
                                  {section.title && (
                                    <tr className="border-b border-zinc-800/90">
                                      <td
                                        colSpan={1 + pnlData.monthHeaders.length + (pnlData.hasYtd ? 1 : 0)}
                                        className="pt-6 pb-2 font-bold text-white text-base md:text-lg tracking-tight"
                                      >
                                        {section.title}
                                      </td>
                                    </tr>
                                  )}
                                  {visibleRows.map((row, rIdx) => {
                                    const isMajorSummary =
                                      row.isSummary &&
                                      (row.label.toLowerCase().includes('gross profit') ||
                                        row.label.toLowerCase().includes('net profit'));

                                    return (
                                      <tr
                                        key={row.label + rIdx}
                                        className={
                                          isMajorSummary
                                            ? 'border-t-2 border-b-2 border-zinc-600 bg-zinc-800/40 font-extrabold text-white'
                                            : row.isSummary
                                              ? 'border-t border-b border-zinc-700 font-bold text-zinc-100 bg-zinc-900/40'
                                              : 'border-b border-zinc-800/60 hover:bg-white/[0.02] text-zinc-300'
                                        }
                                      >
                                        <td className={`py-2.5 pr-4 ${row.isSummary ? 'font-bold text-white' : 'pl-2 text-zinc-200'}`}>
                                          {row.label}
                                        </td>
                                        {row.values.map((val, vIdx) => {
                                          const formatted = formatPnLAmount(val);
                                          const isZero = formatted === '-';
                                          return (
                                            <td
                                              key={vIdx}
                                              className={`py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                                                row.isSummary
                                                  ? isMajorSummary
                                                    ? val < 0
                                                      ? 'text-rose-400 font-extrabold'
                                                    : 'text-emerald-300 font-extrabold'
                                                    : 'text-white font-bold'
                                                  : isZero
                                                    ? 'text-zinc-600'
                                                    : 'text-sky-400'
                                              }`}
                                            >
                                              {formatted}
                                            </td>
                                          );
                                        })}
                                        {pnlData.hasYtd && (
                                          <td
                                            className={`py-2.5 pl-4 text-right font-mono tabular-nums whitespace-nowrap ${
                                              row.isSummary
                                                ? isMajorSummary
                                                  ? (row.ytdValue || 0) < 0
                                                    ? 'text-rose-400 font-extrabold'
                                                    : 'text-emerald-300 font-extrabold'
                                                  : 'text-white font-bold'
                                                : formatPnLAmount(row.ytdValue) === '-'
                                                  ? 'text-zinc-600'
                                                  : 'text-sky-300'
                                            }`}
                                          >
                                            {formatPnLAmount(row.ytdValue)}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer with Quote */}
        <div
          onClick={() => fetchQuote()}
          title="Click for next quote"
          className="flex flex-col items-center justify-center p-3 sm:px-6 bg-zinc-900/50 border-t border-zinc-800 min-h-[64px] shrink-0 cursor-pointer hover:bg-zinc-900/70 transition-colors"
        >
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
                  {dailyQuote.imageUrl ? (
                    <img 
                      src={dailyQuote.imageUrl} 
                      alt={dailyQuote.author} 
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-zinc-700 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-teal/15 border border-brand-teal/30 text-brand-teal flex items-center justify-center font-bold text-sm shrink-0">
                      {(dailyQuote.author || 'Q')
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
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
          <button
            onClick={() => {
              const nextSlide = activeSlide === 'SHIFTS' ? 'PNL' : 'SHIFTS';
              setActiveSlide(nextSlide);
              if (nextSlide === 'PNL') fetchPnLReport(false);
            }}
            className="p-3 bg-zinc-900 border border-zinc-700 rounded-full shadow-lg text-zinc-300 hover:text-brand-teal transition-colors"
            title={activeSlide === 'SHIFTS' ? 'Switch to Xero Profit & Loss' : 'Switch to Live Shift Tracker'}
          >
            {activeSlide === 'SHIFTS' ? <BarChart3 className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsRotationLocked((prev) => !prev)}
            className={`p-3 bg-zinc-900 border rounded-full shadow-lg transition-colors ${
              isRotationLocked ? 'border-amber-500/60 text-amber-400' : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title={isRotationLocked ? 'Auto-Rotation Locked (Click to Resume 10m/2m Cycle)' : 'Auto-Rotating (10m Shifts / 2m P&L) — Click to Lock Current View'}
          >
            {isRotationLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>

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
