import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { getDay } from 'date-fns/getDay';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Plus, Maximize, Minimize, Bed, Star, Copy, Printer, Clock, User, Briefcase, Pill, HeartHandshake, Compass, Car, Users, Utensils, Sparkles, ShoppingBag, ShoppingCart, Flower2, Activity, GraduationCap, Users2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AddShiftModal from './AddShiftModal';
import AddHistoricalShiftModal from './AddHistoricalShiftModal';
import AddRespiteBookingModal from './AddRespiteBookingModal';
import ShiftDetailsModal from './ShiftDetailsModal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ActiveShiftModal from './ActiveShiftModal';
import PrintRosterModal from './PrintRosterModal';

const locales = {
  'en-US': enUS,
};

import { ShiftEvent } from "./types";
import CustomAgenda from './CustomAgenda';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DnDCalendar = withDragAndDrop(Calendar);

const AnimatedShowerHead = ({ className = "w-3.5 h-3.5 text-cyan-400" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`shrink-0 ${className}`}
  >
    <path d="m4 4 2.5 2.5" />
    <path d="M13.5 6.5a4.95 4.95 0 0 0-7 7" />
    <path d="M15 5 5 15" />
    {/* Animated droplets spraying out */}
    <path d="M14 17v.01" className="animate-shower-drop-1" strokeWidth="2.5" />
    <path d="M10 16v.01" className="animate-shower-drop-2" strokeWidth="2.5" />
    <path d="M13 13v.01" className="animate-shower-drop-3" strokeWidth="2.5" />
    <path d="M16 10v.01" className="animate-shower-drop-1" strokeWidth="2.5" />
    <path d="M11 20v.01" className="animate-shower-drop-2" strokeWidth="2.5" />
    <path d="M17 14v.01" className="animate-shower-drop-3" strokeWidth="2.5" />
    <path d="M20 11v.01" className="animate-shower-drop-1" strokeWidth="2.5" />
  </svg>
);

