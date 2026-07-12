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
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ActiveShiftModal from './ActiveShiftModal';

const locales = {
  'en-US': enUS,
};

import { ShiftEvent } from "./types";
import CustomAgenda from './CustomAgenda';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DnDCalendar = withDragAndDrop(Calendar);


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
  const [view, setView] = useLocalStorage<View>('roster_view', Views.WEEK);

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

  const calendarViewsMapping = React.useMemo(() => {
    const vObj: any = {};
    if (allowedViews.includes(Views.MONTH)) vObj[Views.MONTH] = true;
    if (allowedViews.includes(Views.WEEK)) vObj[Views.WEEK] = true;
    if (allowedViews.includes(Views.DAY)) vObj[Views.DAY] = true;
    if (allowedViews.includes(Views.AGENDA)) vObj[Views.AGENDA] = CustomAgenda;
    return vObj;
  }, [allowedViews]);

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
  const [clientFilter, setClientFilter] = useLocalStorage<string>('roster_client_filter', '');
  const [staffFilter, setStaffFilter] = useLocalStorage<string>('roster_staff_filter', '');
  const [groupBy, setGroupBy] = useLocalStorage<'STAFF' | 'CLIENT'>('roster_group_by', 'STAFF');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string | number>>(new Set());
  const longPressHandledRef = React.useRef(0);

  useEffect(() => {
    if (clientList.length > 0 && clientFilter) {
      const recordExists = clientList.some((c: any) => c.id.toString() === clientFilter);
      if (!recordExists) {
        setClientFilter('');
      }
    }
  }, [clientList, clientFilter, setClientFilter]);

  useEffect(() => {
    if (staffList.length > 0 && staffFilter && staffFilter !== 'unassigned') {
      const recordExists = staffList.some((s: any) => s.id.toString() === staffFilter);
      if (!recordExists) {
        setStaffFilter('');
      }
    }
  }, [staffList, staffFilter, setStaffFilter]);

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
          staffName: d.staff_id ? `${d.staff_first_name} ${d.staff_last_name}` : 'Unassigned',
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
          actualStartTime: d.actual_start_time,
          actualFinishTime: d.actual_finish_time,
          progressNote: d.progress_note,
          startOdometer: d.odometer_start_reading,
          endOdometer: d.odometer_end_reading,
          isHistorical: d.is_historical,
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
                staffName: s.staff_id ? `${s.staff_first_name} ${s.staff_last_name}` : 'Unassigned',
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
                actualStartTime: s.actual_start_time,
                actualFinishTime: s.actual_finish_time,
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

  // Helper to find outstanding shifts for staff users
  const getOutstandingShift = React.useCallback(() => {
    if (user?.role === 'ADMIN') return null;
    const now = new Date();
    let target = events.find((e: any) => 
      e.status === 'IN_PROGRESS' && 
      e.staffId === user?.id && 
      !e.isRespiteWrapper
    );
    if (!target) {
      const upcomingShifts = events.filter((e: any) => {
        if (e.status !== 'PUBLISHED') return false;
        if (e.staffId !== user?.id) return false;
        if (e.isRespiteWrapper) return false;
        const diffMs = e.start.getTime() - now.getTime();
        const diffMins = diffMs / 60000;
        const maxEarly = settings?.max_early_clockin_minutes !== undefined ? parseInt(settings.max_early_clockin_minutes as string) : 180;
        return diffMins <= maxEarly;
      }).sort((a: any, b: any) => a.start.getTime() - b.start.getTime());
      
      if (upcomingShifts.length > 0) {
        target = upcomingShifts[0];
      }
    }
    return target;
  }, [events, user, settings]);

  const lastAutoOpenedShiftId = React.useRef<string | number | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN' || !events.length) return;
    
    const targetShift = getOutstandingShift();
    
    // Auto-open if we have an outstanding shift and haven't auto-opened IT specifically before
    // OR if we don't have it open. 
    if (targetShift && !isDetailsModalOpen && lastAutoOpenedShiftId.current !== targetShift.id) {
      lastAutoOpenedShiftId.current = targetShift.id;
      setSelectedShift(targetShift);
      setIsDetailsModalOpen(true);
    } else if (!targetShift) {
      // If there are no outstanding shifts, clear the ref so if one appears, it pops up
      lastAutoOpenedShiftId.current = null;
    }
  }, [events, user?.role, user?.id, getOutstandingShift, isDetailsModalOpen]);

  useEffect(() => {
    setSelectedShift(prev => {
      if (!prev) return prev;
      const updatedShift = events.find(e => e.id === prev.id);
      return (updatedShift && updatedShift !== prev) ? updatedShift : prev;
    });
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

    if (staffFilter === 'unassigned') {
      if (e.isRespiteWrapper && e.respiteData?.shifts) {
        const isStaffAssigned = e.respiteData.shifts.some((s: any) => !s.staff_id);
        if (!isStaffAssigned) return false;
      } else {
        if (e.staffId !== null && e.staffId !== undefined) return false;
      }
    } else if (staffFilter) {
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
      if (res.status === 409) {
          const data = await res.json();
          const msgs = (data.conflicts || []).map((c: any) => c.message).join('\n');
          alert('Conflict detected:\n' + msgs);
      } else if (res.ok) {
          fetchData();
      }
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
      if (res.status === 409) {
          const data = await res.json();
          const msgs = (data.conflicts || []).map((c: any) => c.message).join('\n');
          alert('Conflict detected:\n' + msgs);
      } else if (res.ok) {
          fetchData();
      }
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
    
    // For staff users, prevent editing past shifts if there are outstanding ones
    if (user?.role !== 'ADMIN') {
      const outstanding = getOutstandingShift();
      if (outstanding && outstanding.id !== event.id) {
        // Pop open the outstanding shift instead
        lastAutoOpenedShiftId.current = outstanding.id;
        setSelectedShift(outstanding);
        setIsDetailsModalOpen(true);
        return;
      }
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

    const isUnassigned = !event.staffId && !event.isRespiteWrapper;
    let className = isUnassigned ? 'unassigned-shift-animated' : '';

    return {
      className,
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

      let containerClass = 'transition-all flex flex-col md:flex-row md:items-center p-3 sm:p-4 shadow-sm border-y border-white/[0.05] ';
      let badgeLabel = event.status;
      let badgeClass = 'text-zinc-400 bg-zinc-900 border-zinc-700/50';
      
      const isCancelled = event.status === 'CANCELLED';
      const isCompleted = event.status === 'COMPLETED' && !isCancelled;
      const isInProgress = event.status === 'IN_PROGRESS' && !isCancelled;

      if (isCancelled) {
         containerClass += 'opacity-80 border-l-[6px] border-red-500 bg-red-500/10 hover:bg-red-500/20';
         badgeClass = 'text-red-400 bg-red-500/20 border-red-500/30';
         badgeLabel = 'Cancelled';
      } else if (event.status === 'DRAFT') {
         containerClass += 'opacity-90 border-l-[6px] border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/50';
         badgeClass = 'text-zinc-400 bg-zinc-800 border-zinc-700/50';
      } else if (event.status === 'PENDING_SYNC') {
         containerClass += 'opacity-90 border-l-[6px] border-amber-500 bg-amber-500/10 hover:bg-amber-500/20';
         badgeClass = 'text-amber-500 bg-amber-500/20 border-amber-500/30';
         badgeLabel = 'Pending Sync';
      } else if (event.status === 'PUBLISHED') {
         containerClass += 'opacity-95 border-l-[6px] border-brand-teal bg-brand-teal/5 hover:bg-brand-teal/10';
         badgeClass = 'text-brand-teal bg-brand-teal/20 border-brand-teal/30';
      } else if (isCompleted) {
         containerClass += 'opacity-80 border-l-[6px] border-brand-green bg-brand-green/10 hover:bg-brand-green/20';
         badgeClass = 'text-brand-green bg-brand-green/20 border-brand-green/30';
      } else if (isInProgress) {
         containerClass += 'border-l-[6px] border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 ring-1 ring-blue-500/30';
         badgeClass = 'text-blue-400 bg-blue-500/20 border-blue-500/30';
         badgeLabel = 'In Progress';
      } else {
         containerClass += 'border-l-[6px] border-zinc-700 bg-zinc-800/20 hover:bg-zinc-800/40';
      }

      if (event.isRespiteWrapper) {
         containerClass = containerClass.replace(/border-l-\[6px\] border-[a-z-]+-[0-9]+/, 'border-l-[6px] border-violet-500');
         containerClass = containerClass.replace(/bg-[a-z-]+-[0-9]+\/10/, 'bg-violet-500/10');
         badgeClass = 'text-violet-400 bg-violet-500/20 border-violet-500/30';
      }

      const isSelected = multiSelectMode && selectedEventIds.has(event.id);
      if (isSelected) {
         containerClass += ' ring-2 ring-brand-blue ring-offset-2 ring-offset-brand-navy';
      }

      const startText = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      const endText = event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();

      return (
        <div 
           className={`${containerClass} rounded-r-xl cursor-pointer w-full group relative`}
           onMouseDown={handleMouseDown}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onTouchStart={handleMouseDown}
           onTouchEnd={handleMouseUp}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 w-full">
            {/* Time Column */}
            <div className="text-zinc-300 font-mono text-sm md:text-lg whitespace-nowrap shrink-0 min-w-[160px] flex items-center gap-1.5">
              {event.isRespiteWrapper ? (
                <span className="text-brand-teal/80 font-medium text-[12px] bg-indigo-500/5 px-2 py-0.5 rounded border border-brand-teal/10">Multi-day</span>
              ) : (
                <>
                  {startText} <span className="text-zinc-600 font-bold">–</span> {endText}
                </>
              )}
            </div>
            
            {/* Wording in middle, unmodified logic but formatted horizontally */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 px-0 md:px-4 md:border-l md:border-zinc-700/50">
              <span className="font-bold text-zinc-100 text-base md:text-xl leading-tight tracking-wide truncate">
                {event.title}
              </span>
              
              <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 lg:gap-3 w-full min-w-0">
                {event.isRespiteWrapper ? (
                  <span className="text-violet-400 font-medium text-sm">STA / Respite</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1 shrink-0 min-w-0">
                      <span className="text-zinc-400 font-medium text-sm md:text-base lg:text-lg truncate">
                        👨‍💼 {event.staffName || 'Unassigned'}
                      </span>
                    </div>
                    {event.servicesData && event.servicesData.length > 0 ? (
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {event.servicesData.map((sd: any, idx: number) => {
                          const srv = servicesList.find((s: any) => String(s.id) === String(sd.serviceId));
                          const srvName = srv ? srv.name : (sd.serviceName || (idx === 0 ? event.serviceName : 'Unknown Service'));
                          return (
                            <span key={idx} className="bg-black/40 text-brand-teal px-2 py-0.5 rounded text-xs md:text-sm lg:text-base max-w-full truncate" title={srvName}>
                              {srvName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      event.serviceName && (
                        <div className="flex flex-wrap gap-1 min-w-0">
                          <span className="bg-black/40 text-brand-teal px-2 py-0.5 rounded text-xs md:text-sm lg:text-base max-w-full truncate" title={event.serviceName}>
                            {event.serviceName}
                          </span>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Badge on right */}
            <div className="flex items-center justify-start md:justify-end whitespace-nowrap shrink-0 mt-3 md:mt-0 md:ml-auto md:pl-2">
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1 mr-4 md:mr-0 inline-flex rounded-full border ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>
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
    <div className={`flex flex-col space-y-4 p-2 md:p-5 text-zinc-100 ${isFullScreen ? 'fixed inset-0 z-[100] bg-brand-bg pb-20 md:pb-4' : 'h-full bg-brand-navy border-0 md:border md:border-border-subtle rounded-xl'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 px-2 md:px-0 mt-2 md:mt-0">
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
                <option value="unassigned">Unassigned Staff</option>
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
      
      <div className="flex-1 bg-brand-bg p-0 md:p-4 rounded-lg md:border border-border-subtle overflow-y-auto min-h-0 scrollbar-hide">
        {user?.role === 'ADMIN' && activeView !== Views.AGENDA ? (
          <DnDCalendar
            localizer={localizer}
            events={mappedEvents}
            view={activeView}
            date={date}
            views={calendarViewsMapping}
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
            views={calendarViewsMapping}
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
        holidays={holidays}
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
              status: shift.status,
              progressNote: shift.progressNote,
              startOdometer: shift.startOdometer,
              endOdometer: shift.endOdometer,
              isHistorical: shift.isHistorical,
            });
            setIsShiftModalOpen(true);
          }
        }}
      />

      {user?.role !== 'ADMIN' && selectedShift && (
        <ActiveShiftModal
          key={`active-shift-${selectedShift.id}`}
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          onSave={fetchData}
          shift={selectedShift}
          servicesList={servicesList}
          clientList={clientList}
        />
      )}
    </div>
  );
}
