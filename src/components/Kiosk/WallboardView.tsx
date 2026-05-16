import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enAU } from 'date-fns/locale/en-AU';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../../context/AuthContext';
import ShiftDetailsModal from '../Roster/ShiftDetailsModal';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const locales = {
  'en-AU': enAU,
};

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
  const [date, setDate] = useState(new Date());
  
  const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [manualMode, setManualMode] = useState<boolean | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return parseInt(params.get('rotate') || '0', 10);
    }
    return 0;
  });

  const localizer = useMemo(() => {
    const startDayStr = settings?.invoicingStartDay || 'Monday';
    const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekStartsOn = DAYS_OF_WEEK.indexOf(startDayStr) !== -1 ? DAYS_OF_WEEK.indexOf(startDayStr) : 1;
    
    return dateFnsLocalizer({
      format,
      parse,
      startOfWeek: (d: any) => startOfWeek(d, { weekStartsOn: weekStartsOn as any }),
      getDay,
      locales,
    });
  }, [settings?.invoicingStartDay]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [shiftsRes, respiteRes] = await Promise.all([
        fetch('/api/shifts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/respite-bookings', { headers: { Authorization: `Bearer ${token}` } })
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSelectEvent = (event: ShiftEvent) => {
    if (event.isRespiteWrapper) {
      // For wallboard, maybe just ignore or show simplified detail. 
      // We'll only open individual child shifts.
      return;
    }
    setSelectedShift(event);
    setIsDetailsModalOpen(true);
  };

  const AgendaEvent = ({ event }: { event: ShiftEvent }) => {
    const isCompleted = event.status === 'COMPLETED' || !!event.actualEndTime;
    const isActuallyRunning = event.status === 'IN_PROGRESS' || (!!event.actualStartTime && !event.actualEndTime);
    const isInProgress = isActuallyRunning && !isCompleted;
    
    // Default to future/neutral
    let containerClass = "border-l-4 border-zinc-500 opacity-90 transition-all h-full flex flex-col justify-center px-4 py-3";
    
    if (isCompleted) {
      containerClass = "opacity-50 border-l-4 border-blue-500 transition-all h-full flex flex-col justify-center px-4 py-3";
    } else if (isInProgress) {
      containerClass = "border-l-4 border-emerald-500 bg-emerald-950/20 transition-all pulse-border h-full flex flex-col justify-center px-4 py-3";
    }

    return (
      <div className={`w-full hover:brightness-110 cursor-pointer ${containerClass}`}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`font-mono text-lg md:text-xl lg:text-2xl ${isInProgress ? 'text-emerald-400 font-bold' : 'text-brand-teal font-medium'}`}>
            {event.staffName || 'Unassigned'}
          </span>
          {isInProgress && (
            <span className="flex items-center ml-2">
              <span className="flex h-2 w-2 relative mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full uppercase whitespace-nowrap">
                In Progress
              </span>
            </span>
          )}
          {isCompleted && (
            <span className="text-xs bg-blue-500/20 text-blue-300 font-medium px-2 py-0.5 rounded-full ml-2 uppercase whitespace-nowrap">
              Completed
            </span>
          )}
          {!isInProgress && !isCompleted && event.status !== 'DRAFT' && (
            <span className="text-xs bg-zinc-500/20 text-zinc-300 font-medium px-2 py-0.5 rounded-full ml-2 uppercase whitespace-nowrap">
              Scheduled
            </span>
          )}
          {event.status === 'DRAFT' && (
            <span className="text-xs bg-orange-500/20 text-orange-300 font-medium px-2 py-0.5 rounded-full ml-2 uppercase whitespace-nowrap">
              Draft
            </span>
          )}
        </div>
        
        <div className={`font-sans font-bold ${isInProgress ? 'text-emerald-50' : 'text-[#E6EDF3]'} leading-tight mb-1 text-xl md:text-2xl lg:text-3xl`}>
          {event.clientName || 'Unknown Client'}
        </div>
        
        <div className={`font-sans ${isInProgress ? 'text-emerald-200' : 'text-[#8B949E]'} text-sm md:text-md lg:text-lg`}>
          {event.serviceName || (event.isRespiteWrapper ? 'STA / Respite' : 'Support Worker')} 
        </div>
      </div>
    );
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-100 relative" style={{ maxWidth: '100vw', maxHeight: '100vh' }}>
      <div style={rotatedContainerStyles} className="flex flex-col relative transition-transform duration-500">
      <style>{`
        .rbc-calendar {
          background-color: transparent;
        }
        .rbc-toolbar {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #27272a; /* zinc-800 */
        }
        .rbc-toolbar button {
          color: #E6EDF3;
          border-color: #3f3f46; /* zinc-700 */
          background-color: #18181b; /* zinc-900 */
        }
        .rbc-toolbar button:hover, .rbc-toolbar button:active {
          background-color: #27272a;
          color: white;
        }
        .rbc-toolbar button.rbc-active {
          background-color: rgb(20, 184, 166) !important; /* brand-teal */
          color: white !important;
        }
        .rbc-agenda-view {
          border: none !important;
          color: #E6EDF3;
        }
        .rbc-agenda-view table.rbc-agenda-table {
          border: none;
        }
        .rbc-agenda-table thead > tr > th {
          border-bottom: 1px solid #27272a;
          padding: 1rem;
          text-align: left;
          color: #a1a1aa; /* zinc-400 */
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .rbc-agenda-table tbody > tr > td {
          border-top: 1px solid #27272a;
          vertical-align: middle;
        }
        .rbc-agenda-date-cell {
          padding: 1rem;
          font-weight: 600;
          font-size: 1.1rem;
          color: #d4d4d8; /* zinc-300 */
        }
        .rbc-agenda-time-cell {
          padding: 1rem;
          font-family: monospace;
          color: #a1a1aa;
          font-size: 1.1rem;
        }
        .rbc-agenda-event-cell {
          padding: 0 !important;
        }
        .pulse-border {
          animation: borderPulse 2s infinite;
        }
        @keyframes borderPulse {
          0% { border-left-color: rgb(16, 185, 129); }
          50% { border-left-color: rgb(52, 211, 153); }
          100% { border-left-color: rgb(16, 185, 129); }
        }

        /* Layout Overrides */
        .rbc-agenda-view table.rbc-agenda-table {
          border-spacing: 0 1rem;
          border-collapse: separate;
          border: none;
        }
        .rbc-agenda-table {
          table-layout: fixed;
          width: 100%;
        }
        .rbc-agenda-table > thead > tr > th.rbc-agenda-date-cell {
          width: 25%;
        }
        .rbc-agenda-table > thead > tr > th.rbc-agenda-time-cell {
          width: 20%;
        }
        .rbc-agenda-table > thead > tr > th {
          border-bottom: 2px solid #3f3f46;
          padding: 0.5rem 1rem;
          color: #8B949E;
          font-weight: 500;
          text-align: left;
        }
        .rbc-agenda-table > tbody > tr {
          background-color: #18181b;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
          transition: transform 0.2s;
        }
        .rbc-agenda-table > tbody > tr:hover {
          transform: translateY(-2px);
        }
        .rbc-agenda-table > tbody > tr > td {
          border: none;
          padding: 1rem;
          vertical-align: middle;
        }
        .rbc-agenda-date-cell {
          font-weight: 600;
          color: #E6EDF3;
          border-top-left-radius: 0.75rem;
          border-bottom-left-radius: 0.75rem;
          border-right: 1px solid #27272a;
        }
        .rbc-agenda-time-cell {
          font-size: 1.15rem;
          color: #d4d4d8;
          border-right: 1px solid #27272a;
          white-space: nowrap;
        }
        .rbc-agenda-event-cell {
          padding: 0 !important;
          border-top-right-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          overflow: hidden;
        }
        .rbc-agenda-event-cell > div { 
           width: 100%;
           height: 100%;
        }
      `}</style>
      
      <div className="h-full w-full flex flex-col p-4 md:p-8 pt-0 overflow-auto">
        <div style={{ zoom: zoomLevel } as any} className="flex-1 w-full h-full min-h-full">
          <Calendar
            localizer={localizer}
            events={events}
            date={date}
            onNavigate={(newDate) => setDate(newDate)}
            defaultView={Views.AGENDA}
            view={Views.AGENDA}
            views={[Views.AGENDA]}
            culture="en-AU"
            formats={{
              agendaDateFormat: 'dd-MM-yyyy',
              agendaHeaderFormat: ({ start, end }: any, culture: any, localizer: any) => 
                `${localizer.format(start, 'dd-MM-yyyy', culture)} – ${localizer.format(end, 'dd-MM-yyyy', culture)}`
            }}
            onSelectEvent={handleSelectEvent}
            components={{
              agenda: {
                event: AgendaEvent
              }
            }}
            className="flex-1 rounded-xl bg-zinc-950 overflow-hidden h-full min-h-[600px]"
            length={7} // Show a full week
          />
        </div>
      </div>

      <div className="fixed bottom-6 right-6 opacity-30 hover:opacity-100 transition-opacity flex flex-col items-end gap-2 z-50">
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
          shiftId={selectedShift.id}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedShift(null);
          }}
          onUpdate={fetchData}
        />
      )}
      </div>
    </div>
  );
}