const AnimatedNurseIcon = ({ className = "w-3.5 h-3.5 text-rose-400" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`shrink-0 animate-service-heartbeat ${className}`}
  >
    {/* Classic Nurse Cap Outline */}
    <path d="M4 16.5c1.5 1 5.5 2 8 2s6.5 -1 8 -2l-2.5 -9a2 2 0 0 0 -1.9 -1.5h-7.2a2 2 0 0 0 -1.9 1.5z" />
    {/* Medical Cross */}
    <path d="M10 11.5h4" strokeWidth="2.5" />
    <path d="M12 9.5v4" strokeWidth="2.5" />
  </svg>
);

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
  const [isHistShiftModalOpen, setIsHistShiftModalOpen] = useState(false);
  const [isRespiteModalOpen, setIsRespiteModalOpen] = useState(false);
  const [initialShiftData, setInitialShiftData] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);
  const [copiedShift, setCopiedShift] = useState<ShiftEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
      // Calculate start and end bounds based on the current view and date
      const startDayStr = settings?.invoicingStartDay || 'Monday';
      const weekStartsOn = DAYS_OF_WEEK.indexOf(startDayStr) !== -1 ? DAYS_OF_WEEK.indexOf(startDayStr) : 1;
      
      let startBound = new Date(date);
      let endBound = new Date(date);
      
      if (view === 'month') {
        startBound.setDate(1);
        startBound = startOfWeek(startBound, { weekStartsOn: weekStartsOn as any });
        endBound.setMonth(endBound.getMonth() + 1);
        endBound.setDate(0);
        endBound = endOfWeek(endBound, { weekStartsOn: weekStartsOn as any });
      } else if (view === 'week') {
        startBound = startOfWeek(date, { weekStartsOn: weekStartsOn as any });
        endBound = endOfWeek(date, { weekStartsOn: weekStartsOn as any });
      } else if (view === 'day') {
        startBound.setHours(0, 0, 0, 0);
        endBound.setHours(23, 59, 59, 999);
      } else if (view === 'agenda') {
         startBound.setHours(0, 0, 0, 0);
         endBound.setDate(endBound.getDate() + 30); // Arbitrary 30 days for agenda
      }

      // Add a small buffer just in case
      startBound.setDate(startBound.getDate() - 1);
      endBound.setDate(endBound.getDate() + 1);

      const startIso = startBound.toISOString();
      const endIso = endBound.toISOString();

      const [shiftsRes, respiteRes, staffRes, clientsRes, servicesRes] = await Promise.all([
        fetch(`/api/shifts?start=${startIso}&end=${endIso}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`/api/respite-bookings`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
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
          serviceName: d.service_name || (
            d.servicesData?.[0]?.serviceId === 'orientation' ||
            d.servicesData?.[0]?.customName === 'Orientation' ||
            (d.services_json && String(d.services_json).toLowerCase().includes('orientation'))
              ? 'Orientation'
              : (d.servicesData?.[0]?.customName || '')
          ),
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
          startOdometer: d.odometer_start_reading ? Math.round(Number(d.odometer_start_reading)).toString() : null,
          endOdometer: d.odometer_end_reading ? Math.round(Number(d.odometer_end_reading)).toString() : null,
          isHistorical: d.is_historical,
          vehicleId: d.vehicle_id,
          vehicle_id: d.vehicle_id,
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
  }, [token, date, view]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, date, view]);

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
    // Only apply client/staff filters if user is ADMIN (since staff don't have the UI to clear them)
    if (user?.role === 'ADMIN') {
      if (clientFilter && e.clientId?.toString() !== clientFilter) return false;
      
      if (staffFilter === 'unassigned') {
        if (e.isRespiteWrapper && e.respiteData?.shifts) {
          const isStaffAssigned = e.respiteData.shifts.some((s: any) => !s.staff_id);
          if (!isStaffAssigned) return false;
        } else {
          if (e.staffId !== null && e.staffId !== undefined) return false;
        }
      } else if (staffFilter) {
        if (e.isRespiteWrapper && e.respiteData?.shifts) {
          const isStaffAssigned = e.respiteData.shifts.some((s: any) => s.staff_id?.toString() === staffFilter);
          if (!isStaffAssigned) return false;
        } else {
          if (e.staffId?.toString() !== staffFilter) return false;
        }
      }
    }

    // Non-admins should not see the respite wrapper, only their child shifts
    if (user?.role !== 'ADMIN' && e.isRespiteWrapper) {
      return false;
    }

    // Non-admins should only see their own child shifts (just in case they leaked)
    if (user?.role !== 'ADMIN' && e.isRespiteChild && e.staffId !== user?.id) {
      return false;
    }
    
    // For non-admins, ensure they only see their own normal shifts (belt and braces)
    if (user?.role !== 'ADMIN' && !e.isRespiteWrapper && !e.isRespiteChild && e.staffId !== user?.id) {
      return false;
    }

    return true;
  });

  const onEventResize: withDragAndDropProps['onEventResize'] = async (data) => {
    const { event, start, end } = data;
    if (user?.role !== 'ADMIN') return;
    
    const sEvent = event as ShiftEvent;
    if (typeof sEvent.id === 'string' && sEvent.id.startsWith('rb_')) return; // ignore resize for respite bookings
    
    try {
      // Translate the spoofed calendar visual time back into an absolute UTC timestamp 
      // based on the organizational timezone, NOT the browser's timezone.
      const orgTz = settings?.timezone || 'Australia/Perth';
      const visualStart = new Date(start);
      const visualEnd = new Date(end);
      
      const startIso = fromZonedTime(
        `${visualStart.getFullYear()}-${String(visualStart.getMonth()+1).padStart(2,'0')}-${String(visualStart.getDate()).padStart(2,'0')}T${String(visualStart.getHours()).padStart(2,'0')}:${String(visualStart.getMinutes()).padStart(2,'0')}:00`, 
        orgTz
      ).toISOString();
      
      const endIso = fromZonedTime(
        `${visualEnd.getFullYear()}-${String(visualEnd.getMonth()+1).padStart(2,'0')}-${String(visualEnd.getDate()).padStart(2,'0')}T${String(visualEnd.getHours()).padStart(2,'0')}:${String(visualEnd.getMinutes()).padStart(2,'0')}:00`, 
        orgTz
      ).toISOString();

      const res = await fetch(`/api/shifts/${sEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startTime: startIso,
          endTime: endIso
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
    
    // Reverse the spoofed calendar time back to the organizational absolute time
    // so the new shift modal gets pre-filled with the exact visual digits chosen.
    const orgTz = settings?.timezone || 'Australia/Perth';
    const visualStart = new Date(start);
    const visualEnd = new Date(end);

    const startIso = fromZonedTime(
      `${visualStart.getFullYear()}-${String(visualStart.getMonth()+1).padStart(2,'0')}-${String(visualStart.getDate()).padStart(2,'0')}T${String(visualStart.getHours()).padStart(2,'0')}:${String(visualStart.getMinutes()).padStart(2,'0')}:00`, 
      orgTz
    ).toISOString();

    const dateStr = `${visualStart.getFullYear()}-${String(visualStart.getMonth()+1).padStart(2,'0')}-${String(visualStart.getDate()).padStart(2,'0')}`;
    const startTimeStr = `${String(visualStart.getHours()).padStart(2,'0')}:${String(visualStart.getMinutes()).padStart(2,'0')}`;
    const endTimeStr = `${String(visualEnd.getHours()).padStart(2,'0')}:${String(visualEnd.getMinutes()).padStart(2,'0')}`;

    if (copiedShift) {
       const copyStart = new Date(copiedShift.start);
       const copyEnd = new Date(copiedShift.end);
       const durationMs = copyEnd.getTime() - copyStart.getTime();
       const newEnd = new Date(start.getTime() + durationMs);
       
       const pasteInitialData: any = {
          staffId: copiedShift.staffId ? String(copiedShift.staffId) : '',
          clientId: String(copiedShift.clientId),
          date: dateStr,
          startDate: dateStr,
          endDate: newEnd.toLocaleDateString('en-CA'),
          startTime: startTimeStr,
          endTime: newEnd.toTimeString().slice(0, 5),
          notes: copiedShift.notes,
          progressNote: copiedShift.progressNote,
          servicesData: copiedShift.servicesData,
          isHistorical: copiedShift.isHistorical,
       };
       setInitialShiftData(pasteInitialData);
       if (copiedShift.isHistorical) {
          setIsHistShiftModalOpen(true);
       } else {
          setIsShiftModalOpen(true);
       }
       return;
    }
    
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

  const handleAddHistShift = () => {
    setInitialShiftData(null);
    setIsHistShiftModalOpen(true);
  };

  const handleAddShift = () => {
    setInitialShiftData(null);
    setIsShiftModalOpen(true);
  };

  const handleAddRespiteBooking = () => {
    setInitialRespiteData(null);
    setIsRespiteModalOpen(true);
  };

  const activeFilterDescription = React.useMemo(() => {
    if (clientFilter) {
      const c = clientList.find(c => c.id.toString() === clientFilter);
      return c ? `Client: ${c.first_name} ${c.last_name}` : 'Filtered by Client';
    }
    if (staffFilter) {
      if (staffFilter === 'unassigned') return 'Unassigned Staff Shifts';
      const s = staffList.find(s => s.id.toString() === staffFilter);
      return s ? `Staff: ${s.first_name} ${s.last_name}` : 'Filtered by Staff';
    }
    if (user?.role !== 'ADMIN') {
      return `Staff: ${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    }
    return 'All Staff & Clients';
  }, [clientFilter, staffFilter, clientList, staffList, user]);

  const handlePrintPdfWithOptions = async (rangeStart: Date, rangeEnd: Date) => {
    try {
      const startIso = rangeStart.toISOString();
      const endIso = rangeEnd.toISOString();
      
      const [shiftsRes, respiteRes] = await Promise.all([
        fetch(`/api/shifts?start=${startIso}&end=${endIso}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`/api/respite-bookings`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      ]);
      
      let inRangeShifts: any[] = [];
      if (shiftsRes.ok && respiteRes.ok) {
        const shiftsData = await shiftsRes.json();
        const respiteData = await respiteRes.json();
        
        const individualShifts = shiftsData.filter((d: any) => !d.respite_booking_id);
        const mappedIndividual = individualShifts.map((d: any) => {
          let sName = d.service_name;
          if (!sName) {
            if (d.servicesData && d.servicesData.length > 0) {
              const s0 = d.servicesData[0];
              if (s0.serviceId === 'orientation' || s0.customName === 'Orientation' || String(s0.serviceId).toLowerCase().includes('orientation') || String(s0.name).toLowerCase() === 'orientation') {
                sName = 'Orientation';
              } else if (s0.customName) {
                sName = s0.customName;
              }
            } else if (d.services_json && String(d.services_json).toLowerCase().includes('orientation')) {
              sName = 'Orientation';
            }
          }
          return {
            id: d.id,
            title: d.client_first_name + ' ' + d.client_last_name + ' (' + (d.staff_first_name || 'Unassigned') + ')',
            start: new Date(d.start_time),
            end: new Date(d.end_time),
            staffId: d.staff_id,
            staffName: d.staff_id ? d.staff_first_name + ' ' + d.staff_last_name : 'Unassigned',
            clientId: d.client_id,
            clientName: d.client_first_name + ' ' + d.client_last_name,
            status: d.status,
            serviceId: d.service_id,
            serviceName: sName,
            servicesData: d.servicesData,
            services_json: d.services_json,
            fundingType: d.funding_type
          };
        });
        
        const mappedRespite = respiteData.map((d: any) => ({
          id: 'respite-' + d.id,
          title: 'Respite: ' + d.client_first_name + ' ' + d.client_last_name,
          start: new Date(d.start_date),
          end: new Date(d.end_date),
          staffId: d.staff_id,
          staffName: d.staff_id ? d.staff_first_name + ' ' + d.staff_last_name : 'Unassigned',
          clientId: d.client_id,
          clientName: d.client_first_name + ' ' + d.client_last_name,
          status: d.status,
          isRespiteWrapper: true,
          respiteData: d,
          serviceName: 'Respite / STA'
        }));
        
        inRangeShifts = [...mappedIndividual, ...mappedRespite].filter(shift => {
          const sDate = new Date(shift.start);
          const eDate = new Date(shift.end);
          if (sDate > rangeEnd || eDate < rangeStart) return false;

          if (user?.role === 'ADMIN') {
            if (clientFilter && shift.clientId?.toString() !== clientFilter) return false;
            
            if (staffFilter === 'unassigned') {
              if (shift.isRespiteWrapper && shift.respiteData?.shifts) {
                const isStaffAssigned = shift.respiteData.shifts.some((s: any) => !s.staff_id);
                if (!isStaffAssigned) return false;
              } else {
                if (shift.staffId !== null && shift.staffId !== undefined) return false;
              }
            } else if (staffFilter) {
              if (shift.isRespiteWrapper && shift.respiteData?.shifts) {
                const isStaffAssigned = shift.respiteData.shifts.some((s: any) => s.staff_id?.toString() === staffFilter);
                if (!isStaffAssigned) return false;
              } else {
                if (shift.staffId?.toString() !== staffFilter) return false;
              }
            }
          }
          return true;
        });
      }

      let filterName = '';
      if (clientFilter) {
        const c = clientList.find(c => c.id.toString() === clientFilter);
        if (c) filterName = `${c.first_name} ${c.last_name}`;
      } else if (staffFilter) {
        if (staffFilter === 'unassigned') {
          filterName = 'Unassigned Staff';
        } else {
          const s = staffList.find(s => s.id.toString() === staffFilter);
          if (s) filterName = `${s.first_name} ${s.last_name}`;
        }
      } else if (user?.role !== 'ADMIN') {
        filterName = (user?.firstName || '') + ' ' + (user?.lastName || '');
      }

      const res = await fetch('/api/roster/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          view: activeView,
          shifts: inRangeShifts,
          groupBy,
          filterName
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const startStr = format(rangeStart, 'dd_MMM_yyyy');
      const endStr = format(rangeEnd, 'dd_MMM_yyyy');
      const safeName = filterName ? filterName.replace(/[^a-zA-Z0-9]+/g, '_') : 'All';
      a.download = `${safeName}_${startStr}_to_${endStr}_Roster.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Error printing PDF: ${e.message}`);
    }
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
    const isInProgress = event.status === 'IN_PROGRESS';
    const isUnassigned = !event.staffId && !event.isRespiteWrapper;

    let backgroundColor: string | undefined = '#0ea5e9'; // brand-blue
    let border = isSelected ? '2px solid white' : 'none';
    let backgroundImage = 'none';

    if (event.status === 'DRAFT') {
      backgroundColor = '#52525b'; // zinc-600
      border = isSelected ? '2px solid white' : '1px dashed #a1a1aa'; // zinc-400
    }
    if (event.status === 'COMPLETED') backgroundColor = '#a3e635'; // brand-green
    if (isInProgress) {
      backgroundColor = '#f59e0b'; // warm golden amber
      border = isSelected ? '2px solid white' : '1.5px solid #d97706';
    }
    if (event.status === 'PENDING_SYNC') backgroundColor = '#f97316'; // orange-500
    if (event.status === 'CANCELLED') backgroundColor = '#ef4444'; // red-500
    
    if (event.isRespiteWrapper) {
      backgroundColor = '#8b5cf6'; // violet-500
      border = isSelected ? '2px solid white' : '1px inset #7c3aed';
    }

    const classList: string[] = [];
    if (isUnassigned) classList.push('unassigned-shift-animated');
    if (isInProgress) classList.push('in-progress-shift-animated');
    const className = classList.join(' ');

    let textColor: string | undefined;
    if (event.status === 'COMPLETED' || event.status === 'PENDING_SYNC' || isInProgress) {
      textColor = '#0b1120';
    } else {
      textColor = 'white';
    }

    return {
      className,
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 1,
        color: textColor,
        border,
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: isSelected
          ? '0 0 0 2px rgba(14, 165, 233, 0.5)'
          : (isInProgress ? '0 0 10px rgba(245, 158, 11, 0.45)' : undefined),
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
          {event.status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1 mr-1.5 px-1.5 py-0.5 rounded-full bg-black/25 border border-black/20 shadow-xs relative z-10 select-none shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
              </span>
              <span className="text-[9px] font-black tracking-wider text-slate-950 uppercase leading-none">LIVE</span>
            </span>
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

    const getServiceBadge = (name?: string) => {
      const s = (name || '').toLowerCase();

      // Registered Nurse / Clinical Care (Direct Rate, Indirect Rate, etc.)
      if (
        s.includes('registered nurse') ||
        s.includes('clinical care') ||
        s.includes('nurse') ||
        s.includes('nursing') ||
        s.includes('clinical')
      ) {
        return {
          icon: <AnimatedNurseIcon className="w-3.5 h-3.5 text-rose-400" />,
          badgeStyle: 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
        };
      }

      // Medication / Medicine / Pills
      if (s.includes('medication') || s.includes('medicine') || s.includes('pill') || s.includes('admin')) {
        return {
          icon: <Pill className="w-3 h-3 text-rose-400 shrink-0 animate-service-heartbeat" />,
          badgeStyle: 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
        };
      }

      // Self-care / Personal Care / Activities of daily living / Hygiene / Shower / Dressing
      if (s.includes('self-care') || s.includes('self care') || s.includes('personal care') || s.includes('daily living') || s.includes('hygiene') || s.includes('shower') || s.includes('dressing')) {
        return {
          icon: <AnimatedShowerHead className="w-3.5 h-3.5 text-cyan-400" />,
          badgeStyle: 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-300'
        };
      }

      // Buddy Shift / Shadow Shift
      if (s.includes('buddy') || s.includes('shadow')) {
        return {
          icon: <Users2 className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-service-float" />,
          badgeStyle: 'bg-blue-500/10 border border-blue-500/25 text-blue-300'
        };
      }

      // Orientation / Staff Orientation / Induction / Onboarding
      if (s.includes('orientation') || s.includes('induction') || s.includes('onboard')) {
        return {
          icon: <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-service-sway" />,
          badgeStyle: 'bg-blue-500/10 border border-blue-500/25 text-blue-300'
        };
      }

      // Skill Development and Training / Capacity Building / Learning
      if (s.includes('skill') || s.includes('training') || s.includes('learning') || s.includes('development') || s.includes('capacity')) {
        return {
          icon: <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-service-sway" />,
          badgeStyle: 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
        };
      }

      // Individual Social Supports / Transport / Travel / Driving / Vehicle
      if (s.includes('individual social') || s.includes('social support') || s.includes('transport') || s.includes('travel') || s.includes('drive') || s.includes('driving') || s.includes('vehicle') || s.includes('car')) {
        return {
          icon: <Car className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-service-drive" />,
          badgeStyle: 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-300'
        };
      }

      // Community / Social / Outing / Recreation / Access
      if (s.includes('community') || s.includes('social') || s.includes('outing') || s.includes('recreation') || s.includes('access')) {
        return {
          icon: <Users className="w-3 h-3 text-sky-400 shrink-0 animate-service-float" />,
          badgeStyle: 'bg-sky-500/10 border border-sky-500/25 text-sky-300'
        };
      }

      // Meal Prep / Cooking / Food / Diet / Kitchen / Nutrition
      if (s.includes('meal') || s.includes('food') || s.includes('cook') || s.includes('cooking') || s.includes('kitchen') || s.includes('nutrition')) {
        return {
          icon: <Utensils className="w-3 h-3 text-orange-400 shrink-0 animate-service-sway" />,
          badgeStyle: 'bg-orange-500/10 border border-orange-500/25 text-orange-300'
        };
      }

      // Domestic Assistance / Cleaning / Household / Laundry / Chores
      if (s.includes('domestic') || s.includes('clean') || s.includes('cleaning') || s.includes('household') || s.includes('laundry') || s.includes('chore')) {
        return {
          icon: <Sparkles className="w-3 h-3 text-yellow-300 shrink-0 animate-service-twinkle" />,
          badgeStyle: 'bg-yellow-500/10 border border-yellow-500/25 text-yellow-300'
        };
      }

      // Shopping / Groceries / Trolley / Store / Errands
      if (s.includes('shop') || s.includes('shopping') || s.includes('groceries') || s.includes('grocery') || s.includes('store') || s.includes('errand') || s.includes('trolley')) {
        return {
          icon: <ShoppingCart className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-shopping-trolley" />,
          badgeStyle: 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300'
        };
      }

      // Respite / Short Term Accommodation / Sleepover / Night
      if (s.includes('respite') || s.includes('short term accommodation') || s.includes('sleepover') || s.includes('night') || s.includes('bed') || /\bsta\b/i.test(s)) {
        return {
          icon: <Bed className="w-3 h-3 text-violet-400 shrink-0 animate-service-float" />,
          badgeStyle: 'bg-violet-500/10 border border-violet-500/25 text-violet-300'
        };
      }

      // Gardening / Yard / Lawn / Outdoor
      if (s.includes('garden') || s.includes('gardening') || s.includes('yard') || s.includes('lawn') || s.includes('outdoor')) {
        return {
          icon: <Flower2 className="w-3 h-3 text-lime-400 shrink-0 animate-service-sway" />,
          badgeStyle: 'bg-lime-500/10 border border-lime-500/25 text-lime-300'
        };
      }

      // Therapy / Allied Health / Physio / Psychology
      if (s.includes('therapy') || s.includes('allied') || s.includes('physio') || s.includes('psych') || s.includes('rehab')) {
        return {
          icon: <Activity className="w-3 h-3 text-teal-400 shrink-0 animate-service-heartbeat" />,
          badgeStyle: 'bg-teal-500/10 border border-teal-500/25 text-teal-300'
        };
      }

      // Default
      return {
        icon: <Briefcase className="w-3 h-3 text-brand-teal/80 shrink-0 animate-service-float" />,
        badgeStyle: 'bg-brand-teal/15 border border-brand-teal/30 text-brand-teal'
      };
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

      let containerClass = 'transition-all duration-150 rounded-xl border border-zinc-700/80 p-2.5 sm:p-3 lg:p-3.5 backdrop-blur-md relative overflow-hidden shadow-lg shadow-black/40 hover:shadow-xl hover:border-zinc-500 hover:-translate-y-px ';
      let badgeLabel = event.status;
      let badgeClass = 'text-zinc-400 bg-zinc-900 border-zinc-700/50';
      
      const isCancelled = event.status === 'CANCELLED';
      const isCompleted = event.status === 'COMPLETED' && !isCancelled;
      const isInProgress = event.status === 'IN_PROGRESS' && !isCancelled;

      if (event.isRespiteWrapper) {
         containerClass += 'border-l-[6px] border-l-violet-500 bg-zinc-900/95 bg-gradient-to-r from-violet-500/20 via-zinc-900/90 to-zinc-900 hover:from-violet-500/30';
         badgeClass = 'text-violet-300 bg-violet-500/20 border-violet-500/40';
      } else if (isCancelled) {
         containerClass += 'border-l-[6px] border-l-red-500 bg-zinc-900/95 bg-gradient-to-r from-red-500/15 via-zinc-900/90 to-zinc-900 hover:from-red-500/25';
         badgeClass = 'text-red-400 bg-red-500/20 border-red-500/40';
         badgeLabel = 'Cancelled';
      } else if (event.status === 'DRAFT') {
         containerClass += 'border-l-[6px] border-l-zinc-500 bg-zinc-900/95 bg-gradient-to-r from-zinc-700/25 via-zinc-900/90 to-zinc-900 hover:from-zinc-700/35';
         badgeClass = 'text-zinc-300 bg-zinc-800 border-zinc-600';
         badgeLabel = 'Draft';
      } else if (event.status === 'PENDING_SYNC') {
         containerClass += 'border-l-[6px] border-l-amber-500 bg-zinc-900/95 bg-gradient-to-r from-amber-500/15 via-zinc-900/90 to-zinc-900 hover:from-amber-500/25';
         badgeClass = 'text-amber-400 bg-amber-500/20 border-amber-500/40';
         badgeLabel = 'Pending Sync';
      } else if (event.status === 'PUBLISHED') {
         containerClass += 'border-l-[6px] border-l-brand-teal bg-zinc-900/95 bg-gradient-to-r from-brand-teal/15 via-zinc-900/90 to-zinc-900 hover:from-brand-teal/25';
         badgeClass = 'text-brand-teal bg-brand-teal/20 border-brand-teal/40';
      } else if (isCompleted) {
         containerClass += 'border-l-[6px] border-l-brand-green bg-zinc-900/95 bg-gradient-to-r from-brand-green/15 via-zinc-900/90 to-zinc-900 hover:from-brand-green/25';
         badgeClass = 'text-brand-green bg-brand-green/20 border-brand-green/40';
      } else if (isInProgress) {
         containerClass += 'border-l-[6px] border-l-amber-400 bg-zinc-900/95 bg-gradient-to-r from-amber-500/20 via-zinc-900/90 to-zinc-900 hover:from-amber-500/30 ring-1 ring-amber-500/40 in-progress-agenda-item ';
         badgeClass = 'in-progress-agenda-badge border text-amber-300';
         badgeLabel = 'In Progress';
      } else {
         containerClass += 'border-l-[6px] border-l-zinc-600 bg-zinc-900/95 bg-gradient-to-r from-zinc-800/40 via-zinc-900/90 to-zinc-900 hover:bg-zinc-850';
      }

      const isSelected = multiSelectMode && selectedEventIds.has(event.id);
      if (isSelected) {
         containerClass += ' ring-2 ring-brand-blue ring-offset-2 ring-offset-brand-navy';
      }

      const startText = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      const endText = event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();

      return (
        <div 
           className={`${containerClass} cursor-pointer w-full group relative`}
           onMouseDown={handleMouseDown}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
           onTouchStart={handleMouseDown}
           onTouchEnd={handleMouseUp}
        >
          {/* Mobile & Tablet Compact Layout (Two lines only, professionally structured) */}
          <div className="flex flex-col gap-2 w-full lg:hidden">
            {/* Line 1: Time on left with icon, Client Name in middle, Status badge on right */}
            <div className="flex items-center gap-2.5 w-full min-w-0 justify-between">
              {/* Time Pill */}
              <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700/60 text-zinc-200 font-mono text-[11px] font-semibold tracking-tight shadow-xs min-w-[115px] sm:min-w-[125px]">
                {event.isRespiteWrapper ? (
                  <span className="text-brand-teal/90 font-medium text-[9px] bg-indigo-500/10 px-1 py-0.5 rounded border border-brand-teal/20">Multi-day</span>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{startText}</span>
                    <span className="text-zinc-500 font-bold">–</span>
                    <span>{endText}</span>
                  </>
                )}
              </div>

              {/* Client's name in middle */}
              <div className="font-semibold text-zinc-100 text-[12px] sm:text-xs leading-tight tracking-tight truncate flex-1 min-w-0 px-0.5" title={event.title}>
                {event.title}
              </div>

              {/* Status Badge */}
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 inline-flex items-center gap-1 rounded-full border shadow-xs shrink-0 ${badgeClass}`}>
                {isInProgress && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                  </span>
                )}
                {badgeLabel}
              </span>
            </div>

            {/* Line 2: Staff Name chip followed by Service Provided chip */}
            <div className="flex items-center gap-2 w-full min-w-0 text-[10px]">
              {event.isRespiteWrapper ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-medium shrink-0">
                  <Bed className="w-3 h-3 text-violet-400 shrink-0 animate-service-float" />
                  <span>STA / Respite</span>
                </div>
              ) : (
                <>
                  {/* Staff Pill */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[10px] font-medium shrink-0 max-w-[45%] shadow-xs" title={event.staffName || 'Unassigned'}>
                    <User className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate">{event.staffName || 'Unassigned'}</span>
                  </div>
                  
                  {/* Service Provided Pill */}
                  {event.servicesData && event.servicesData.length > 0 ? (
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      {event.servicesData.map((sd: any, idx: number) => {
                        const srv = servicesList.find((s: any) => String(s.id) === String(sd.serviceId));
                        let srvName = srv ? srv.name : (sd.serviceName || (idx === 0 ? event.serviceName : 'Unknown Service'));
                        if (!srvName || srvName === 'Unknown Service') {
                          if (String(sd.serviceId).toLowerCase().includes('orientation')) {
                            srvName = 'Orientation';
                          } else if (String(sd.serviceId).toLowerCase().includes('custom')) {
                            srvName = sd.serviceName || 'Custom Service';
                          }
                        }
                        const badgeInfo = getServiceBadge(srvName);
                        return (
                          <div key={idx} className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${badgeInfo.badgeStyle} text-[10px] font-medium truncate min-w-0 flex-1 shadow-xs`} title={srvName}>
                            {badgeInfo.icon}
                            <span className="truncate">{srvName}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : event.serviceName ? (
                    (() => {
                      const badgeInfo = getServiceBadge(event.serviceName);
                      return (
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${badgeInfo.badgeStyle} text-[10px] font-medium truncate min-w-0 flex-1 shadow-xs`} title={event.serviceName}>
                          {badgeInfo.icon}
                          <span className="truncate">{event.serviceName}</span>
                        </div>
                      );
                    })()
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Desktop Layout (Preserved original spacious layout, modernized icons) */}
          <div className="hidden lg:flex lg:flex-row lg:items-center lg:gap-6 w-full">
            {/* Time Column */}
            <div className="text-zinc-300 font-mono text-xs whitespace-nowrap shrink-0 min-w-[160px] flex items-center gap-1.5">
              {event.isRespiteWrapper ? (
                <span className="text-brand-teal/80 font-medium text-[10px] bg-indigo-500/5 px-2 py-0.5 rounded border border-brand-teal/10">Multi-day</span>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{startText}</span> <span className="text-zinc-600 font-bold">–</span> <span>{endText}</span>
                </>
              )}
            </div>
            
            {/* Wording in middle */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 px-4 border-l border-zinc-700/50">
              <span className="font-semibold text-zinc-100 text-[11px] leading-tight tracking-wide truncate">
                {event.title}
              </span>
              
              <div className="flex flex-row items-center gap-3 w-full min-w-0">
                {event.isRespiteWrapper ? (
                  <span className="text-violet-400 font-medium text-[10px]">STA / Respite</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                      <span className="text-zinc-300 font-medium text-xs truncate flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> {event.staffName || 'Unassigned'}
                      </span>
                    </div>
                    {event.servicesData && event.servicesData.length > 0 ? (
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {event.servicesData.map((sd: any, idx: number) => {
                          const srv = servicesList.find((s: any) => String(s.id) === String(sd.serviceId));
                          let srvName = srv ? srv.name : (sd.serviceName || (idx === 0 ? event.serviceName : 'Unknown Service'));
                          if (!srvName || srvName === 'Unknown Service') {
                            if (String(sd.serviceId).toLowerCase().includes('orientation')) {
                              srvName = 'Orientation';
                            } else if (String(sd.serviceId).toLowerCase().includes('custom')) {
                              srvName = sd.serviceName || 'Custom Service';
                            }
                          }
                          const badgeInfo = getServiceBadge(srvName);
                          return (
                            <span key={idx} className={`${badgeInfo.badgeStyle} px-2 py-0.5 rounded text-[10px] max-w-full truncate flex items-center gap-1`} title={srvName}>
                              {badgeInfo.icon}
                              {srvName}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      event.serviceName && (
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {(() => {
                            const badgeInfo = getServiceBadge(event.serviceName);
                            return (
                              <span className={`${badgeInfo.badgeStyle} px-2 py-0.5 rounded text-[10px] max-w-full truncate flex items-center gap-1`} title={event.serviceName}>
                                {badgeInfo.icon}
                                {event.serviceName}
                              </span>
                            );
                          })()}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Badge on right */}
            <div className="flex items-center justify-end whitespace-nowrap shrink-0 ml-auto pl-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 inline-flex items-center gap-1.5 rounded-full border ${badgeClass}`}>
                {isInProgress && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                  </span>
                )}
                {badgeLabel}
              </span>
            </div>
          </div>
        </div>
      );
    };

    const AgendaTime = ({ event }: any) => {
      if (event.isRespiteWrapper) {
        return <div className="flex items-center h-full"><span className="text-brand-teal/80 font-medium text-[10px] bg-indigo-500/5 px-2 py-0.5 rounded border border-brand-teal/10">Multi-day</span></div>;
      }
      const start = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      const end = event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      return <div className="flex items-center h-full"><span className="text-zinc-300 font-medium text-[10px] whitespace-nowrap tracking-wide flex items-center gap-1.5">{start} <span className="text-zinc-600 font-bold">→</span> {end}</span></div>;
    };

    const AgendaDate = ({ day }: any) => {
      const formatted = day.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
      return <div className="font-bold text-brand-teal text-xs tracking-wide flex items-start h-full">{formatted}</div>;
    };

    const MonthDateHeader = ({ date, label }: any) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const holiday = holidays.find(h => h.date.startsWith(dateStr));
      return (
        <div className="flex flex-col items-end pr-1 pt-1 h-full pointer-events-none">
          <span className="text-zinc-300 text-xs font-semibold">{label}</span>
          {holiday && <span className="text-[9px] font-bold text-amber-500 mt-0.5 truncate max-w-full pointer-events-auto bg-amber-500/10 px-1 rounded">{holiday.name}</span>}
        </div>
      );
    };

    const WeekHeader = ({ date, label }: any) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const holiday = holidays.find(h => h.date.startsWith(dateStr));
      return (
        <div className="flex flex-col items-center py-1">
          <span className="text-xs font-semibold">{label}</span>
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
    <div className={`flex flex-col space-y-1 p-1 md:p-2 text-zinc-100 ${isFullScreen ? 'fixed inset-0 z-[100] bg-brand-bg pb-20 md:pb-4' : 'h-full bg-brand-navy border-0 md:border md:border-border-subtle rounded-xl'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-1 md:space-y-0 px-1 md:px-0 mt-0">
        <h2 className="text-lg font-sans font-semibold text-[#E6EDF3] tracking-tight mb-1 md:mb-0">Roster Management</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          {user?.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2 p-1 bg-black/20 rounded-lg border border-white/5 w-full sm:w-auto">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'STAFF' | 'CLIENT')}
                  className="bg-brand-bg border border-border-subtle rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="STAFF">Group by Staff</option>
                  <option value="CLIENT">Group by Client</option>
                </select>

                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="bg-brand-bg border border-border-subtle rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">All Clients</option>
                  {clientList.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>

                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="bg-brand-bg border border-border-subtle rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="">All Staff</option>
                  <option value="unassigned">Unassigned Staff</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Action Group */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                  <>
                    {/* Secondary Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setIsPrintModalOpen(true)}
                          className="flex items-center justify-center px-3 py-1.5 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[11px] font-medium rounded-md transition-colors w-full sm:w-auto gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Roster
                        </button>
                      <button 
                        onClick={() => setMultiSelectMode(true)}
                        className="flex items-center justify-center px-3 py-1.5 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[11px] font-medium rounded-md transition-colors w-full sm:w-auto"
                      >
                        Select Mode
                      </button>
                      <button 
                        onClick={handlePublishDrafts}
                        className="flex items-center justify-center px-3 py-1.5 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[11px] font-medium rounded-md transition-colors w-full sm:w-auto"
                      >
                        Publish Drafts
                      </button>
                    </div>

                    <div className="w-px h-6 bg-white/10 hidden sm:block mx-1"></div>
                    
                    {/* Primary Actions */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleAddShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[11px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Shift
                      </button>
                      <button 
                        onClick={handleAddRespiteBooking}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[11px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Bed className="w-4 h-4 mr-1.5" />
                        Add Respite / STA
                      </button>
                      <button 
                        onClick={handleAddHistShift}
                        className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[11px] font-medium rounded-md transition-all shadow-sm w-full sm:w-[170px]"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Historical Shift
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {user?.role !== 'ADMIN' && (
            <button 
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center justify-center px-3 py-1.5 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[11px] font-medium rounded-md transition-colors w-full sm:w-auto gap-1.5"
              title="Print Weekly Roster"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Roster
            </button>
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
      
      {copiedShift && (
        <div className="bg-brand-teal/20 border border-brand-teal/40 text-brand-teal px-4 py-2.5 rounded-lg flex items-center justify-between mx-1 shadow-sm mt-1 animate-in slide-in-from-top-2">
          <div className="text-[13px] md:text-sm font-medium flex items-center">
             <Copy className="w-4 h-4 mr-2 opacity-80" />
             <span>
               <span className="font-bold mr-1">Paste Mode Active:</span> 
               Click any empty slot to paste shift for <span className="text-white font-semibold">{copiedShift.staffName || 'Unassigned'}</span> ({copiedShift.clientName}).
             </span>
          </div>
          <button 
             onClick={() => setCopiedShift(null)} 
             className="text-white hover:text-red-400 px-3 py-1 bg-black/20 hover:bg-black/40 rounded transition-colors text-xs font-bold uppercase tracking-wider ml-4 shrink-0"
          >
             Cancel
          </button>
        </div>
      )}
      
      <div className="flex-1 bg-brand-bg p-0 md:p-2 rounded-lg md:border border-border-subtle overflow-y-auto min-h-0 scrollbar-hide mt-1">
        {activeView !== Views.AGENDA ? (
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
            selectable={user?.role === 'ADMIN'}
            
            resizable={user?.role === 'ADMIN'}
            resources={(activeView as View) === Views.DAY ? resources : undefined}
            resourceIdAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.id : undefined}
            resourceTitleAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.title : undefined}
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
            selectable={user?.role === 'ADMIN'}
            
            resources={(activeView as View) === Views.DAY ? resources : undefined}
            resourceIdAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.id : undefined}
            resourceTitleAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.title : undefined}
            style={{ height: '100%', minHeight: '500px' }}
            className="text-[#E6EDF3] custom-calendar h-full"
          />
        )}
      </div>

      <AddHistoricalShiftModal 
        isOpen={isHistShiftModalOpen}
        onClose={() => setIsHistShiftModalOpen(false)}
        initialData={initialShiftData}
        onSave={fetchData}
        staffList={staffList}
        clientList={clientList}
        servicesList={servicesList}
        holidays={holidays}
        onToggleStandard={() => {
          setIsHistShiftModalOpen(false);
          setIsShiftModalOpen(true);
        }}
      />
      <AddShiftModal 
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={fetchData}
        staffList={staffList}
        clientList={clientList}
        servicesList={servicesList}
        initialData={initialShiftData}
        holidays={holidays}
        onToggleHistorical={() => {
          setIsShiftModalOpen(false);
          setIsHistShiftModalOpen(true);
        }}
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
        onCopy={(shift) => setCopiedShift(shift)}
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

      <PrintRosterModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        currentDate={date}
        invoicingStartDay={settings?.invoicingStartDay}
        activeFilterDescription={activeFilterDescription}
        onPrint={handlePrintPdfWithOptions}
      />
    </div>
  );
}
