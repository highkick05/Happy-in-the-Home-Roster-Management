import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Plus, Maximize, Minimize, Bed, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AddShiftModal from './AddShiftModal';
import AddRespiteBookingModal from './AddRespiteBookingModal';
import ShiftDetailsModal from './ShiftDetailsModal';
import ActiveShiftModal from './ActiveShiftModal';

const locales = {
  'en-US': enUS,
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DnDCalendar = withDragAndDrop(Calendar);

export interface ShiftEvent {
  id: number | string; // string for rb_X
  title: string;
  start: Date;
  end: Date;
  staffId?: number;
  resourceId?: number;
  staffName?: string;
  clientId: number;
  clientName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS' | 'PENDING_SYNC';
  serviceId?: number;
  serviceName?: string;
  serviceCode?: string;
  serviceRate?: number;
  serviceUnit?: string;
  serviceRatesJson?: string;
  serviceType?: string;
  fundingType?: string;
  isRespiteWrapper?: boolean;
  isRespiteChild?: boolean;
  respiteBookingId?: number;
  respiteData?: any;
  notes?: string;
  servicesData?: any[];
  providerTravelKm?: number;
  providerTravelCost?: number;
  homeCareTravelKm?: number;
  homeCareTravelTotal?: number;
  abtKm?: number;
  abtCost?: number;
  transportRouteLog?: string;
  travelBreakdown?: string;
}

export default function RosterCalendar() {
  const { token, user, settings } = useAuth();

  const localizer = React.useMemo(() => {
    const startDayStr = settings?.invoicingStartDay || 'Monday';
    const weekStartsOn = DAYS_OF_WEEK.indexOf(startDayStr) !== -1 ? DAYS_OF_WEEK.indexOf(startDayStr) : 1;
    
    return dateFnsLocalizer({
      format,
      parse,
      startOfWeek: (d: any) => startOfWeek(d, { weekStartsOn: weekStartsOn as any }),
      getDay,
      locales,
    });
  }, [settings?.invoicingStartDay]);

  const [events, setEvents] = useState<ShiftEvent[]>([]);
  const [view, setView] = useState<View>(() => {
    return Views.WEEK;
  });

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobileOrTablet(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isStaffMobileOrTablet = user?.role !== 'ADMIN' && isMobileOrTablet;

  // Render safe views 
  const allowedViews: any[] = isStaffMobileOrTablet 
    ? [Views.AGENDA] 
    : [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

  const activeView = allowedViews.includes(view as any) ? view : Views.AGENDA;

  // Ensure staff sees AGENDA by default on mobile/tablet (if they didn't have it, activeView handles safety during render)
  useEffect(() => {
    if (isStaffMobileOrTablet) {
      setView(Views.AGENDA);
    } else if (user?.role !== 'ADMIN') {
      setView(Views.AGENDA); // Actually give all staff agenda by default
    } else if (!allowedViews.includes(view as any)) {
      setView(Views.WEEK);
    }
  }, [user?.role, isStaffMobileOrTablet]);

  const [date, setDate] = useState(new Date());

  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isRespiteModalOpen, setIsRespiteModalOpen] = useState(false);
  const [initialShiftData, setInitialShiftData] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Filters and Grouping
  const [clientFilter, setClientFilter] = useState<string>('');
  const [staffFilter, setStaffFilter] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'STAFF' | 'CLIENT'>('STAFF');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string | number>>(new Set());
  const longPressHandledRef = React.useRef(0);

  const [holidays, setHolidays] = useState<any[]>([]);

  const fetchHolidays = async (year: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/holidays?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
      }
    } catch (e) {
      console.error('Failed to fetch holidays:', e);
    }
  };

  useEffect(() => {
    fetchHolidays(date.getFullYear());
  }, [date.getFullYear(), token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [shiftsRes, respiteRes, staffRes, clientsRes, servicesRes] = await Promise.all([
        fetch(`/api/shifts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/respite-bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/services`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (shiftsRes.ok && respiteRes.ok) {
        const shiftsData = await shiftsRes.json();
        const respiteData = await respiteRes.json();
        
        // Filter out shifts that are part of a respite booking
        const individualShifts = shiftsData.filter((d: any) => !d.respite_booking_id);

        const mappedShifts = individualShifts.map((d: any) => ({
          id: d.id,
          title: `${d.client_first_name} ${d.client_last_name} (${d.staff_first_name || 'Unassigned'})`,
          start: new Date(d.start_time),
          end: new Date(d.end_time),
          staffId: d.staff_id,
          resourceId: d.staff_id, // required for react-big-calendar resource view
          staffName: `${d.staff_first_name} ${d.staff_last_name}`,
          clientId: d.client_id,
          clientName: `${d.client_first_name} ${d.client_last_name}`,
          status: d.status,
          serviceId: d.service_id,
          serviceName: d.service_name,
          serviceCode: d.service_code,
          serviceRate: d.service_rate,
          serviceUnit: d.service_unit,
          serviceRatesJson: d.service_rates_json,
          serviceType: d.service_type,
          fundingType: d.funding_type,
          notes: d.notes,
          servicesData: d.servicesData,
          providerTravelKm: d.provider_travel_km,
          providerTravelCost: d.provider_travel_cost,
          homeCareTravelKm: d.home_care_travel_km,
          homeCareTravelTotal: d.home_care_travel_total,
          abtKm: d.abt_km,
          abtCost: d.abt_cost,
          transportRouteLog: d.transport_route_log,
        }));
        
        const mappedRespites: any[] = [];
        const childShifts: any[] = [];

        respiteData.forEach((d: any) => {
          // Push the wrapper
          mappedRespites.push({
            id: `rb_${d.id}`,
            title: `${d.client_first_name} ${d.client_last_name} (STA / Respite)`,
            start: new Date(d.start_time),
            end: new Date(d.end_time),
            clientId: d.client_id,
            clientName: `${d.client_first_name} ${d.client_last_name}`,
            status: d.status,
            isRespiteWrapper: true,
            respiteData: d
          });

          // Extract child shifts
          if (Array.isArray(d.shifts)) {
            d.shifts.forEach((s: any) => {
              childShifts.push({
                id: s.id,
                title: `${d.client_first_name} ${d.client_last_name} (${s.staff_first_name || 'Unassigned'})`,
                start: new Date(s.start_time),
                end: new Date(s.end_time),
                staffId: s.staff_id,
                resourceId: s.staff_id,
                staffName: `${s.staff_first_name} ${s.staff_last_name}`,
                clientId: d.client_id,
                clientName: `${d.client_first_name} ${d.client_last_name}`,
                status: s.status,
                serviceId: s.service_id,
                serviceName: s.service_name,
                serviceCode: s.service_code,
                serviceRate: s.service_rate,
                serviceUnit: s.service_unit,
                serviceRatesJson: s.service_rates_json,
                serviceType: s.service_type,
                fundingType: s.funding_type || 'NDIS',
                notes: s.notes,
                servicesData: s.services_json ? JSON.parse(s.services_json) : [],
                providerTravelKm: s.provider_travel_km,
                providerTravelCost: s.provider_travel_cost,
                homeCareTravelKm: s.home_care_travel_km,
                homeCareTravelTotal: s.home_care_travel_total,
                abtKm: s.abt_km,
                abtCost: s.abt_cost,
                transportRouteLog: s.transport_route_log,
                isRespiteChild: true,
                respiteBookingId: d.id,
                respiteData: d
              });
            });
          }
        });

        let allEvents = [...mappedShifts, ...mappedRespites, ...childShifts];
        
        try {
           const pendingStr = localStorage.getItem('pending_shifts');
           if (pendingStr) {
               const pendingShifts = JSON.parse(pendingStr);
               if (Array.isArray(pendingShifts)) {
                   const pendingIds = pendingShifts.map(p => p.shiftId);
                   allEvents = allEvents.map(e => 
                      pendingIds.includes(e.id) ? { ...e, status: 'PENDING_SYNC' as any } : e
                   );
               }
           }
        } catch (err) {
           console.error('Error applying pending statusses', err);
        }

        setEvents(allEvents);
      }
      
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData.filter((user: any) => user.role !== 'ADMIN'));
      }
      if (clientsRes.ok) setClientList(await clientsRes.json());
      if (servicesRes.ok) setServicesList(await servicesRes.json());
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchData();
    };
  
    window.addEventListener('offline-sync-completed', handleSyncComplete);
    return () => {
      window.removeEventListener('offline-sync-completed', handleSyncComplete);
    };
  }, [fetchData]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || !events.length) return;
    
    const now = new Date();
    let targetShift = events.find(e => 
      e.status === 'IN_PROGRESS' && 
      e.staffId === user?.id && 
      !e.isRespiteWrapper
    );
    
    if (!targetShift) {
      const upcomingShifts = events.filter(e => {
        if (e.status !== 'PUBLISHED') return false;
        if (e.staffId !== user?.id) return false;
        if (e.isRespiteWrapper) return false;
        const diffMs = e.start.getTime() - now.getTime();
        const diffMins = diffMs / 60000;
        const maxEarly = settings?.max_early_clockin_minutes !== undefined ? parseInt(settings.max_early_clockin_minutes as string) : 180;
        return diffMins <= maxEarly;
      }).sort((a, b) => a.start.getTime() - b.start.getTime());
      
      if (upcomingShifts.length > 0) {
        targetShift = upcomingShifts[0];
      }
    }
    
    if (targetShift && !isDetailsModalOpen) {
      setSelectedShift(targetShift);
      setIsDetailsModalOpen(true);
    }
  }, [events, user?.role, user?.id, isDetailsModalOpen]);

  useEffect(() => {
    if (selectedShift) {
      const updatedShift = events.find(e => e.id === selectedShift.id);
      if (updatedShift && updatedShift !== selectedShift) {
        setSelectedShift(updatedShift);
      }
    }
  }, [events]);

  const filteredEvents = events.filter(e => {
    if (clientFilter && e.clientId?.toString() !== clientFilter) return false;
    
    // Non-admins should not see the respite wrapper, only their child shifts
    if (user?.role !== 'ADMIN' && e.isRespiteWrapper) {
      return false;
    }

    // Non-admins should only see their own child shifts
    if (user?.role !== 'ADMIN' && e.isRespiteChild && e.staffId !== user?.id) {
      return false;
    }

    if (staffFilter) {
      if (e.isRespiteWrapper && e.respiteData?.shifts) {
        // For respite bookings, check if the staff is assigned to any of the child shifts
        const isStaffAssigned = e.respiteData.shifts.some((s: any) => s.staff_id?.toString() === staffFilter);
        if (!isStaffAssigned) return false;
      } else {
        if (e.staffId?.toString() !== staffFilter) return false;
      }
    }
    return true;
  });

  const onEventResize: withDragAndDropProps['onEventResize'] = async (data) => {
    const { event, start, end } = data;
    if (user?.role !== 'ADMIN') return;
    
    const sEvent = event as ShiftEvent;
    if (typeof sEvent.id === 'string' && sEvent.id.startsWith('rb_')) return; // ignore resize for respite bookings
    
    try {
      const res = await fetch(`/api/shifts/${sEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString()
        })
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const onEventDrop: withDragAndDropProps['onEventDrop'] = async (data) => {
    const { event, start, end, resourceId } = data as any;
    if (user?.role !== 'ADMIN') return;
    
    const sEvent = event as ShiftEvent;
    if (typeof sEvent.id === 'string' && sEvent.id.startsWith('rb_')) return; // ignore drop for respite bookings
    
    try {
      const payload: any = {
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      };
      
      if (resourceId) {
        if (groupBy === 'STAFF') payload.staffId = resourceId;
        if (groupBy === 'CLIENT') payload.clientId = resourceId;
      } else {
        payload.staffId = sEvent.staffId;
      }

      const res = await fetch(`/api/shifts/${sEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const [initialRespiteData, setInitialRespiteData] = useState<any>(null);

  const onSelectEvent = async (event: ShiftEvent) => {
    if (Date.now() - longPressHandledRef.current < 600) return; // Prevent click immediately after long press
    if (multiSelectMode) {
      setSelectedEventIds(prev => {
        const next = new Set(prev);
        if (next.has(event.id)) next.delete(event.id);
        else next.add(event.id);
        return next;
      });
      return;
    }
    setSelectedShift(event);
    setIsDetailsModalOpen(true);
  };

  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(false);

  const handleBatchAction = async (action: 'publish' | 'unpublish' | 'delete', forceConfirm = false) => {
    if (!token || selectedEventIds.size === 0) return;
    
    if (action === 'delete' && !forceConfirm) {
      setConfirmDeleteBatch(true);
      return;
    }

    setBatchActionLoading(true);
    try {
      const res = await fetch('/api/shifts/batch-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, shiftIds: Array.from(selectedEventIds) })
      });
      if (res.ok) {
        setMultiSelectMode(false);
        setSelectedEventIds(new Set());
        setConfirmDeleteBatch(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || `Failed to batch ${action}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error during batch action');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const onSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'ADMIN') return;
    const { start, end, resourceId } = slotInfo;
    
    // Convert to local date and time strings for the form
    const startStr = start.toISOString(); // this might be UTC, so let's format locally
    const dateStr = start.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' natively
    const startTimeStr = start.toTimeString().slice(0, 5); // 'HH:mm'
    const endTimeStr = end.toTimeString().slice(0, 5);
    
    // We can pass this initial info to the AddShiftModal
    const initialData: any = {
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
    };

    if (resourceId) {
      if (groupBy === 'STAFF') initialData.staffId = String(resourceId);
      if (groupBy === 'CLIENT') initialData.clientId = String(resourceId);
    }
    if (clientFilter) initialData.clientId = clientFilter;
    if (staffFilter) initialData.staffId = staffFilter;

    setInitialShiftData(initialData);
    setIsShiftModalOpen(true);
  };

  const handleAddShift = () => {
    setInitialShiftData(null);
    setIsShiftModalOpen(true);
  };

  const handleAddRespiteBooking = () => {
    setInitialRespiteData(null);
    setIsRespiteModalOpen(true);
  };

  const handlePublishDrafts = async () => {
    try {
      const res = await fetch('/api/shifts/publish-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchData();
        const data = await res.json();
        // optionally show toast
      } else {
        const err = await res.json();
        alert(`Failed to publish drafts: ${err.error}`);
      }
    } catch (e) {
      alert(`Error publishing drafts`);
    }
  };

  const eventStyleGetter = (event: ShiftEvent) => {
    if (view === Views.AGENDA) {
      return {
        style: {
           background: 'transparent',
           border: 'none',
           color: 'inherit',
           padding: '8px',
           backgroundColor: multiSelectMode && selectedEventIds.has(event.id) ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
        }
      };
    }

    const isSelected = multiSelectMode && selectedEventIds.has(event.id);

    let backgroundColor = '#0ea5e9'; // brand-blue
    let border = isSelected ? '2px solid white' : 'none';
    let backgroundImage = 'none';

    if (event.status === 'DRAFT') {
      backgroundColor = '#52525b'; // zinc-600
      border = isSelected ? '2px solid white' : '1px dashed #a1a1aa'; // zinc-400
    }
    if (event.status === 'COMPLETED') backgroundColor = '#a3e635'; // brand-green
    if (event.status === 'IN_PROGRESS') backgroundColor = '#38bdf8'; // light blue
    if (event.status === 'PENDING_SYNC') backgroundColor = '#f59e0b'; // amber-500
    if (event.status === 'CANCELLED') backgroundColor = '#ef4444'; // red-500
    
    if (event.isRespiteWrapper) {
      backgroundColor = '#8b5cf6'; // violet-500
      border = isSelected ? '2px solid white' : '1px inset #7c3aed';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: isSelected ? 1 : 0.9,
        color: (event.status === 'COMPLETED' || event.status === 'PENDING_SYNC') ? '#0b1120' : 'white',
        border,
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: isSelected ? '0 0 0 2px rgba(14, 165, 233, 0.5)' : 'none',
      },
    };
  };

  const calendarComponents = React.useMemo(() => {
    const CustomEvent = ({ event, title }: any) => {
      const timerRef = React.useRef<any>(null);
      
      React.useEffect(() => {
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
        };
      }, []);

      if (!event) return null;

      const handleMouseDown = () => {
        if (multiSelectMode) return;
        timerRef.current = setTimeout(() => {
          longPressHandledRef.current = Date.now();
          setMultiSelectMode(true);
          setSelectedEventIds(new Set([event.id]));
        }, 500); // long press 500ms
      };

      const handleMouseUp = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };

      return (
        <div 
          className="w-full h-full flex flex-row items-center overflow-hidden truncate px-1 relative"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          {event.isRespiteWrapper && (
            <div className="flex items-center gap-1 shrink-0 mr-1 relative z-10">
              <Bed className="w-3.5 h-3.5 text-violet-100 drop-shadow-sm" />
            </div>
          )}
          <span className="truncate relative z-10">{title}</span>

          {event.isRespiteWrapper && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 25 }).map((_, i) => {
                const seedId = typeof event.id === 'string' ? event.id.charCodeAt(0) : (Number(event.id) || 123);
                // better deterministic spreading
                const hash1 = Math.abs(Math.sin(seedId + i + 1)) * 10000;
                const hash2 = Math.abs(Math.cos(seedId + i + 2)) * 10000;
                
                const top = 5 + (hash1 % 90);
                const left = 2 + (hash2 % 96);
                const delay = (hash1 % 30) / 10;
                const duration = 1.5 + (hash2 % 20) / 10;
                const size = 5 + (hash1 % 6);
                return (
                  <Star
                    key={i}
                    className="absolute text-white fill-white drop-shadow-sm opacity-0"
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      animation: `sparkle-twinkle ${duration}s ease-in-out infinite`,
                      animationDelay: `${delay}s`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    };

    const AgendaEvent = ({ event }: any) => {
      const timerRef = React.useRef<any>(null);

      React.useEffect(() => {
        return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
        };
      }, []);

      if (!event) return null;

      const handleMouseDown = () => {
        if (multiSelectMode) return;
        timerRef.current = setTimeout(() => {
          longPressHandledRef.current = Date.now();
          setMultiSelectMode(true);
          setSelectedEventIds(new Set([event.id]));
        }, 500); // long press 500ms
      };

      const handleMouseUp = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };

      let bgClass = 'bg-[#121214] border-white/[0.05]';
      let statusColor = 'text-zinc-400';
      let badgeLabel = event.status;
      
      if (event.status === 'COMPLETED') {
         bgClass = 'bg-brand-green/10 border-brand-green/20';
         statusColor = 'text-brand-green';
      } else if (event.status === 'IN_PROGRESS') {
         bgClass = 'bg-blue-500/10 border-blue-500/20';
         statusColor = 'text-blue-400';
         badgeLabel = 'In Progress';
      } else if (event.status === 'PENDING_SYNC') {
         bgClass = 'bg-amber-500/10 border-amber-500/20';
         statusColor = 'text-amber-500';
         badgeLabel = 'Pending Sync';
      } else if (event.status === 'PUBLISHED') {
         bgClass = 'bg-indigo-500/10 border-brand-teal/20';
         statusColor = 'text-brand-teal';
      } else if (event.status === 'DRAFT') {
         bgClass = 'bg-zinc-800/50 border-zinc-700/50';
         statusColor = 'text-zinc-500';
      } else if (event.status === 'CANCELLED') {
         bgClass = 'bg-red-500/10 border-red-500/20';
         statusColor = 'text-red-500';
         badgeLabel = 'Cancelled';
      }

      if (event.isRespiteWrapper) {
         bgClass = 'bg-violet-500/10 border-violet-500/20';
         statusColor = 'text-violet-400';
      }

      const isSelected = multiSelectMode && selectedEventIds.has(event.id);
      if (isSelected) {
         bgClass += ' ring-2 ring-brand-blue ring-offset-1 ring-offset-brand-navy';
      }

      return (
        <div 
           className={`flex flex-col w-full cursor-pointer group p-3 my-1 rounded-xl border ${bgClass} hover:opacity-90 transition-all`}
           onMouseDown={handleMouseDown}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onTouchStart={handleMouseDown}
           onTouchEnd={handleMouseUp}
        >
          <div className="flex items-start justify-between mb-1.5 gap-2">
            <span className="font-semibold text-zinc-100 text-[14px] leading-tight tracking-wide">{event.title}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current ${statusColor} shrink-0`}>
                {badgeLabel}
            </span>
          </div>
          <div className="flex flex-col gap-1 w-full">
             {event.isRespiteWrapper ? (
               <span className="text-violet-400 font-medium text-[12px]">STA / Respite</span>
             ) : (
               <div className="flex flex-col gap-1.5 w-full">
                 <div className="flex items-center gap-1">
                   <span className="text-zinc-300 font-medium text-[12px] truncate">👨‍💼 {event.staffName || 'Unassigned'}</span>
                 </div>
                 {event.servicesData && event.servicesData.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {event.servicesData.map((sd: any, idx: number) => {
                        const srv = servicesList.find((s: any) => s.id === sd.serviceId);
                        const srvName = srv ? srv.name : (event.serviceName || 'Unknown Service');
                        return (
                          <span key={idx} className="bg-black/20 text-zinc-300 px-1.5 py-0.5 rounded outline outline-1 outline-white/5 font-medium text-[10px] max-w-full truncate" title={srvName}>
                            {srvName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    event.serviceName && <div className="flex flex-wrap gap-1"><span className="bg-black/20 text-zinc-300 px-1.5 py-0.5 rounded outline outline-1 outline-white/5 font-medium text-[10px] max-w-full truncate" title={event.serviceName}>{event.serviceName}</span></div>
                  )}
               </div>
             )}
          </div>
        </div>
      );
    };

    const AgendaTime = ({ event }: any) => {
      if (event.isRespiteWrapper) {
        return <div className="flex items-center h-full"><span className="text-brand-teal/80 font-medium text-[12px] bg-indigo-500/5 px-2 py-0.5 rounded border border-brand-teal/10">Multi-day</span></div>;
      }
      const start = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      const end = event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      return <div className="flex items-center h-full"><span className="text-zinc-300 font-medium text-[13px] whitespace-nowrap tracking-wide flex items-center gap-1.5">{start} <span className="text-zinc-600 font-bold">→</span> {end}</span></div>;
    };

    const AgendaDate = ({ day }: any) => {
      const formatted = day.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
      return <div className="font-bold text-brand-teal text-[14px] md:text-[15px] tracking-wide flex items-start h-full">{formatted}</div>;
    };

    const MonthDateHeader = ({ date, label }: any) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const holiday = holidays.find(h => h.date.startsWith(dateStr));
      return (
        <div className="flex flex-col items-end pr-1 pt-1 h-full pointer-events-none">
          <span className="text-zinc-300 font-medium">{label}</span>
          {holiday && <span className="text-[9px] font-bold text-amber-500 mt-0.5 truncate max-w-full pointer-events-auto bg-amber-500/10 px-1 rounded">{holiday.name}</span>}
        </div>
      );
    };

    const WeekHeader = ({ date, label }: any) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const holiday = holidays.find(h => h.date.startsWith(dateStr));
      return (
        <div className="flex flex-col items-center py-1">
          <span className="text-sm font-medium">{label}</span>
          {holiday && <span className="text-[9px] font-bold text-amber-500 truncate max-w-full bg-amber-500/10 px-1 mt-0.5 rounded">{holiday.name}</span>}
        </div>
      );
    };

    return {
      event: CustomEvent,
      month: {
        dateHeader: MonthDateHeader,
      },
      week: {
        header: WeekHeader,
      },
      day: {
        header: WeekHeader,
      },
      agenda: {
        event: AgendaEvent,
        time: AgendaTime,
        date: AgendaDate,
      }
    };
  }, [multiSelectMode, holidays, servicesList]);

  const customDayPropGetter = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => h.date.startsWith(dateStr));
    if (isHoliday) {
      return {
        className: 'bg-amber-500/5',
        style: {
          backgroundColor: '#3b2313' // dark yellow/amber for dark mode
        }
      };
    }
    return {};
  };

  const resources = groupBy === 'STAFF' 
    ? (staffList.length > 0 ? staffList.map(s => ({
        id: s.id,
        title: `${s.first_name || s.firstName} ${s.last_name || s.lastName}`
      })) : undefined)
    : (clientList.length > 0 ? clientList.map(c => ({
        id: c.id,
        title: `${c.first_name || c.firstName} ${c.last_name || c.lastName}`
      })) : undefined);

  // Update resourceIdAccessor based on grouping
  const mappedEvents = filteredEvents.map(e => ({
    ...e,
    resourceId: groupBy === 'STAFF' ? e.staffId : e.clientId
  }));

  return (
    <div className={`flex flex-col space-y-4 p-5 text-zinc-100 ${isFullScreen ? 'fixed inset-0 z-[100] bg-brand-bg pb-20 md:pb-4' : 'h-full bg-brand-navy border border-border-subtle rounded-xl'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-6 md:mb-0">Roster Management</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {user?.role === 'ADMIN' && (
            <>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'STAFF' | 'CLIENT')}
                className="bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
              >
                <option value="STAFF">Group by Staff</option>
                <option value="CLIENT">Group by Client</option>
              </select>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">All Clients</option>
                {clientList.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>

              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">All Staff</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>

              {multiSelectMode ? (
                <div className="flex items-center space-x-2 w-full sm:w-auto bg-brand-bg rounded p-1 border border-brand-teal/30">
                   <span className="text-xs font-semibold px-2 text-brand-teal whitespace-nowrap">{selectedEventIds.size} Selected</span>
                   
                   {confirmDeleteBatch ? (
                     <>
                       <span className="text-xs text-zinc-300 px-2 border-l border-border-subtle whitespace-nowrap">Are you sure?</span>
                       <button onClick={() => handleBatchAction('delete', true)} disabled={batchActionLoading} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">Yes, Delete</button>
                       <button onClick={() => setConfirmDeleteBatch(false)} disabled={batchActionLoading} className="px-3 py-1.5 bg-brand-navy hover:bg-[#1f262e] border border-border-subtle text-white rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">No</button>
                     </>
                   ) : (
                     <div className="flex gap-1 overflow-x-auto">
                       <button onClick={() => handleBatchAction('publish')} disabled={batchActionLoading} className="px-3 py-1.5 bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#E6EDF3] rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">Publish</button>
                       <button onClick={() => handleBatchAction('unpublish')} disabled={batchActionLoading} className="px-3 py-1.5 bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#E6EDF3] rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">Unpublish</button>
                       <button onClick={() => handleBatchAction('delete')} disabled={batchActionLoading} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">Delete</button>
                       <button onClick={() => { setMultiSelectMode(false); setSelectedEventIds(new Set()); }} disabled={batchActionLoading} className="px-3 py-1.5 bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#E6EDF3] rounded-md text-[12px] font-medium disabled:opacity-50 whitespace-nowrap transition-colors">Cancel</button>
                     </div>
                   )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setMultiSelectMode(true)}
                    className="flex items-center justify-center px-4 py-2 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[13px] font-medium rounded-md transition-colors w-full sm:w-auto"
                  >
                    Select Mode
                  </button>
                  <button 
                    onClick={handleAddRespiteBooking}
                    className="flex items-center justify-center px-4 py-2 bg-violet-600 hover:bg-violet-500 border border-violet-400/50 text-white text-[13px] font-medium rounded-md transition-all shadow-[inset_0px_1px_rgba(255,255,255,0.2)] w-full sm:w-auto"
                  >
                    <Bed className="w-4 h-4 mr-2" />
                    STA / Respite
                  </button>
                  <button 
                    onClick={handleAddShift}
                    className="flex items-center justify-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shift
                  </button>
                  <button 
                    onClick={handlePublishDrafts}
                    className="flex items-center justify-center px-4 py-2 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[13px] font-medium rounded-md transition-colors w-full sm:w-auto"
                  >
                    Publish Drafts
                  </button>
                </div>
              )}
            </>
          )}
          
          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="flex items-center justify-center px-3 py-2 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#8B949E] hover:text-[#E6EDF3] rounded-md transition-colors w-full sm:w-auto"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 bg-brand-bg p-2 md:p-4 rounded-lg border border-border-subtle overflow-y-auto min-h-0 scrollbar-hide">
        {user?.role === 'ADMIN' && activeView !== Views.AGENDA ? (
          <DnDCalendar
            localizer={localizer}
            events={mappedEvents}
            view={activeView}
            date={date}
            views={allowedViews}
            onView={(view: View) => setView(view)}
            onNavigate={(date: Date) => setDate(date)}
            startAccessor={(e: ShiftEvent) => e.start}
            endAccessor={(e: ShiftEvent) => e.end}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={customDayPropGetter}
            components={calendarComponents}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            resizable
            resources={activeView === Views.DAY ? resources : undefined}
            resourceIdAccessor={activeView === Views.DAY ? (r: any) => r?.id : undefined}
            resourceTitleAccessor={activeView === Views.DAY ? (r: any) => r?.title : undefined}
            style={{ height: '100%', minHeight: '500px' }}
            className="text-[#E6EDF3] custom-calendar h-full"
          />
        ) : (
          <Calendar
            localizer={localizer}
            events={mappedEvents}
            view={activeView}
            date={date}
            views={allowedViews}
            onView={(view: View) => setView(view)}
            onNavigate={(date: Date) => setDate(date)}
            startAccessor={(e: ShiftEvent) => e.start}
            endAccessor={(e: ShiftEvent) => e.end}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={customDayPropGetter}
            components={calendarComponents}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            resources={activeView === Views.DAY ? resources : undefined}
            resourceIdAccessor={activeView === Views.DAY ? (r: any) => r?.id : undefined}
            resourceTitleAccessor={activeView === Views.DAY ? (r: any) => r?.title : undefined}
            style={{ height: '100%', minHeight: '500px' }}
            className="text-[#E6EDF3] custom-calendar h-full"
          />
        )}
      </div>

      <AddShiftModal 
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={fetchData}
        staffList={staffList}
        clientList={clientList}
        servicesList={servicesList}
        initialData={initialShiftData}
        holidays={holidays}
      />

      <AddRespiteBookingModal
        isOpen={isRespiteModalOpen}
        onClose={() => setIsRespiteModalOpen(false)}
        onSave={fetchData}
        staffList={staffList}
        clientList={clientList}
        servicesList={servicesList}
        initialData={initialRespiteData}
      />

      <ShiftDetailsModal
        isOpen={isDetailsModalOpen && user?.role === 'ADMIN'}
        onClose={() => setIsDetailsModalOpen(false)}
        onSave={fetchData}
        shift={selectedShift}
        servicesList={servicesList}
        onEdit={(shift) => {
          if (shift.isRespiteWrapper) {
            setInitialRespiteData(shift.respiteData);
            setIsRespiteModalOpen(true);
          } else {
            setInitialShiftData({
              id: shift.id,
              staffId: shift.staffId?.toString(),
              clientId: shift.clientId?.toString(),
              serviceId: shift.serviceId?.toString(),
              startDate: new Date(shift.start).toLocaleDateString('en-CA'),
              endDate: new Date(shift.end).toLocaleDateString('en-CA'),
              date: new Date(shift.start).toLocaleDateString('en-CA'),
              startTime: new Date(shift.start).toTimeString().slice(0, 5),
              endTime: new Date(shift.end).toTimeString().slice(0, 5),
              servicesData: shift.servicesData,
            });
            setIsShiftModalOpen(true);
          }
        }}
      />

      {user?.role !== 'ADMIN' && selectedShift && (
        <ActiveShiftModal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onSave={fetchData}
          shift={selectedShift}
        />
      )}
    </div>
  );
}
