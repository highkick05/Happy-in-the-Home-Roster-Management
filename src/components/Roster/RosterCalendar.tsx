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
import { Plus, Maximize, Minimize, Bed, Star, Copy, Printer, Clock, User, Briefcase, Pill, HeartHandshake, Compass, Car, Users, Utensils, Sparkles, ShoppingBag, ShoppingCart, Flower2, Activity, GraduationCap, Users2, Check, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AddShiftModal from './AddShiftModal';
import ShiftDetailsModal from './ShiftDetailsModal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import ActiveShiftModal from './ActiveShiftModal';
import PrintRosterModal from './PrintRosterModal';
import { buildClientColorMap, getClientColor } from '../../utils/clientColors';
import { getAvatarUrl } from '../../utils/avatar';
import showerRunningImg from '../../assets/images/shower_running_card_1794192403171.jpg';
import broomSweepingImg from '../../assets/images/broom_sweeping_card_1794192403811.jpg';
import shoppingGroceriesImg from '../../assets/images/shopping_groceries_card_1794192406239.jpg';
import communitySocialImg from '../../assets/images/community_social_card_1794192406752.jpg';
import clinicalNursingImg from '../../assets/images/clinical_nursing_card_1794192407634.jpg';
import carDrivingImg from '../../assets/images/service_car_driving.jpg';
import mealPrepImg from '../../assets/images/service_meal_prep.jpg';
import respiteBedroomImg from '../../assets/images/service_respite_bedroom.jpg';
import gardeningImg from '../../assets/images/service_gardening.jpg';
import trainingImg from '../../assets/images/service_training.jpg';
import medicationPillsImg from '../../assets/images/service_medication.jpg';
import carChatImg from '../../assets/images/service_car_chat.jpg';

import showerRunningVideo from '../../assets/videos/service_shower.mp4';
import broomSweepingVideo from '../../assets/videos/service_cleaning.mp4';
import shoppingGroceriesVideo from '../../assets/videos/service_shopping.mp4';
import communitySocialVideo from '../../assets/videos/service_community.mp4';
import clinicalNursingVideo from '../../assets/videos/service_clinical.mp4';
import carDrivingVideo from '../../assets/videos/service_driving.mp4';
import mealPrepVideo from '../../assets/videos/service_meal.mp4';
import respiteBedroomVideo from '../../assets/videos/service_respite.mp4';
import gardeningVideo from '../../assets/videos/service_gardening.mp4';
import trainingVideo from '../../assets/videos/service_training.mp4';
import medicationPillsVideo from '../../assets/videos/service_medication.mp4';
import carChatVideo from '../../assets/videos/service_car_chat.mp4';

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

const AnimatedBroomIcon = ({ className = "w-3.5 h-3.5 text-amber-300" }: { className?: string }) => (
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
    <g className="animate-broom-sweep">
      {/* Broom Handle */}
      <path d="M20 3 12.5 10.5" strokeWidth="2.2" />
      {/* Broom Collar & Flared Bristle Head */}
      <path d="m9.5 8.5 6 6-5 6.5c-2.5-1-6.5-5-7.5-7.5Z" fill="currentColor" fillOpacity="0.2" />
      {/* Bristle Slits */}
      <path d="m6.5 16 3-3" strokeWidth="1.75" />
      <path d="m8.5 18 3-3" strokeWidth="1.75" />
    </g>
    {/* Swept Dust Particles */}
    <path d="M3 20h.01" className="animate-broom-dust-1" strokeWidth="2.5" />
    <path d="M6 21.5h.01" className="animate-broom-dust-2" strokeWidth="2.5" />
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
  const [adminView, setAdminView] = useLocalStorage<View>('roster_view_admin', Views.WEEK);
  const [staffView, setStaffView] = useLocalStorage<View>('roster_view_staff', Views.AGENDA);

  const view = user?.role === 'ADMIN' ? adminView : staffView;
  const setView = user?.role === 'ADMIN' ? setAdminView : setStaffView;

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

  // Ensure valid view per role/device without overwriting the other portal's saved view
  useEffect(() => {
    if (isStaffMobileOrTablet) {
      setStaffView(Views.AGENDA);
    } else if (user?.role === 'ADMIN' && !allowedViews.includes(adminView as any)) {
      setAdminView(Views.WEEK);
    } else if (user?.role !== 'ADMIN' && !allowedViews.includes(staffView as any)) {
      setStaffView(Views.AGENDA);
    }
  }, [user?.role, isStaffMobileOrTablet, adminView, staffView]);

  const [date, setDate] = useState(new Date());

  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [coordinatorList, setCoordinatorList] = useState<any[]>([]);
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [initialShiftData, setInitialShiftData] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);
  const [copiedShift, setCopiedShift] = useState<ShiftEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filters and Grouping
  const [coordinatorFilter, setCoordinatorFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useLocalStorage<string>('roster_client_filter', '');
  const [staffFilter, setStaffFilter] = useLocalStorage<string>('roster_staff_filter', '');
  const [groupBy, setGroupBy] = useLocalStorage<'STAFF' | 'CLIENT'>('roster_group_by', 'STAFF');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const clientDropdownRef = React.useRef<HTMLDivElement>(null);
  const staffDropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedClientIds = React.useMemo(
    () => (clientFilter ? String(clientFilter).split(',').map(s => s.trim()).filter(Boolean) : []),
    [clientFilter]
  );

  const selectedStaffIds = React.useMemo(
    () => (staffFilter ? String(staffFilter).split(',').map(s => s.trim()).filter(Boolean) : []),
    [staffFilter]
  );

  const toggleClientFilterId = useCallback((idStr: string) => {
    const current = clientFilter ? String(clientFilter).split(',').map(s => s.trim()).filter(Boolean) : [];
    const next = current.includes(idStr)
      ? current.filter(x => x !== idStr)
      : [...current, idStr];
    setClientFilter(next.join(','));
  }, [clientFilter, setClientFilter]);

  const toggleStaffFilterId = useCallback((idStr: string) => {
    const current = staffFilter ? String(staffFilter).split(',').map(s => s.trim()).filter(Boolean) : [];
    const next = current.includes(idStr)
      ? current.filter(x => x !== idStr)
      : [...current, idStr];
    setStaffFilter(next.join(','));
  }, [staffFilter, setStaffFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false);
      }
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target as Node)) {
        setIsStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string | number>>(new Set());
  const longPressHandledRef = React.useRef(0);

  const isUserCareCoordinator = React.useCallback((u: any): boolean => {
    if (!u || u.status === 'SUSPENDED') return false;
    if (u.primary_position === 'Care Coordinator') return true;
    if (!u.additional_positions) return false;
    try {
      const parsed = Array.isArray(u.additional_positions)
        ? u.additional_positions
        : JSON.parse(u.additional_positions);
      return Array.isArray(parsed) && parsed.includes('Care Coordinator');
    } catch {
      return false;
    }
  }, []);

  const findMatchingCareCoordinator = React.useCallback((coordinators: any[], currentUser: any) => {
    if (!currentUser || !Array.isArray(coordinators) || coordinators.length === 0) return null;
    if (currentUser.id != null) {
      const byId = coordinators.find(cc => Number(cc.id) === Number(currentUser.id));
      if (byId) return byId;
    }
    const userEmail = String(currentUser.email || '').trim().toLowerCase();
    if (userEmail) {
      const byEmail = coordinators.find(cc => String(cc.email || '').trim().toLowerCase() === userEmail);
      if (byEmail) return byEmail;
    }
    const userFullName = `${currentUser.firstName || currentUser.first_name || ''} ${currentUser.lastName || currentUser.last_name || ''}`
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (userFullName) {
      const byName = coordinators.find(
        cc =>
          `${cc.first_name || cc.firstName || ''} ${cc.last_name || cc.lastName || ''}`
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ') === userFullName
      );
      if (byName) return byName;
    }
    return null;
  }, []);

  useEffect(() => {
    if (activeView === Views.AGENDA && multiSelectMode) {
      setMultiSelectMode(false);
      setSelectedEventIds(new Set());
    }
  }, [activeView, multiSelectMode]);

  useEffect(() => {
    if (clientList.length > 0 && selectedClientIds.length > 0) {
      const validIds = selectedClientIds.filter(id =>
        clientList.some((c: any) => c.id.toString() === id)
      );
      if (validIds.length !== selectedClientIds.length) {
        setClientFilter(validIds.join(','));
      }
    }
  }, [clientList, selectedClientIds, setClientFilter]);

  useEffect(() => {
    if (staffList.length > 0 && selectedStaffIds.length > 0) {
      const validIds = selectedStaffIds.filter(
        id => id === 'unassigned' || staffList.some((s: any) => s.id.toString() === id)
      );
      if (validIds.length !== selectedStaffIds.length) {
        setStaffFilter(validIds.join(','));
      }
    }
  }, [staffList, selectedStaffIds, setStaffFilter]);

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

      const [shiftsRes, staffRes, clientsRes, servicesRes] = await Promise.all([
        fetch(`/api/shifts?start=${startIso}&end=${endIso}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`/api/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/services`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();

        const mappedShifts = shiftsData.map((d: any) => ({
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
          providerTravelMinutes: d.provider_travel_minutes,
          providerTravelCost: d.provider_travel_cost,
          homeCareTravelKm: d.home_care_travel_km,
          homeCareTravelTotal: d.home_care_travel_total,
          abtKm: d.abt_km,
          abtCost: d.abt_cost,
          transportRouteLog: d.transport_route_log,
          travelBreakdown: d.travel_breakdown,
          actualStartTime: d.actual_start_time,
          actualFinishTime: d.actual_finish_time,
          progressNote: d.progress_note,
          startOdometer: d.odometer_start_reading ? Math.round(Number(d.odometer_start_reading)).toString() : null,
          endOdometer: d.odometer_end_reading ? Math.round(Number(d.odometer_end_reading)).toString() : null,
          isHistorical: d.is_historical,
          vehicleId: d.vehicle_id,
          vehicle_id: d.vehicle_id,
          invoiceLocked: Boolean(d.invoice_locked),
          invoiceStatus: d.invoice_status || null,
        }));

        let allEvents = [...mappedShifts];
        
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
        const sortByName = (a: any, b: any) => {
          const lastCmp = (a.last_name || '').trim().localeCompare((b.last_name || '').trim(), undefined, { sensitivity: 'base' });
          if (lastCmp !== 0) return lastCmp;
          return (a.first_name || '').trim().localeCompare((b.first_name || '').trim(), undefined, { sensitivity: 'base' });
        };
        const sortedStaff = staffData
          .filter((u: any) => u.role !== 'ADMIN' && u.status !== 'SUSPENDED')
          .sort(sortByName);
        setStaffList(sortedStaff);

        const sortedCoordinators = staffData
          .filter(isUserCareCoordinator)
          .sort(sortByName);
        setCoordinatorList(sortedCoordinators);
      }
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        const sortedClients = clientsData
          .filter((client: any) => client.status !== 'SUSPENDED')
          .sort((a: any, b: any) => {
            const lastCmp = (a.last_name || '').trim().localeCompare((b.last_name || '').trim(), undefined, { sensitivity: 'base' });
            if (lastCmp !== 0) return lastCmp;
            return (a.first_name || '').trim().localeCompare((b.first_name || '').trim(), undefined, { sensitivity: 'base' });
          });
        setClientList(sortedClients);
      }
      if (servicesRes.ok) setServicesList(await servicesRes.json());
    } catch (e) {
      console.error(e);
    }
  }, [token, date, view, user?.id, isUserCareCoordinator]);

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

  const visibleClientList = React.useMemo(() => {
    if (!coordinatorFilter) return clientList;
    if (coordinatorFilter === 'unassigned') {
      return clientList.filter((c: any) => !c.care_coordinator_id);
    }
    return clientList.filter(
      (c: any) => String(c.care_coordinator_id || '') === String(coordinatorFilter)
    );
  }, [clientList, coordinatorFilter]);

  const coordinatorClientIdsSet = React.useMemo(() => {
    if (!coordinatorFilter) return null;
    return new Set<number>(visibleClientList.map((c: any) => Number(c.id)));
  }, [coordinatorFilter, visibleClientList]);

  const filteredEvents = events.filter(e => {
    // Only apply coordinator/client/staff filters if user is ADMIN (since staff don't have the UI to clear them)
    if (user?.role === 'ADMIN') {
      if (coordinatorClientIdsSet !== null) {
        if (!e.clientId || !coordinatorClientIdsSet.has(Number(e.clientId))) {
          return false;
        }
      }
      if (selectedClientIds.length > 0 && !selectedClientIds.includes(String(e.clientId ?? ''))) {
        return false;
      }
      
      if (selectedStaffIds.length > 0) {
        const wantUnassigned = selectedStaffIds.includes('unassigned');
        if (e.isRespiteWrapper && e.respiteData?.shifts) {
          const matchesRespite = e.respiteData.shifts.some((s: any) =>
            (!s.staff_id && wantUnassigned) ||
            (s.staff_id != null && selectedStaffIds.includes(String(s.staff_id)))
          );
          if (!matchesRespite) return false;
        } else {
          const isUnassignedShift = e.staffId === null || e.staffId === undefined;
          const matchesShift =
            (isUnassignedShift && wantUnassigned) ||
            (!isUnassignedShift && selectedStaffIds.includes(String(e.staffId)));
          if (!matchesShift) return false;
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

  const onSelectEvent = async (event: ShiftEvent) => {
    if (Date.now() - longPressHandledRef.current < 600) return; // Prevent click immediately after long press
    if (multiSelectMode && activeView !== Views.AGENDA) {
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
       setIsShiftModalOpen(true);
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
    if (selectedClientIds.length === 1) initialData.clientId = selectedClientIds[0];
    if (selectedStaffIds.length === 1 && selectedStaffIds[0] !== 'unassigned') initialData.staffId = selectedStaffIds[0];

    setInitialShiftData(initialData);
    setIsShiftModalOpen(true);
  };

  const handleAddShift = () => {
    setInitialShiftData(null);
    setIsShiftModalOpen(true);
  };

  const activeFilterDescription = React.useMemo(() => {
    if (selectedClientIds.length > 0) {
      const names = selectedClientIds
        .map(id => {
          const c = clientList.find(cl => cl.id.toString() === id);
          return c ? `${c.first_name} ${c.last_name}` : null;
        })
        .filter(Boolean);
      return names.length > 0 ? `Client: ${names.join(', ')}` : 'Filtered by Client';
    }
    if (coordinatorFilter) {
      if (coordinatorFilter === 'unassigned') return 'Unassigned Care Coordinator Clients';
      const cc = coordinatorList.find(s => s.id.toString() === coordinatorFilter);
      if (cc) return `Care Coordinator: ${cc.first_name} ${cc.last_name}`;
    }
    if (selectedStaffIds.length > 0) {
      const names = selectedStaffIds
        .map(id => {
          if (id === 'unassigned') return 'Unassigned Staff';
          const s = staffList.find(st => st.id.toString() === id);
          return s ? `${s.first_name} ${s.last_name}` : null;
        })
        .filter(Boolean);
      return names.length > 0 ? `Staff: ${names.join(', ')}` : 'Filtered by Staff';
    }
    if (user?.role !== 'ADMIN') {
      return `Staff: ${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    }
    return 'All Staff & Clients';
  }, [selectedClientIds, coordinatorFilter, selectedStaffIds, clientList, coordinatorList, staffList, user]);

  const handlePrintPdfWithOptions = async (rangeStart: Date, rangeEnd: Date) => {
    try {
      const startIso = rangeStart.toISOString();
      const endIso = rangeEnd.toISOString();
      
      const shiftsRes = await fetch(`/api/shifts?start=${startIso}&end=${endIso}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      
      let inRangeShifts: any[] = [];
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json();
        
        const mappedIndividual = shiftsData.map((d: any) => {
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
        
        inRangeShifts = mappedIndividual.filter((shift: any) => {
          const sDate = new Date(shift.start);
          const eDate = new Date(shift.end);
          if (sDate > rangeEnd || eDate < rangeStart) return false;

          if (user?.role === 'ADMIN') {
            if (coordinatorClientIdsSet !== null) {
              if (!shift.clientId || !coordinatorClientIdsSet.has(Number(shift.clientId))) {
                return false;
              }
            }
            if (selectedClientIds.length > 0 && !selectedClientIds.includes(String(shift.clientId ?? ''))) return false;
            
            if (selectedStaffIds.length > 0) {
              const wantUnassigned = selectedStaffIds.includes('unassigned');
              if (shift.isRespiteWrapper && shift.respiteData?.shifts) {
                const isStaffAssigned = shift.respiteData.shifts.some((s: any) =>
                  (!s.staff_id && wantUnassigned) ||
                  (s.staff_id != null && selectedStaffIds.includes(String(s.staff_id)))
                );
                if (!isStaffAssigned) return false;
              } else {
                const isUnassignedShift = shift.staffId === null || shift.staffId === undefined;
                const matches =
                  (isUnassignedShift && wantUnassigned) ||
                  (!isUnassignedShift && selectedStaffIds.includes(String(shift.staffId)));
                if (!matches) return false;
              }
            }
          }
          return true;
        });
      }

      let filterName = '';
      if (selectedClientIds.length > 0) {
        const names = selectedClientIds
          .map(id => {
            const c = clientList.find(cl => cl.id.toString() === id);
            return c ? `${c.first_name} ${c.last_name}` : null;
          })
          .filter(Boolean);
        if (names.length > 0) filterName = names.join(', ');
      } else if (coordinatorFilter) {
        if (coordinatorFilter === 'unassigned') {
          filterName = 'Unassigned Care Coordinator';
        } else {
          const cc = coordinatorList.find(s => s.id.toString() === coordinatorFilter);
          if (cc) filterName = `Coordinator ${cc.first_name} ${cc.last_name}`;
        }
      } else if (selectedStaffIds.length > 0) {
        const names = selectedStaffIds
          .map(id => {
            if (id === 'unassigned') return 'Unassigned Staff';
            const s = staffList.find(st => st.id.toString() === id);
            return s ? `${s.first_name} ${s.last_name}` : null;
          })
          .filter(Boolean);
        if (names.length > 0) filterName = names.join(', ');
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

  const clientColorMap = React.useMemo(
    () => buildClientColorMap(clientList, events.map((e: ShiftEvent) => e.clientId)),
    [clientList, events]
  );

  const getClientBorderColor = (event: ShiftEvent): string => {
    return getClientColor(event.clientId, event.clientName || event.title, clientColorMap);
  };

  const resolvePrimaryShiftServiceName = useCallback((event: ShiftEvent): string => {
    if (!event) return '';
    if (event.isRespiteWrapper) return 'Respite';
    if (Array.isArray(event.servicesData) && event.servicesData.length > 0) {
      const resolveSdName = (sd: any) => {
        const srv = servicesList.find((s: any) => String(s.id) === String(sd?.serviceId));
        let name = srv ? srv.name : (sd?.serviceName || sd?.customName || sd?.name || '');
        if (!name || name === 'Unknown Service') {
          if (String(sd?.serviceId).toLowerCase().includes('orientation')) {
            name = 'Orientation';
          } else if (String(sd?.serviceId).toLowerCase().includes('custom')) {
            name = sd?.serviceName || sd?.customName || 'Custom Service';
          }
        }
        return String(name || '');
      };
      const nonTravelItem = event.servicesData.find((sd: any) => {
        const lower = resolveSdName(sd).toLowerCase();
        return (
          lower &&
          !lower.includes('provider travel') &&
          !lower.includes('travel - provider') &&
          !lower.includes('activity based transport') &&
          !lower.includes('activity-based transport')
        );
      });
      const chosenSd = nonTravelItem || event.servicesData[0];
      const chosenName = resolveSdName(chosenSd);
      if (chosenName) return chosenName;
    }
    return String(event.serviceName || '');
  }, [servicesList]);

  const getServiceCardBackgroundImage = useCallback((serviceName?: string): string => {
    const s = (serviceName || '').toLowerCase();

    // Self-care / Personal Care / Activities of daily living / Hygiene / Shower / Dressing
    if (
      s.includes('self-care') ||
      s.includes('self care') ||
      s.includes('personal care') ||
      s.includes('daily living') ||
      s.includes('hygiene') ||
      s.includes('shower') ||
      s.includes('dressing')
    ) {
      return showerRunningImg;
    }

    // Domestic Assistance / Cleaning / Household / Laundry / Chores
    if (
      s.includes('domestic') ||
      s.includes('clean') ||
      s.includes('cleaning') ||
      s.includes('household') ||
      s.includes('laundry') ||
      s.includes('chore')
    ) {
      return broomSweepingImg;
    }

    // Shopping / Groceries / Trolley / Store / Errands
    if (
      s.includes('shop') ||
      s.includes('shopping') ||
      s.includes('groceries') ||
      s.includes('grocery') ||
      s.includes('store') ||
      s.includes('errand') ||
      s.includes('trolley')
    ) {
      return shoppingGroceriesImg;
    }

    // Assistance with Self-Administration of Medication / Pills / Medicine
    if (
      s.includes('medication') ||
      s.includes('medicine') ||
      s.includes('pill') ||
      s.includes('self-administration') ||
      s.includes('self administration')
    ) {
      return medicationPillsImg;
    }

    // Registered Nurse Clinical Care (Direct & Indirect) / Nursing / Therapy / Allied Health
    if (
      s.includes('registered nurse') ||
      s.includes('clinical care') ||
      s.includes('nurse') ||
      s.includes('nursing') ||
      s.includes('clinical') ||
      s.includes('therapy') ||
      s.includes('allied') ||
      s.includes('physio') ||
      s.includes('psych') ||
      s.includes('rehab')
    ) {
      return clinicalNursingImg;
    }

    // NDIS Access Community Social and Rec (Close-up of two people in a car chatting & driving)
    if (
      s.includes('access community') ||
      s.includes('social and rec')
    ) {
      return carChatImg;
    }

    // Individual Social Supports / Transport / Travel / Driving / Vehicle
    if (
      s.includes('individual social') ||
      s.includes('social support') ||
      s.includes('transport') ||
      s.includes('travel') ||
      s.includes('drive') ||
      s.includes('driving') ||
      s.includes('vehicle') ||
      /\bcar\b/i.test(s)
    ) {
      return carDrivingImg;
    }

    // Meal Prep / Cooking / Food / Diet / Kitchen / Nutrition
    if (
      s.includes('meal') ||
      s.includes('food') ||
      s.includes('cook') ||
      s.includes('cooking') ||
      s.includes('kitchen') ||
      s.includes('nutrition')
    ) {
      return mealPrepImg;
    }

    // Respite / Short Term Accommodation / Sleepover / Night
    if (
      s.includes('respite') ||
      s.includes('short term accommodation') ||
      s.includes('sleepover') ||
      s.includes('night') ||
      s.includes('bed') ||
      /\bsta\b/i.test(s)
    ) {
      return respiteBedroomImg;
    }

    // Gardening / Yard / Lawn / Outdoor
    if (
      s.includes('garden') ||
      s.includes('gardening') ||
      s.includes('yard') ||
      s.includes('lawn') ||
      s.includes('outdoor')
    ) {
      return gardeningImg;
    }

    // Skill Development and Training / Capacity Building / Learning
    if (
      s.includes('skill') ||
      s.includes('training') ||
      s.includes('learning') ||
      s.includes('development') ||
      s.includes('capacity')
    ) {
      return trainingImg;
    }

    // Community / Social / Outing / Buddy / Orientation / Default
    return communitySocialImg;
  }, []);

  const getServiceCardBackgroundVideo = useCallback((serviceName?: string): string => {
    const s = (serviceName || '').toLowerCase();

    // Self-care / Personal Care / Activities of daily living / Hygiene / Shower / Dressing
    if (
      s.includes('self-care') ||
      s.includes('self care') ||
      s.includes('personal care') ||
      s.includes('daily living') ||
      s.includes('hygiene') ||
      s.includes('shower') ||
      s.includes('dressing')
    ) {
      return showerRunningVideo;
    }

    // Domestic Assistance / Cleaning / Household / Laundry / Chores
    if (
      s.includes('domestic') ||
      s.includes('clean') ||
      s.includes('cleaning') ||
      s.includes('household') ||
      s.includes('laundry') ||
      s.includes('chore')
    ) {
      return broomSweepingVideo;
    }

    // Shopping / Groceries / Trolley / Store / Errands
    if (
      s.includes('shop') ||
      s.includes('shopping') ||
      s.includes('groceries') ||
      s.includes('grocery') ||
      s.includes('store') ||
      s.includes('errand') ||
      s.includes('trolley')
    ) {
      return shoppingGroceriesVideo;
    }

    // Assistance with Self-Administration of Medication / Pills / Medicine
    if (
      s.includes('medication') ||
      s.includes('medicine') ||
      s.includes('pill') ||
      s.includes('self-administration') ||
      s.includes('self administration')
    ) {
      return medicationPillsVideo;
    }

    // Registered Nurse Clinical Care (Direct & Indirect) / Nursing / Therapy / Allied Health
    if (
      s.includes('registered nurse') ||
      s.includes('clinical care') ||
      s.includes('nurse') ||
      s.includes('nursing') ||
      s.includes('clinical') ||
      s.includes('therapy') ||
      s.includes('allied') ||
      s.includes('physio') ||
      s.includes('psych') ||
      s.includes('rehab')
    ) {
      return clinicalNursingVideo;
    }

    // NDIS Access Community Social and Rec (Close-up of two people in a car chatting & driving)
    if (
      s.includes('access community') ||
      s.includes('social and rec')
    ) {
      return carChatVideo;
    }

    // Individual Social Supports / Transport / Travel / Driving / Vehicle
    if (
      s.includes('individual social') ||
      s.includes('social support') ||
      s.includes('transport') ||
      s.includes('travel') ||
      s.includes('drive') ||
      s.includes('driving') ||
      s.includes('vehicle') ||
      /\bcar\b/i.test(s)
    ) {
      return carDrivingVideo;
    }

    // Meal Prep / Cooking / Food / Diet / Kitchen / Nutrition
    if (
      s.includes('meal') ||
      s.includes('food') ||
      s.includes('cook') ||
      s.includes('cooking') ||
      s.includes('kitchen') ||
      s.includes('nutrition')
    ) {
      return mealPrepVideo;
    }

    // Respite / Short Term Accommodation / Sleepover / Night
    if (
      s.includes('respite') ||
      s.includes('short term accommodation') ||
      s.includes('sleepover') ||
      s.includes('night') ||
      s.includes('bed') ||
      /\bsta\b/i.test(s)
    ) {
      return respiteBedroomVideo;
    }

    // Gardening / Yard / Lawn / Outdoor
    if (
      s.includes('garden') ||
      s.includes('gardening') ||
      s.includes('yard') ||
      s.includes('lawn') ||
      s.includes('outdoor')
    ) {
      return gardeningVideo;
    }

    // Skill Development and Training / Capacity Building / Learning
    if (
      s.includes('skill') ||
      s.includes('training') ||
      s.includes('learning') ||
      s.includes('development') ||
      s.includes('capacity')
    ) {
      return trainingVideo;
    }

    // Community / Social / Outing / Buddy / Orientation / Default
    return communitySocialVideo;
  }, []);

  const getShiftStatusGradient = useCallback((event: ShiftEvent): string => {
    const isInProgress = event.status === 'IN_PROGRESS';
    const isUnassigned = !event.staffId && !event.isRespiteWrapper;

    let statusGradient = 'linear-gradient(105deg, rgba(14, 165, 233, 0.78) 0%, rgba(14, 165, 233, 0.48) 48%, rgba(14, 165, 233, 0.18) 100%)';

    if (event.status === 'DRAFT') {
      statusGradient = 'linear-gradient(105deg, rgba(82, 82, 91, 0.80) 0%, rgba(82, 82, 91, 0.52) 48%, rgba(82, 82, 91, 0.22) 100%)';
    }
    if (event.status === 'COMPLETED') {
      statusGradient = 'linear-gradient(105deg, rgba(163, 230, 53, 0.78) 0%, rgba(163, 230, 53, 0.48) 48%, rgba(163, 230, 53, 0.16) 100%)';
    }
    if (isInProgress) {
      statusGradient = 'linear-gradient(105deg, rgba(245, 158, 11, 0.80) 0%, rgba(245, 158, 11, 0.50) 48%, rgba(245, 158, 11, 0.20) 100%)';
    }
    if (event.status === 'PENDING_SYNC') {
      statusGradient = 'linear-gradient(105deg, rgba(249, 115, 22, 0.78) 0%, rgba(249, 115, 22, 0.50) 48%, rgba(249, 115, 22, 0.20) 100%)';
    }
    if (event.status === 'CANCELLED') {
      statusGradient = 'linear-gradient(105deg, rgba(239, 68, 68, 0.80) 0%, rgba(239, 68, 68, 0.52) 48%, rgba(239, 68, 68, 0.22) 100%)';
    }
    if (event.isRespiteWrapper) {
      statusGradient = 'linear-gradient(105deg, rgba(139, 92, 246, 0.78) 0%, rgba(139, 92, 246, 0.50) 48%, rgba(139, 92, 246, 0.20) 100%)';
    }
    if (isUnassigned && event.status !== 'CANCELLED' && event.status !== 'COMPLETED') {
      statusGradient = event.status === 'DRAFT'
        ? 'linear-gradient(105deg, rgba(157, 23, 77, 0.80) 0%, rgba(157, 23, 77, 0.52) 48%, rgba(157, 23, 77, 0.22) 100%)'
        : 'linear-gradient(105deg, rgba(219, 39, 119, 0.78) 0%, rgba(219, 39, 119, 0.50) 48%, rgba(219, 39, 119, 0.20) 100%)';
    }
    return statusGradient;
  }, []);

  const eventStyleGetter = (event: ShiftEvent) => {
    if (view === Views.AGENDA) {
      return {
        style: {
           background: 'transparent',
           border: 'none',
           color: 'inherit',
           padding: '8px',
           backgroundColor: 'transparent',
        }
      };
    }

    const isSelected = multiSelectMode && selectedEventIds.has(event.id);
    const isInProgress = event.status === 'IN_PROGRESS';
    const isUnassigned = !event.staffId && !event.isRespiteWrapper;
    const clientBorderColor = getClientBorderColor(event);
    const resolvedServiceName = resolvePrimaryShiftServiceName(event);
    const serviceBgUrl = getServiceCardBackgroundImage(resolvedServiceName);
    const statusGradient = getShiftStatusGradient(event);

    let backgroundColor: string | undefined = '#0ea5e9'; // brand-blue
    let outerBorder = isSelected ? '2px solid white' : '1.5px solid #0B0E14';

    if (event.status === 'DRAFT') {
      backgroundColor = '#52525b'; // zinc-600
      outerBorder = isSelected ? '2px solid white' : '1px dashed #a1a1aa'; // zinc-400
    }
    if (event.status === 'COMPLETED') {
      backgroundColor = '#a3e635'; // brand-green
    }
    if (isInProgress) {
      backgroundColor = '#f59e0b'; // warm golden amber
      outerBorder = isSelected ? '2px solid white' : '1.5px solid #d97706';
    }
    if (event.status === 'PENDING_SYNC') {
      backgroundColor = '#f97316'; // orange-500
    }
    if (event.status === 'CANCELLED') {
      backgroundColor = '#ef4444'; // red-500
    }
    
    if (event.isRespiteWrapper) {
      backgroundColor = '#8b5cf6'; // violet-500
      outerBorder = isSelected ? '2px solid white' : '1.5px solid #0B0E14';
    }

    if (isUnassigned && event.status !== 'CANCELLED' && event.status !== 'COMPLETED') {
      backgroundColor = event.status === 'DRAFT' ? '#9d174d' : '#db2777'; // vibrant magenta-pink for unassigned shifts
      outerBorder = isSelected
        ? '2px solid white'
        : (event.status === 'DRAFT' ? '1.5px dashed #f472b6' : '1.5px solid #f9a8d4');
    }

    const classList: string[] = [];
    if (isUnassigned) classList.push('unassigned-shift-animated');
    if (isInProgress) classList.push('in-progress-shift-animated');
    const className = classList.join(' ');

    const textColor = '#000000';
    const textShadow = '0 1px 1px rgba(255, 255, 255, 0.85)';

    return {
      className,
      style: {
        backgroundColor,
        backgroundImage: `${statusGradient}, url("${serviceBgUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: serviceBgUrl === showerRunningImg ? 'center 32%' : 'center 42%',
        backgroundRepeat: 'no-repeat',
        borderRadius: '6px',
        opacity: 1,
        color: textColor,
        textShadow,
        borderTop: outerBorder,
        borderRight: outerBorder,
        borderBottom: outerBorder,
        borderLeft: isSelected ? '6px solid #ffffff' : `6px solid ${clientBorderColor}`,
        display: 'block',
        isolation: 'isolate' as any,
        overflow: 'hidden',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: isSelected
          ? '0 0 0 2px rgba(14, 165, 233, 0.65), 0 6px 14px rgba(0, 0, 0, 0.6)'
          : (isInProgress
              ? '0 4px 12px rgba(0, 0, 0, 0.55), 0 0 10px rgba(245, 158, 11, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              : (isUnassigned
                  ? '0 4px 12px rgba(0, 0, 0, 0.55), 0 0 10px rgba(236, 72, 153, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                  : '0 4px 10px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)')),
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

      const clientObj = clientList.find(
        (c: any) => c.id === event.clientId || String(c.id) === String(event.clientId)
      );
      const clientAvatarUrl = clientObj?.avatar_url ? getAvatarUrl(clientObj.avatar_url) : '';
      const clientInitials = (() => {
        const first = clientObj?.first_name || (event.clientName || '').split(' ')[0] || '';
        const last = clientObj?.last_name || (event.clientName || '').split(' ').slice(1).join(' ') || '';
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
      })();

      const resolvedServiceName = resolvePrimaryShiftServiceName(event);
      const serviceBadge = resolvedServiceName ? getServiceBadge(resolvedServiceName) : null;
      const serviceBgUrl = getServiceCardBackgroundImage(resolvedServiceName);
      const serviceVideoUrl = getServiceCardBackgroundVideo(resolvedServiceName);
      const statusGradient = getShiftStatusGradient(event);

      return (
        <div 
          className="w-full h-full flex flex-row items-center overflow-hidden truncate px-1"
          title={resolvedServiceName ? `${title} — ${resolvedServiceName}` : title}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          {/* Always-on full-card realistic service video with poster fallback + status tint */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <video
              src={serviceVideoUrl}
              poster={serviceBgUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                e.currentTarget.muted = true;
                e.currentTarget.play().catch(() => {});
              }}
              style={{ objectPosition: serviceVideoUrl === showerRunningVideo ? 'center 32%' : 'center center' }}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: statusGradient }}
            />
          </div>

          {event.isRespiteWrapper && (
            <div className="flex items-center gap-1 shrink-0 mr-1 relative z-2">
              <Bed className="w-3.5 h-3.5 text-violet-100 drop-shadow-sm" />
            </div>
          )}
          {event.status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1 mr-1.5 px-1.5 py-0.5 rounded-full bg-white/75 border border-white/60 shadow-xs relative z-2 select-none shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
              </span>
              <span className="text-[9px] font-black tracking-wider text-black uppercase leading-none">LIVE</span>
            </span>
          )}
          <div className="inline-flex items-center min-w-0 max-w-full relative z-2 px-1.5 py-0.5 rounded-md bg-white/65 backdrop-blur-[2px] border border-white/50 text-black shadow-xs">
            {clientAvatarUrl ? (
              <img
                src={clientAvatarUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover shrink-0 mr-1.5 border border-black/30 bg-[#151515] shadow-xs"
              />
            ) : (
              <span className="w-4 h-4 rounded-full bg-slate-950/85 text-white border border-white/25 flex items-center justify-center text-[8px] font-bold shrink-0 mr-1.5 shadow-xs">
                {clientInitials}
              </span>
            )}
            <span className="truncate font-bold uppercase tracking-wide text-black">{title}</span>
            {serviceBadge && (
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-950/85 border border-black/25 ml-1.5 shrink-0 shadow-xs"
                title={resolvedServiceName}
              >
                {serviceBadge.icon}
              </span>
            )}
          </div>

          {event.isRespiteWrapper && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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
          icon: <AnimatedBroomIcon className="w-3.5 h-3.5 text-amber-300" />,
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
      if (!event) return null;

      let containerClass = 'transition-all duration-150 rounded-xl border border-zinc-700/80 p-2.5 sm:p-3 lg:p-3.5 backdrop-blur-md relative overflow-hidden shadow-lg shadow-black/40 hover:shadow-xl hover:border-zinc-500 hover:-translate-y-px ';
      let badgeLabel = event.status;
      let badgeClass = 'text-zinc-400 bg-zinc-800/80';
      
      const isCancelled = event.status === 'CANCELLED';
      const isCompleted = event.status === 'COMPLETED' && !isCancelled;
      const isInProgress = event.status === 'IN_PROGRESS' && !isCancelled;

      if (event.isRespiteWrapper) {
         containerClass += 'border-l-[6px] border-l-violet-500 bg-zinc-900/95 bg-gradient-to-r from-violet-500/20 via-zinc-900/90 to-zinc-900 hover:from-violet-500/30';
         badgeClass = 'text-violet-300 bg-violet-500/20 group-hover:bg-violet-500/30';
      } else if (isCancelled) {
         containerClass += 'border-l-[6px] border-l-red-500 bg-zinc-900/95 bg-gradient-to-r from-red-500/15 via-zinc-900/90 to-zinc-900 hover:from-red-500/25';
         badgeClass = 'text-red-400 bg-red-500/20 group-hover:bg-red-500/30';
         badgeLabel = 'Cancelled';
      } else if (event.status === 'DRAFT') {
         containerClass += 'border-l-[6px] border-l-zinc-500 bg-zinc-900/95 bg-gradient-to-r from-zinc-700/25 via-zinc-900/90 to-zinc-900 hover:from-zinc-700/35';
         badgeClass = 'text-zinc-400 bg-zinc-800/80 group-hover:bg-zinc-800';
         badgeLabel = 'Draft';
      } else if (event.status === 'PENDING_SYNC') {
         containerClass += 'border-l-[6px] border-l-amber-500 bg-zinc-900/95 bg-gradient-to-r from-amber-500/15 via-zinc-900/90 to-zinc-900 hover:from-amber-500/25';
         badgeClass = 'text-amber-400 bg-amber-500/20 group-hover:bg-amber-500/30';
         badgeLabel = 'Pending Sync';
      } else if (event.status === 'PUBLISHED') {
         containerClass += 'border-l-[6px] border-l-brand-teal bg-zinc-900/95 bg-gradient-to-r from-brand-teal/15 via-zinc-900/90 to-zinc-900 hover:from-brand-teal/25';
         badgeClass = 'text-brand-teal bg-brand-teal/20 group-hover:bg-brand-teal/30';
      } else if (isCompleted) {
         containerClass += 'border-l-[6px] border-l-brand-green bg-zinc-900/95 bg-gradient-to-r from-brand-green/15 via-zinc-900/90 to-zinc-900 hover:from-brand-green/25';
         badgeClass = 'text-brand-green bg-brand-green/20 group-hover:bg-brand-green/30';
         badgeLabel = 'Completed';
      } else if (isInProgress) {
         containerClass += 'border-l-[6px] border-l-amber-400 bg-zinc-900/95 bg-gradient-to-r from-amber-500/20 via-zinc-900/90 to-zinc-900 hover:from-amber-500/30 ring-1 ring-amber-500/40 in-progress-agenda-item ';
         badgeClass = 'text-amber-300 bg-amber-500/25 group-hover:bg-amber-500/35';
         badgeLabel = 'In Progress';
      } else {
         containerClass += 'border-l-[6px] border-l-zinc-600 bg-zinc-900/95 bg-gradient-to-r from-zinc-800/40 via-zinc-900/90 to-zinc-900 hover:bg-zinc-850';
         badgeClass = 'text-zinc-400 bg-zinc-800/60 group-hover:bg-zinc-800';
      }

      const startText = event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
      const endText = event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();

      // Client name cleaned of redundant staff name in parentheses
      const clientDisplayName = event.clientName || (event.title ? event.title.replace(/\s*\([^)]*\)$/, '') : 'Client');

      // Shift duration in hours
      const durationMs = Math.max(0, event.end.getTime() - event.start.getTime());
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationFormatted = (() => {
        if (durationHours <= 0) return '0 hrs';
        const val = Number.isInteger(durationHours) ? durationHours.toString() : parseFloat(durationHours.toFixed(2)).toString();
        return `${val} ${val === '1' ? 'hr' : 'hrs'}`;
      })();

      // Funding stream badge (NDIS or HCP)
      const clientObj = clientList.find((c: any) => c.id === event.clientId || String(c.id) === String(event.clientId));
      const rawFunding = event.fundingType || clientObj?.funding_type || clientObj?.fundingType || 'NDIS';
      const isHCP = rawFunding === 'HCP' || rawFunding === 'HOME_CARE' || rawFunding === 'Home Care';
      const fundingBadgeLabel = isHCP ? 'HCP' : (rawFunding === 'NDIS' ? 'NDIS' : rawFunding);

      // Assigned staff & position
      const staffObj = staffList.find((s: any) => s.id === event.staffId || String(s.id) === String(event.staffId));
      const staffPosition = staffObj?.primary_position || (staffObj?.role === 'ADMIN' ? 'Administrator' : (event.staffId ? 'Support Worker' : ''));

      // Distance, travel time, and ABT calculation for Agenda card
      const shiftServiceItems = Array.isArray(event.servicesData) ? event.servicesData : [];
      const resolveServiceName = (sd: any) => {
        const srv = servicesList.find((s: any) => String(s.id) === String(sd?.serviceId));
        return String(srv?.name || sd?.serviceName || sd?.customName || sd?.name || '').toLowerCase();
      };
      const hasProviderTravelService = isHCP || shiftServiceItems.some((sd: any) => {
        const n = resolveServiceName(sd);
        return n.includes('provider travel') || n.includes('travel - provider');
      }) || String(event.serviceName || '').toLowerCase().includes('provider travel');

      const hasABTService = isHCP || shiftServiceItems.some((sd: any) => {
        const n = resolveServiceName(sd);
        return n.includes('activity based transport') || n.includes('activity-based transport');
      }) || String(event.serviceName || '').toLowerCase().includes('activity based transport');

      let distKm = hasProviderTravelService ? Number(event.providerTravelKm || event.homeCareTravelKm || 0) : 0;
      let travelMins = hasProviderTravelService ? Number(event.providerTravelMinutes || 0) : 0;
      let abtKm = hasABTService ? Number(event.abtKm || 0) : 0;

      if (event.transportRouteLog) {
        try {
          const parsed = typeof event.transportRouteLog === 'string'
            ? JSON.parse(event.transportRouteLog)
            : event.transportRouteLog;
          if (parsed) {
            if (hasProviderTravelService) {
              if (distKm <= 0 && parsed.providerTravel?.distance) distKm = Number(parsed.providerTravel.distance);
              if (travelMins <= 0 && parsed.providerTravel?.minutes) travelMins = Number(parsed.providerTravel.minutes);
              if (distKm <= 0 && parsed.homeCareTravel?.distance) distKm = Number(parsed.homeCareTravel.distance);
              if (travelMins <= 0 && parsed.homeCareTravel?.minutes) travelMins = Number(parsed.homeCareTravel.minutes);
              if (Array.isArray(parsed.providerTravel?.legs)) {
                for (const leg of parsed.providerTravel.legs) {
                  if (distKm <= 0 && leg.distance) distKm = Number(leg.distance);
                  if (travelMins <= 0 && (leg.durationMins || leg.minutes)) travelMins = Number(leg.durationMins || leg.minutes);
                }
              }
              if (Array.isArray(parsed.homeCareTravel?.legs)) {
                for (const leg of parsed.homeCareTravel.legs) {
                  if (distKm <= 0 && leg.distance) distKm = Number(leg.distance);
                  if (travelMins <= 0 && (leg.durationMins || leg.minutes)) travelMins = Number(leg.durationMins || leg.minutes);
                }
              }
              if (Array.isArray(parsed)) {
                for (const leg of parsed) {
                  if (distKm <= 0 && leg.distance) distKm = Number(leg.distance);
                  if (travelMins <= 0 && (leg.durationMins || leg.minutes)) travelMins = Number(leg.durationMins || leg.minutes);
                }
              }
            }
            if (hasABTService && abtKm <= 0 && parsed.abt?.distance) {
              abtKm = Number(parsed.abt.distance);
            }
          }
        } catch (e) {}
      }

      if (hasProviderTravelService) {
        if (distKm > 0 && travelMins <= 0) {
          travelMins = Math.max(1, Math.round((distKm / 45) * 60));
        } else if (travelMins > 0 && distKm <= 0) {
          distKm = Number(((travelMins / 60) * 45).toFixed(1));
        }
      }

      const formattedDistance = distKm > 0 ? `${distKm.toFixed(1)} km` : (event.staffId ? '0.0 km' : '–');
      const formattedTravelTime = travelMins > 0 ? (travelMins >= 60 ? `${Math.floor(travelMins / 60)}h ${Math.round(travelMins % 60)}m` : `${Math.round(travelMins)} mins`) : (event.staffId ? '0 mins' : '–');
      const formattedAbtDistance = abtKm > 0 ? `${parseFloat(abtKm.toFixed(2))} km` : (event.staffId ? '0.0 km' : '–');

      const resolvedServiceName = resolvePrimaryShiftServiceName(event);
      const serviceBgUrl = getServiceCardBackgroundImage(resolvedServiceName);
      const serviceVideoUrl = getServiceCardBackgroundVideo(resolvedServiceName);

      return (
        <div 
           className={`${containerClass} cursor-pointer w-full group relative`}
        >
          {/* Right-side realistic service background video with smooth left fadeout */}
          <div
            className="absolute inset-y-0 right-0 w-[56%] sm:w-[50%] lg:w-[46%] pointer-events-none z-0 overflow-hidden"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, rgba(0, 0, 0, 0.85) 52%, black 75%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, rgba(0, 0, 0, 0.85) 52%, black 75%)',
            }}
          >
            <video
              src={serviceVideoUrl}
              poster={serviceBgUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                e.currentTarget.muted = true;
                e.currentTarget.play().catch(() => {});
              }}
              style={{ objectPosition: serviceVideoUrl === showerRunningVideo ? 'center 32%' : 'center center' }}
              className="w-full h-full object-cover opacity-85 group-hover:opacity-95 transition-opacity duration-200"
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(24, 24, 27, 0.72) 0%, rgba(24, 24, 27, 0.22) 35%, rgba(24, 24, 27, 0.08) 100%)',
              }}
            />
          </div>

          {/* Shift Card Layout (3 Clean Rows + Vertical Status Ribbon at the End) */}
          <div className="relative z-10 flex items-stretch justify-between w-full min-w-0">
            {/* 3 Rows of Shift Info */}
            <div className="flex flex-col gap-1.5 sm:gap-2 flex-1 min-w-0 justify-center pr-2.5 sm:pr-3.5">
              {/* Row 1: Time on the first row with client name and funding type */}
              <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0 flex-nowrap overflow-hidden">
                {/* Time & Duration Pill */}
                <div className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700/60 text-zinc-200 font-mono text-[10px] sm:text-[11px] font-medium tracking-tight shadow-xs">
                  {event.isRespiteWrapper ? (
                    <span className="text-brand-teal/90 font-medium text-[9px] sm:text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-brand-teal/20">
                      Multi-day
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-zinc-300">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400 shrink-0" />
                        <span>{startText}</span>
                        <span className="text-zinc-500 font-bold">–</span>
                        <span>{endText}</span>
                      </div>
                      <span className="text-[9px] sm:text-[9.5px] font-sans font-bold text-brand-teal bg-brand-teal/15 px-1.5 py-0.2 rounded border border-brand-teal/30 tracking-tight shrink-0 ml-0.5">
                        {durationFormatted}
                      </span>
                    </>
                  )}
                </div>

                {/* Client Name & Funding Type */}
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                  <span className="font-extrabold text-zinc-100 text-sm sm:text-base leading-tight tracking-tight uppercase truncate" title={clientDisplayName}>
                    {clientDisplayName}
                  </span>
                  {fundingBadgeLabel && (
                    <span className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase border shrink-0 shadow-xs ${
                      fundingBadgeLabel === 'HCP'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    }`}>
                      {fundingBadgeLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Assigned staff name and service pill with animated icons */}
              <div className="flex items-center gap-2 sm:gap-2.5 w-full min-w-0">
                {/* Assigned Staff */}
                {event.isRespiteWrapper ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] sm:text-[10.5px] font-medium shrink-0 shadow-xs">
                    <Bed className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-400 shrink-0 animate-service-float" />
                    <span>STA / Respite</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[10px] sm:text-[10.5px] font-medium min-w-0 truncate shadow-xs max-w-[45%]" title={event.staffName || 'Unassigned'}>
                    <User className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate">{event.staffName || 'Unassigned'}</span>
                  </div>
                )}

                {/* Service Pill(s) with animated icons */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                  {event.servicesData && event.servicesData.length > 0 ? (
                    <>
                      {(() => {
                        const firstSd = event.servicesData[0];
                        const srv = servicesList.find((s: any) => String(s.id) === String(firstSd.serviceId));
                        let srvName = srv ? srv.name : (firstSd.serviceName || event.serviceName || 'Service');
                        if (!srvName || srvName === 'Unknown Service') {
                          if (String(firstSd.serviceId).toLowerCase().includes('orientation')) {
                            srvName = 'Orientation';
                          } else if (String(firstSd.serviceId).toLowerCase().includes('custom')) {
                            srvName = firstSd.serviceName || 'Custom Service';
                          }
                        }
                        const badgeInfo = getServiceBadge(srvName);
                        return (
                          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${badgeInfo.badgeStyle} text-[9.5px] sm:text-[10px] font-medium truncate min-w-0 shadow-xs`} title={srvName}>
                            {badgeInfo.icon}
                            <span className="truncate">{srvName}</span>
                          </div>
                        );
                      })()}
                      {event.servicesData.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-semibold border border-zinc-700/60 shrink-0" title={event.servicesData.slice(1).map((s: any) => s.serviceName).join(', ')}>
                          +{event.servicesData.length - 1}
                        </span>
                      )}
                    </>
                  ) : event.serviceName ? (
                    (() => {
                      const badgeInfo = getServiceBadge(event.serviceName);
                      return (
                        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md ${badgeInfo.badgeStyle} text-[9.5px] sm:text-[10px] font-medium truncate min-w-0 shadow-xs`} title={event.serviceName}>
                          {badgeInfo.icon}
                          <span className="truncate">{event.serviceName}</span>
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              </div>

              {/* Row 3: Travel in 3rd row */}
              {!event.isRespiteWrapper && (
                <div className="flex flex-col gap-1 w-full sm:w-fit max-w-full min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 w-full">
                    <div className="h-px flex-1 bg-zinc-700/70" />
                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-zinc-300">
                        Travel Allowance
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-brand-teal/15 border border-brand-teal/30 text-brand-teal text-[7.5px] sm:text-[8.5px] font-semibold tracking-tight leading-none shadow-xs">
                        Click Shift to Edit
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-zinc-700/70" />
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-3.5 flex-nowrap w-full min-w-0 overflow-x-auto no-scrollbar">
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-3.5 border-r border-zinc-700/70 shrink-0">
                      <span className="text-[8px] sm:text-[9.5px] font-semibold text-zinc-400 tracking-tight sm:tracking-wide whitespace-nowrap">
                        Between Shifts:
                      </span>
                      <div 
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/25 text-cyan-300 text-[8px] sm:text-[9.5px] font-medium shadow-xs whitespace-nowrap shrink-0"
                        title="Between Shifts travel distance"
                      >
                        <Car className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 shrink-0 animate-service-drive" />
                        <span>{formattedDistance}</span>
                      </div>
                      <div 
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-500/25 text-amber-300 text-[8px] sm:text-[9.5px] font-medium shadow-xs whitespace-nowrap shrink-0"
                        title="Between Shifts travel time"
                      >
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                        <span>{formattedTravelTime}</span>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0">
                      <span className="text-[8px] sm:text-[9.5px] font-semibold text-zinc-400 tracking-tight sm:tracking-wide whitespace-nowrap">
                        During Shift:
                      </span>
                      <div 
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-500/25 text-emerald-300 text-[8px] sm:text-[9.5px] font-medium shadow-xs whitespace-nowrap shrink-0"
                        title="During Shift travel distance"
                      >
                        <Car className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0 animate-service-drive" />
                        <span>{formattedAbtDistance}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shift status ribbon on the end of the card, spanning the entire height like a vertical ribbon */}
            <div 
              className={`self-stretch -my-2.5 -mr-2.5 sm:-my-3 sm:-mr-3 lg:-my-3.5 lg:-mr-3.5 flex flex-col items-center justify-center shrink-0 px-1 sm:px-1.5 lg:px-2 min-w-[30px] sm:min-w-[34px] lg:min-w-[38px] backdrop-blur-xs transition-colors select-none ${badgeClass}`}
            >
              <div className="flex flex-col items-center justify-center px-1 py-1.5 rounded-md bg-white/70 backdrop-blur-[2px] border border-white/60 text-black shadow-xs">
                {isInProgress && (
                  <span className="relative flex h-2 w-2 mb-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                  </span>
                )}
                <span 
                  className="uppercase text-center select-none text-[13.5px] sm:text-[14px] lg:text-[15px] leading-none font-bold text-black"
                  style={{ 
                    writingMode: 'vertical-rl',
                    fontFamily: '"Bebas Neue", "Oswald", "Cinzel", "Helvetica Neue", sans-serif',
                    letterSpacing: '0.14em',
                    textShadow: '0 1px 1px rgba(255, 255, 255, 0.85)',
                  }}
                >
                  {badgeLabel}
                </span>
              </div>
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

    const CustomToolbar = (toolbar: any) => {
      const goToBack = () => {
        toolbar.onNavigate('PREV');
      };
      const goToNext = () => {
        toolbar.onNavigate('NEXT');
      };
      const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
      };

      const viewNames = toolbar.views || [];

      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-4 mb-0.5 md:mb-2 px-0.5 md:px-0">
          {/* Action buttons: Today, Back, Next, Print Roster all on the SAME line on mobile */}
          <div className="flex items-center gap-1 w-full md:w-auto justify-between md:justify-start order-1">
            <div className="grid grid-cols-4 gap-1 w-full md:flex md:w-auto md:gap-1.5">
              <button
                type="button"
                onClick={goToCurrent}
                className="px-2 py-1 bg-brand-bg hover:bg-zinc-800 border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[10px] sm:text-[11px] font-medium rounded-md transition-colors text-center whitespace-nowrap shadow-xs"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goToBack}
                className="px-2 py-1 bg-brand-bg hover:bg-zinc-800 border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[10px] sm:text-[11px] font-medium rounded-md transition-colors text-center whitespace-nowrap shadow-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="px-2 py-1 bg-brand-bg hover:bg-zinc-800 border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[10px] sm:text-[11px] font-medium rounded-md transition-colors text-center whitespace-nowrap shadow-xs"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-1.5 py-1 bg-brand-bg hover:bg-zinc-800 border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[10px] sm:text-[11px] font-medium rounded-md transition-colors text-center flex items-center justify-center gap-1 whitespace-nowrap shadow-xs"
                title="Print Roster"
              >
                <Printer className="w-3 h-3 shrink-0" />
                <span className="truncate">Print Roster</span>
              </button>
            </div>
          </div>

          {/* Date Span Title (Start date - End date): brought up close, condensed */}
          <div className="text-center font-bold text-xs sm:text-sm md:text-base text-zinc-100 tracking-tight my-0.5 md:my-0 flex-1 order-2">
            {toolbar.label}
          </div>

          {/* Views switcher on desktop */}
          {Array.isArray(viewNames) && viewNames.length > 1 && (
            <div className="hidden md:flex items-center gap-1 order-3">
              {viewNames.map((name: string) => {
                const isActive = toolbar.view === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toolbar.onView(name)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-md capitalize transition-colors border ${
                      isActive
                        ? 'bg-brand-teal/20 text-brand-teal border-brand-teal/40'
                        : 'bg-brand-bg text-[#8B949E] hover:text-[#E6EDF3] border-border-subtle'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return {
      event: CustomEvent,
      toolbar: CustomToolbar,
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
  }, [multiSelectMode, holidays, servicesList, staffList, clientList, isMobileOrTablet]);

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

  const calendarContainerRef = React.useRef<HTMLDivElement>(null);

  const { scrollToTime, earliestTargetMinutes } = React.useMemo(() => {
    const startDayStr = settings?.invoicingStartDay || 'Monday';
    const weekStartsOn = DAYS_OF_WEEK.indexOf(startDayStr) !== -1 ? DAYS_OF_WEEK.indexOf(startDayStr) : 1;

    let rangeStart = new Date(date);
    let rangeEnd = new Date(date);

    if (activeView === Views.WEEK) {
      rangeStart = startOfWeek(date, { weekStartsOn: weekStartsOn as any });
      rangeEnd = endOfWeek(date, { weekStartsOn: weekStartsOn as any });
    } else if (activeView === Views.DAY) {
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(23, 59, 59, 999);
    }

    let minMinutes: number | null = null;
    for (const ev of mappedEvents) {
      if (ev.isRespiteWrapper || !ev.start || !ev.end) continue;
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      // Skip multi-day events that render in the all-day header row
      if (s.toDateString() !== e.toDateString() && e.getTime() - s.getTime() >= 24 * 60 * 60 * 1000) {
        continue;
      }
      if (s >= rangeStart && s <= rangeEnd) {
        const mins = s.getHours() * 60 + s.getMinutes();
        if (minMinutes === null || mins < minMinutes) {
          minMinutes = mins;
        }
      }
    }

    // Add a small 15-minute top breathing buffer above the first shift (defaulting to 7:45 AM if no shifts)
    const targetMins = minMinutes !== null ? Math.max(0, minMinutes - 15) : 7 * 60 + 45;
    const scrollDate = new Date(date);
    scrollDate.setHours(Math.floor(targetMins / 60), targetMins % 60, 0, 0);

    return {
      scrollToTime: scrollDate,
      earliestTargetMinutes: targetMins,
    };
  }, [mappedEvents, date, activeView, settings?.invoicingStartDay]);

  const computeTimeslotHeight = useCallback((): number => {
    if (typeof window === 'undefined') return 60;
    const screenW = window.screen?.width || window.innerWidth;
    const screenH = window.screen?.height || window.innerHeight;
    if (screenW > 1920 || (screenW >= 1920 && screenH > 1080)) {
      return 80;
    }
    if (screenW === 1920 && screenH >= 1080) {
      return 60;
    }
    return 40;
  }, []);

  const [timeslotHeight, setTimeslotHeight] = useState<number>(() => computeTimeslotHeight());

  useEffect(() => {
    const updateTimeslotHeight = () => {
      const nextHeight = computeTimeslotHeight();
      setTimeslotHeight(prev => (prev !== nextHeight ? nextHeight : prev));
      document.documentElement.style.setProperty('--rbc-timeslot-height', `${nextHeight}px`);
    };

    updateTimeslotHeight();
    window.addEventListener('resize', updateTimeslotHeight);
    return () => {
      window.removeEventListener('resize', updateTimeslotHeight);
    };
  }, [computeTimeslotHeight]);

  useEffect(() => {
    if (activeView !== Views.WEEK && activeView !== Views.DAY) return;

    const applyScroll = () => {
      const container = calendarContainerRef.current;
      if (!container) return;
      const timeContent = container.querySelector('.rbc-time-content') as HTMLElement | null;
      if (!timeContent || timeContent.scrollHeight <= timeContent.clientHeight) return;
      const targetScrollTop = Math.floor((earliestTargetMinutes / 1440) * timeContent.scrollHeight);
      timeContent.scrollTop = targetScrollTop;
    };

    const rafId = requestAnimationFrame(applyScroll);
    const timerId1 = setTimeout(applyScroll, 60);
    const timerId2 = setTimeout(applyScroll, 180);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId1);
      clearTimeout(timerId2);
    };
  }, [
    earliestTargetMinutes,
    date,
    activeView,
    coordinatorFilter,
    clientFilter,
    staffFilter,
    mappedEvents.length,
    timeslotHeight,
  ]);

  return (
    <div className={`flex flex-col space-y-0.5 md:space-y-1 p-1 md:p-2 text-zinc-100 ${isFullScreen ? 'fixed inset-0 z-[100] bg-brand-bg pb-20 md:pb-2' : 'h-full w-full bg-brand-navy border-0 md:border md:border-border-subtle rounded-xl'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-0.5 md:space-y-0 px-1 md:px-1 mt-0">
        <h2 className="text-base sm:text-lg font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0.5 md:mb-0 text-center md:text-left w-full md:w-auto">Roster Management</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          {user?.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2 p-1 bg-black/20 rounded-lg border border-white/5 w-full sm:w-auto">
                <select
                  value={coordinatorFilter}
                  onChange={(e) => {
                    const nextCoord = e.target.value;
                    setCoordinatorFilter(nextCoord);
                    if (nextCoord && selectedClientIds.length > 0) {
                      const remainingIds = selectedClientIds.filter(idStr => {
                        const selectedClient = clientList.find((c: any) => String(c.id) === idStr);
                        if (!selectedClient) return false;
                        return nextCoord === 'unassigned'
                          ? !selectedClient.care_coordinator_id
                          : String(selectedClient.care_coordinator_id || '') === String(nextCoord);
                      });
                      if (remainingIds.length !== selectedClientIds.length) {
                        setClientFilter(remainingIds.join(','));
                      }
                    }
                  }}
                  className="bg-brand-bg border border-border-subtle rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none focus:border-brand-blue w-full sm:w-auto transition-colors focus:ring-1 focus:ring-brand-blue"
                  title="Filter Roster by Care Coordinator Portfolio"
                >
                  <option value="">All Care Coordinators (All Clients)</option>
                  {(() => {
                    const myCoordinator = findMatchingCareCoordinator(coordinatorList, user);
                    return coordinatorList.map(cc => {
                      const clientCount = clientList.filter((c: any) => Number(c.care_coordinator_id) === Number(cc.id)).length;
                      const isMe = Boolean(myCoordinator && Number(cc.id) === Number(myCoordinator.id));
                      return (
                        <option key={cc.id} value={String(cc.id)}>
                          {isMe
                            ? `My Clients — ${cc.first_name} ${cc.last_name} (${clientCount})`
                            : `Coordinator: ${cc.first_name} ${cc.last_name} (${clientCount})`}
                        </option>
                      );
                    });
                  })()}
                  <option value="unassigned">
                    Unassigned Coordinator ({clientList.filter((c: any) => !c.care_coordinator_id).length})
                  </option>
                </select>

                {/* Multi-select Client Checkbox Dropdown */}
                <div ref={clientDropdownRef} className="relative w-full sm:w-auto">
                  {(() => {
                    const selectedClientNames = selectedClientIds
                      .map(id => {
                        const c = visibleClientList.find((cl: any) => String(cl.id) === id) || clientList.find((cl: any) => String(cl.id) === id);
                        return c ? `${c.first_name} ${c.last_name}` : null;
                      })
                      .filter(Boolean) as string[];

                    const buttonLabel =
                      selectedClientNames.length === 0
                        ? (coordinatorFilter ? `All Portfolio Clients (${visibleClientList.length})` : 'All Clients')
                        : selectedClientNames.length === 1
                          ? selectedClientNames[0]
                          : `${selectedClientNames[0]} +${selectedClientNames.length - 1}`;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsClientDropdownOpen(prev => !prev);
                            setIsStaffDropdownOpen(false);
                          }}
                          title={selectedClientNames.length > 0 ? selectedClientNames.join(', ') : 'Filter by one or more clients'}
                          className={`bg-brand-bg border rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none w-full sm:w-auto min-w-[155px] flex items-center justify-between gap-2 transition-colors ${
                            selectedClientIds.length > 0
                              ? 'border-brand-blue/70 ring-1 ring-brand-blue/30'
                              : 'border-border-subtle hover:border-brand-blue'
                          }`}
                        >
                          <span className="truncate text-left">{buttonLabel}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {selectedClientIds.length > 0 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClientFilter('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    setClientFilter('');
                                  }
                                }}
                                title="Clear client filter"
                                className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                          </span>
                        </button>

                        {isClientDropdownOpen && (
                          <div className="absolute left-0 mt-1 w-64 max-h-80 overflow-y-auto bg-[#0d1117] border border-border-subtle rounded-lg shadow-2xl z-[120] py-1 custom-scrollbar">
                            <button
                              type="button"
                              onClick={() => setClientFilter('')}
                              className="w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                    selectedClientIds.length === 0
                                      ? 'bg-brand-blue border-brand-blue text-white'
                                      : 'border-zinc-500 bg-transparent'
                                  }`}
                                >
                                  {selectedClientIds.length === 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span className={selectedClientIds.length === 0 ? 'font-semibold text-white' : 'text-zinc-300'}>
                                  {coordinatorFilter ? `All Portfolio Clients (${visibleClientList.length})` : 'All Clients'}
                                </span>
                              </div>
                              {selectedClientIds.length > 0 && (
                                <span className="text-[10px] font-semibold text-brand-teal hover:underline shrink-0 ml-2">
                                  Clear ({selectedClientIds.length})
                                </span>
                              )}
                            </button>

                            {visibleClientList.map((c: any) => {
                              const idStr = String(c.id);
                              const isChecked = selectedClientIds.includes(idStr);
                              const cName = `${c.first_name} ${c.last_name}`;
                              const dotColor = getClientColor(c.id, cName, clientColorMap);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleClientFilterId(idStr)}
                                  className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2.5 hover:bg-white/[0.06] transition-colors ${
                                    isChecked ? 'bg-brand-blue/10 text-white font-medium' : 'text-zinc-200'
                                  }`}
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                      isChecked
                                        ? 'bg-brand-blue border-brand-blue text-white'
                                        : 'border-zinc-500 bg-transparent'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: dotColor }}
                                  />
                                  <span className="truncate">{cName}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Multi-select Staff Checkbox Dropdown */}
                <div ref={staffDropdownRef} className="relative w-full sm:w-auto">
                  {(() => {
                    const selectedStaffNames = selectedStaffIds
                      .map(id => {
                        if (id === 'unassigned') return 'Unassigned Staff';
                        const s = staffList.find((st: any) => String(st.id) === id);
                        return s ? `${s.first_name} ${s.last_name}` : null;
                      })
                      .filter(Boolean) as string[];

                    const buttonLabel =
                      selectedStaffNames.length === 0
                        ? 'All Staff'
                        : selectedStaffNames.length === 1
                          ? selectedStaffNames[0]
                          : `${selectedStaffNames[0]} +${selectedStaffNames.length - 1}`;

                    const isUnassignedChecked = selectedStaffIds.includes('unassigned');

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsStaffDropdownOpen(prev => !prev);
                            setIsClientDropdownOpen(false);
                          }}
                          title={selectedStaffNames.length > 0 ? selectedStaffNames.join(', ') : 'Filter by one or more staff members'}
                          className={`bg-brand-bg border rounded-md px-3 py-1.5 text-[11px] text-[#E6EDF3] outline-none w-full sm:w-auto min-w-[145px] flex items-center justify-between gap-2 transition-colors ${
                            selectedStaffIds.length > 0
                              ? 'border-brand-blue/70 ring-1 ring-brand-blue/30'
                              : 'border-border-subtle hover:border-brand-blue'
                          }`}
                        >
                          <span className="truncate text-left">{buttonLabel}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {selectedStaffIds.length > 0 && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStaffFilter('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    setStaffFilter('');
                                  }
                                }}
                                title="Clear staff filter"
                                className="p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isStaffDropdownOpen ? 'rotate-180' : ''}`} />
                          </span>
                        </button>

                        {isStaffDropdownOpen && (
                          <div className="absolute left-0 mt-1 w-60 max-h-80 overflow-y-auto bg-[#0d1117] border border-border-subtle rounded-lg shadow-2xl z-[120] py-1 custom-scrollbar">
                            <button
                              type="button"
                              onClick={() => setStaffFilter('')}
                              className="w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between hover:bg-white/[0.06] transition-colors border-b border-white/[0.06]"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                    selectedStaffIds.length === 0
                                      ? 'bg-brand-blue border-brand-blue text-white'
                                      : 'border-zinc-500 bg-transparent'
                                  }`}
                                >
                                  {selectedStaffIds.length === 0 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span className={selectedStaffIds.length === 0 ? 'font-semibold text-white' : 'text-zinc-300'}>
                                  All Staff
                                </span>
                              </div>
                              {selectedStaffIds.length > 0 && (
                                <span className="text-[10px] font-semibold text-brand-teal hover:underline shrink-0 ml-2">
                                  Clear ({selectedStaffIds.length})
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleStaffFilterId('unassigned')}
                              className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2.5 hover:bg-white/[0.06] transition-colors border-b border-white/[0.06] ${
                                isUnassignedChecked ? 'bg-brand-blue/10 text-white font-medium' : 'text-pink-300'
                              }`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  isUnassignedChecked
                                    ? 'bg-brand-blue border-brand-blue text-white'
                                    : 'border-zinc-500 bg-transparent'
                                }`}
                              >
                                {isUnassignedChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                              <span className="truncate">Unassigned Staff</span>
                            </button>

                            {staffList.map((s: any) => {
                              const idStr = String(s.id);
                              const isChecked = selectedStaffIds.includes(idStr);
                              const sName = `${s.first_name} ${s.last_name}`;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => toggleStaffFilterId(idStr)}
                                  className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2.5 hover:bg-white/[0.06] transition-colors ${
                                    isChecked ? 'bg-brand-blue/10 text-white font-medium' : 'text-zinc-200'
                                  }`}
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                      isChecked
                                        ? 'bg-brand-blue border-brand-blue text-white'
                                        : 'border-zinc-500 bg-transparent'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span className="truncate">{sName}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
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
                      {activeView !== Views.AGENDA && (
                        <button 
                          onClick={() => setMultiSelectMode(true)}
                          className="flex items-center justify-center px-3 py-1.5 bg-brand-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[11px] font-medium rounded-md transition-colors w-full sm:w-auto"
                        >
                          Select Mode
                        </button>
                      )}
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
                    </div>
                  </>
                )}
              </div>
            </div>
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
      
      <div
        ref={calendarContainerRef}
        style={{ '--rbc-timeslot-height': `${timeslotHeight}px` } as React.CSSProperties}
        className="flex-1 bg-brand-bg p-0 md:p-1.5 rounded-lg md:border border-border-subtle overflow-y-auto min-h-0 scrollbar-hide mt-0.5"
      >
        {activeView !== Views.AGENDA ? (
          <DnDCalendar
            localizer={localizer}
            events={mappedEvents}
            view={activeView}
            date={date}
            scrollToTime={scrollToTime}
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
            scrollToTime={scrollToTime}
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
            selectable={false}
            
            resources={(activeView as View) === Views.DAY ? resources : undefined}
            resourceIdAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.id : undefined}
            resourceTitleAccessor={(activeView as View) === Views.DAY ? (r: any) => r?.title : undefined}
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

      <ShiftDetailsModal
        isOpen={isDetailsModalOpen && user?.role === 'ADMIN'}
        onClose={() => setIsDetailsModalOpen(false)}
        onSave={fetchData}
        shift={selectedShift}
        servicesList={servicesList}
        holidays={holidays}
        onCopy={(shift) => setCopiedShift(shift)}
        onEdit={(shift) => {
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
            notes: shift.notes,
            progressNote: shift.progressNote,
            abtKm: shift.abtKm,
            startOdometer: shift.startOdometer,
            endOdometer: shift.endOdometer,
            isHistorical: shift.isHistorical,
          });
          setIsShiftModalOpen(true);
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
