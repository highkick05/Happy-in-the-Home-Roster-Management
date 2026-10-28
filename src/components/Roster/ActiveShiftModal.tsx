import React, { useState, useEffect, useRef } from 'react';
import { X, Play, StopCircle, MapPin, Plus, Trash2, Info, Camera, RotateCcw, CheckSquare, Car, ArrowDown, Edit } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShiftEvent } from './types';

interface ActiveShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  shift: ShiftEvent | null;
  servicesList?: any[];
  clientList?: any[];
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('pending_sync_shift_'));
    const token = localStorage.getItem('token');
    if (!token) return;

    for (const key of keys) {
      const shiftId = key.replace('pending_sync_shift_', '');
      try {
        const payloadStr = localStorage.getItem(key);
        if (!payloadStr) continue;
        const payload = JSON.parse(payloadStr);

        const res = await fetch(`/api/shifts/${shiftId}/complete`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          localStorage.removeItem(key);
          localStorage.removeItem(`shift_progress_${shiftId}`);
          
          // Dispatch custom event to notify active UI components
          window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: { shiftId } }));
        }
      } catch (e) {
        console.error('Background sync failed for shift', shiftId, e);
      }
    }
  });
}

export default function ActiveShiftModal({ isOpen, onClose, onSave, shift, servicesList = [], clientList = [] }: ActiveShiftModalProps) {
  const { token, settings } = useAuth();
  const maxEarlyMins = settings?.max_early_clockin_minutes !== undefined ? parseInt(settings.max_early_clockin_minutes as any) : 180;
  
  const [completeMode, setCompleteMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [isIncident, setIsIncident] = useState(false);
  const [didTransport, setDidTransport] = useState(false);
  const [waypoints, setWaypoints] = useState<{name: string, placeId?: string, coords?: number[] | string}[]>([]);
  const [returnedHome, setReturnedHome] = useState(false);
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  const [hasModifiedTransport, setHasModifiedTransport] = useState(false);
  const routeLogDetailsRef = useRef<HTMLDetailsElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [odometerReading, setOdometerReading] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState('');

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [clientGaveNotice, setClientGaveNotice] = useState(true);
  const [nowDate, setNowDate] = useState(new Date());

  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setOdometerPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const saveToLocal = (currNotes: string) => {
    if (!shift) return;
    const storageKey = `shift_progress_${shift.id}`;
    localStorage.setItem(storageKey, JSON.stringify({
      notes: currNotes
    }));
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    saveToLocal(val);
  };

  useEffect(() => {
    if (!isOpen || !shift) return;
    const interval = setInterval(() => setNowDate(new Date()), 1000);
    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, [isOpen, shift]);

  useEffect(() => {
    if (isOpen && shift) {
      if (shift.status === 'PENDING_SYNC') {
         onClose();
         return;
      }
      try {
         const pendingStr = localStorage.getItem('pending_shifts') || '[]';
         const pendingArr = JSON.parse(pendingStr);
         const isCurrentlySyncing = pendingArr.some((pending: any) => pending.shiftId === shift.id);
         if (isCurrentlySyncing && shift.status !== 'COMPLETED') {
            onClose();
            return;
         }
      } catch(e) {}

      if (shift.status === 'COMPLETED') {
         setCompleteMode(true);
         setIsEditingTransport(false);
      } else {
         setCompleteMode(false);
         setIsEditingTransport(true);
      }
      setHasModifiedTransport(false);
      
      setShowCancelPrompt(false);
      setCancelReason('');
      setClientGaveNotice(true);
      setOdometerReading('');
      setOdometerPhoto('');

      // Pre-populate saved ABT destinations if shift is already COMPLETED
      let restoredWaypoints: {name: string, placeId?: string, coords?: number[] | string}[] = [];
      let restoredReturnedHome = false;
      let restoredDidTransport = false;

      if (shift.status === 'COMPLETED' && shift.transportRouteLog) {
        try {
          const parsedLog = JSON.parse(shift.transportRouteLog);
          const abt = parsedLog?.abt;
          if (abt && (Number(shift.abtKm) > 0 || Number(abt.distance) > 0)) {
            const legs: any[] = Array.isArray(abt.legs) ? abt.legs : [];
            const rawWaypoints: any[] = Array.isArray(abt.waypoints) ? abt.waypoints : [];
            if (legs.length > 0) {
              const targetStops = legs.map((l: any) => (l.description || '').split(' → ')[1]?.trim()).filter(Boolean);
              const lastStop = targetStops[targetStops.length - 1] || '';
              if (lastStop.startsWith('Client Home')) {
                restoredReturnedHome = true;
              }
              const communityStops = restoredReturnedHome ? targetStops.slice(0, -1) : targetStops;
              restoredWaypoints = communityStops.map((stopStr: string, idx: number) => {
                const withoutCoords = stopStr.replace(/\s*\[[\d.,\s-]+\]\s*$/, '').trim();
                let cleanName = withoutCoords;
                if (withoutCoords.startsWith('Community (') && withoutCoords.endsWith(')')) {
                  cleanName = withoutCoords.slice('Community ('.length, -1).trim();
                }
                const savedWp = rawWaypoints[idx + 1];
                if (savedWp && typeof savedWp === 'object' && !Array.isArray(savedWp) && savedWp.placeId) {
                  return { name: cleanName, placeId: savedWp.placeId };
                } else if (Array.isArray(savedWp)) {
                  return { name: cleanName, coords: savedWp };
                }
                return { name: cleanName };
              });
              if (restoredWaypoints.length > 0) {
                restoredDidTransport = true;
              }
            }
          }
        } catch (e) {}
      }

      setDidTransport(restoredDidTransport);
      setReturnedHome(restoredReturnedHome);
      setWaypoints(restoredWaypoints);
      
      const storageKey = `shift_progress_${shift.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotes(parsed.notes || '');
        } catch(e) {}
      } else {
        setNotes(shift.notes || '');
      }
      
    }
  }, [isOpen, shift]);

  useEffect(() => {
    if (!isOpen || !shift || !token) return;
    const fetchVehicles = async () => {
      try {
        const res = await fetch('/api/vehicles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setVehicles(data);

          const existingVehicleId = (shift as any).vehicle_id || (shift as any).vehicleId;
          if (existingVehicleId && data.some((v: any) => String(v.id) === String(existingVehicleId))) {
            setSelectedVehicleId(String(existingVehicleId));
          } else {
            const privateVehicles = data.filter((v: any) => v.ownership === 'PRIVATE');
            const companyVehicles = data.filter((v: any) => v.ownership === 'COMPANY');
            const defaultPrivate = privateVehicles.find((v: any) => v.is_primary) || privateVehicles[0];
            if (defaultPrivate) {
              setSelectedVehicleId(String(defaultPrivate.id));
            } else if (companyVehicles.length > 0) {
              setSelectedVehicleId(String(companyVehicles[0].id));
            } else if (data.length > 0) {
              setSelectedVehicleId(String(data[0].id));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      }
    };
    fetchVehicles();
  }, [isOpen, shift?.id, (shift as any)?.vehicle_id, (shift as any)?.vehicleId, token]);


  const getShortDateBadge = (dateString: Date) => {
    const d = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) {
       return "Today";
    } else if (d.toDateString() === tomorrow.toDateString()) {
       return "Tomorrow";
    } else {
       return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  if (!isOpen || !shift) return null;

  const handleStartShift = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          actual_start_time: new Date().toISOString(),
          odometer_start_reading: odometerReading ? Math.round(Number(odometerReading)).toString() : '',
          odometer_start_photo: odometerPhoto,
          vehicle_id: selectedVehicleId ? Number(selectedVehicleId) : null
        })
      });
      if (res.ok) {
        onSave(); // Refresh data to change state to IN_PROGRESS
      } else {
        alert('Failed to start shift');
      }
    } catch (e) {
      console.error(e);
      alert('Error starting shift');
    } finally {
      setLoading(false);
    }
  };

  const handleUndoStartShift = async () => {
    if (!confirm("Are you sure you want to undo starting this shift? This will set it back to PUBLISHED.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/undo-start`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });
      if (res.ok) {
        onSave(); // Refresh data back to PUBLISHED
      } else {
        alert('Failed to undo start shift');
      }
    } catch (e) {
      console.error(e);
      alert('Error undoing start shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShift = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: cancelReason, clientGaveNotice })
      });
      if (res.ok) {
        onSave();
        onClose();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
      } else {
        alert('Failed to cancel shift');
      }
    } catch (e) {
      console.error(e);
      alert('Error cancelling shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteShift = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const resolvedWaypoints = didTransport 
      ? ['CLIENT_HOME', ...waypoints.map(wp => ({ placeId: wp.placeId, coords: wp.coords, address: wp.name })), ...(returnedHome ? ['CLIENT_HOME'] : [])] 
      : null;

    const shouldPreserveAbt = shift.status === 'COMPLETED' && !isEditingTransport && !hasModifiedTransport;

    if (!shouldPreserveAbt && didTransport && waypoints.length === 0) {
       alert("Please add at least 1 destination if you transported the client.");
       return;
    }

    setLoading(true);
    let offlineHandled = false;
    
    const actualStart = shift.actualStartTime ? new Date(shift.actualStartTime) : new Date(shift.start);
    const actualFinish = new Date(); // Right now

    const payload = {
      actual_start_time: actualStart.toISOString(),
      actual_finish_time: actualFinish.toISOString(),
      notes: notes,
      abtCoordinates: resolvedWaypoints,
      preserveAbt: shouldPreserveAbt,
      odometer_end_reading: odometerReading ? Math.round(Number(odometerReading)).toString() : '',
      odometer_end_photo: odometerPhoto,
      is_incident: isIncident
    };

    try {
      const res = await fetch(`/api/shifts/${shift.id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        localStorage.removeItem(`shift_progress_${shift.id}`);
        onSave();
        onClose();
      } else {
        alert('Failed to complete shift');
      }
    } catch (e: any) {
      console.error(e);
      // Check for network error ("Failed to fetch" is commonly thrown by fetch on network failure)
      if (!navigator.onLine || (e instanceof TypeError && e.message.includes('fetch')) || (e.message && e.message.includes('Failed to fetch'))) {
         offlineHandled = true;
         setLoading(false);
         const syncPayload = { ...payload, shiftId: shift.id };
         const pendingStr = localStorage.getItem('pending_shifts');
         const pendingArr = pendingStr ? JSON.parse(pendingStr) : [];
         pendingArr.push(syncPayload);
         localStorage.setItem('pending_shifts', JSON.stringify(pendingArr));
         console.log("Offline payload locked into localStorage:", syncPayload);
         alert("Offline: Your notes are saved locally on your device. Shift will sync automatically when network is restored.");
         window.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: { shiftId: shift.id } })); // trigger an immediate ui refresh for badge
         onClose();
         return;
      } else {
         alert('Error completing shift');
      }
    } finally {
      if (!offlineHandled) {
        setLoading(false);
      }
    }
  };

  const searchLocation = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      setSearchResults(data.suggestions || []);
    } catch (e) {
      console.error('Places Autocomplete error', e);
    }
  };

  const addWaypoint = (suggestion: any) => {
    const text = suggestion.placePrediction.text.text;
    const placeId = suggestion.placePrediction.placeId;
    setWaypoints([...waypoints, { name: text, placeId }]);
    setHasModifiedTransport(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatLocationString = (str: string) => {
    if (!str) return null;
    const parsed = str.split(/(\[[\d.,\s-]+\])/);
    
    return (
      <span className="whitespace-pre-wrap flex-1 text-sm leading-relaxed">
        {parsed.map((part, idx) => {
          if (part.startsWith('[') && part.endsWith(']')) {
            return (
              <span key={idx} className="text-[11px] text-zinc-500 ml-1 font-mono opacity-50 block sm:inline mt-1">
                {part}
              </span>
            );
          }
          if (part.includes('(') && part.includes(')')) {
            const openIdx = part.indexOf('(');
            const closeIdx = part.lastIndexOf(')');
            if (openIdx !== -1 && closeIdx !== -1 && openIdx < closeIdx) {
              const prefix = part.slice(0, openIdx).trim();
              const address = part.slice(openIdx + 1, closeIdx);
              const suffix = part.slice(closeIdx + 1);
              
              return (
                <span key={idx} className="flex flex-col">
                  {prefix && <span className="font-semibold uppercase text-white text-sm md:text-base tracking-tight">{prefix}</span>}
                  <span className="text-zinc-400 text-xs mt-0.5 opacity-80">{address}{suffix}</span>
                </span>
              );
            }
          }
          return <span key={idx} className="text-zinc-300">{part}</span>;
        })}
      </span>
    );
  };

  const renderFormattedDescription = (desc: string, distance?: number | null, calculatedAt?: string, durationMins?: number | null) => {
    if (!desc) return null;

    if (desc.includes(' → ')) {
      const parts = desc.split('\n');
      const title = parts[0]?.trim();
      const locations = parts[parts.length - 1]?.split(' → ') || [];
      
      return (
        <div className="flex flex-col mt-1">
          {title && <span className="text-xs font-bold text-brand-green/80 mb-4 uppercase tracking-wider">{title}</span>}
          <div className="flex flex-col relative before:absolute before:inset-y-[12px] before:left-[11px] before:w-[2px] before:bg-zinc-800/80">
            {locations.map((loc, i) => {
              const isStart = i === 0;
              const isEnd = i === locations.length - 1;
              const label = isStart ? 'START' : isEnd ? 'END' : 'WAYPOINT';

              return (
                <div key={i} className="flex gap-4 items-start relative z-10 mb-5 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-[24px] h-[24px] rounded-full bg-[#121214] border-2 border-brand-green/50 flex items-center justify-center mt-0.5 shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-brand-green" />
                    </div>
                    {!isEnd && (
                      <div className="text-zinc-600 mt-2 bg-[#121214]/50 z-10 rounded-full flex items-center justify-center w-5 h-5">
                        <ArrowDown className="w-3.5 h-3.5 text-zinc-500" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                    <span className="text-[10px] uppercase text-brand-green/70 font-bold tracking-wider leading-none mb-1">{label}</span>
                    {formatLocationString(loc)}
                  </div>
                </div>
              );
            })}
          </div>
          {distance != null && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/[0.08]/60 pl-8">
              <div className="flex gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-lg border border-brand-green/30 shadow-sm">
                  {distance.toFixed(2)} km
                </span>
                {durationMins != null && durationMins > 0 && (
                   <span className="text-xs sm:text-sm font-black text-zinc-300 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">
                     {durationMins.toFixed(0)} mins
                   </span>
                )}
              </div>
              {calculatedAt && (
                <span className="text-[10px] text-zinc-600 font-medium">Calculated: {new Date(calculatedAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      );
    }
    
    if (desc.includes(' to ')) {
      const [from, to] = desc.split(' to ');
      const isConsecutive = from.includes('50% Apportionment') && to.toLowerCase().includes('next client');
      const isReturn = to.toLowerCase().includes('staff home');

      return (
        <div className="flex flex-col gap-4 pl-1 mt-1 relative before:absolute before:inset-y-[12px] before:left-[11px] before:w-[2px] before:bg-zinc-800/80">
          <div className="flex gap-4 items-start relative z-10">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-[24px] h-[24px] rounded-full bg-[#121214] border-2 border-brand-teal/50 flex items-center justify-center mt-0.5 shrink-0 z-10">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
              <div className="text-zinc-600 mt-2 bg-[#121214]/50 z-10 rounded-full flex items-center justify-center w-5 h-5">
                <ArrowDown className="w-3.5 h-3.5 text-zinc-500" strokeWidth={3} />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 pt-0.5">
              <span className="text-[10px] uppercase text-brand-teal/70 font-bold tracking-wider leading-none mb-1">From</span>
              {formatLocationString(from)}
            </div>
          </div>
          <div className="flex gap-4 items-start relative z-10">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-[24px] h-[24px] rounded-full bg-[#121214] border-2 border-brand-teal/50 flex items-center justify-center mt-0.5 shrink-0 z-10">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 pt-0.5">
               {isConsecutive ? (
                 <>
                   <span className="text-[10px] uppercase text-brand-teal/70 font-bold tracking-wider leading-none mb-1 text-left block">
                     TO: NEXT CLIENT HOME
                   </span>
                   {formatLocationString(to.replace(/Next Client/i, 'Client').trim())}
                   <span className="mt-2 inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/20 w-max">
                     (Consecutive Shift - Distance Split 50%)
                   </span>
                 </>
               ) : isReturn ? (
                 <>
                   <span className="text-[10px] uppercase text-brand-teal/70 font-bold tracking-wider leading-none mb-1 text-left block">
                     TO: STAFF HOME (Return trip)
                   </span>
                   {formatLocationString(to.replace(/\(Return trip\)/i, '').trim())}
                 </>
               ) : (
                 <>
                   <span className="text-[10px] uppercase text-brand-teal/70 font-bold tracking-wider leading-none mb-1 text-left block">
                     To
                   </span>
                   {formatLocationString(to)}
                 </>
               )}
            </div>
          </div>
          {distance != null && (
            <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/[0.08]/60 pl-8">
              <div className="flex gap-2.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-brand-teal bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-brand-teal/30 shadow-sm">
                  {distance.toFixed(2)} km
                </span>
                {durationMins != null && durationMins > 0 && (
                   <span className="text-xs sm:text-sm font-black text-zinc-300 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">
                     {durationMins.toFixed(0)} mins
                   </span>
                )}
              </div>
              {calculatedAt && (
                <span className="text-[10px] text-zinc-600 font-medium">Calculated: {new Date(calculatedAt).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {formatLocationString(desc)}
        {distance != null && distance > 0 && (
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.08]/60">
            <div className="flex gap-2">
              <span className="text-xs font-black text-brand-teal bg-indigo-500/10 px-3 py-1 rounded-md border border-brand-teal/30">
                {distance.toFixed(2)} km
              </span>
              {durationMins != null && durationMins > 0 && (
                <span className="text-xs font-black text-zinc-300 bg-zinc-800/50 px-3 py-1 rounded-md border border-white/10">
                  {durationMins.toFixed(0)} mins
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const isNDIS = shift.fundingType === 'NDIS' || shift.fundingType === 'HOME_CARE' || shift.fundingType === 'Home Care' || shift.fundingType === 'HCP' || !shift.fundingType;
  const isHCP = shift.fundingType === 'HOME_CARE' || shift.fundingType === 'Home Care' || shift.fundingType === 'HCP';
  const clientData = clientList.find((c: any) => String(c.id) === String(shift.clientId));
  const clientAddress = clientData?.address;

  const startDiffMs = shift.start.getTime() - nowDate.getTime();
  const endDiffMs = shift.end.getTime() - nowDate.getTime();
  
  const isLocked = ((shift.status === 'PUBLISHED' && startDiffMs <= maxEarlyMins * 60 * 1000 && startDiffMs > -24 * 60 * 60 * 1000) ||
                   shift.status === 'IN_PROGRESS');

  const isEarlyStart = startDiffMs > 0 && startDiffMs <= maxEarlyMins * 60 * 1000;
  const canStart = startDiffMs <= maxEarlyMins * 60 * 1000;
  const canComplete = endDiffMs <= 0;

  const formatCountdown = (diffMs: number) => {
    if (diffMs <= 0) return '00:00:00';
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-2 md:p-4" onClick={handleBackgroundClick}>
      <div 
        className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-4 w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl text-zinc-100 flex flex-col max-h-[95vh] overflow-hidden shadow-2xl transition-all" 
      >
                {/* Header */}
        <div className="mb-3 shrink-0 space-y-2">
          {/* Top Line: Name, Date, Time, Map, X */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full border-b border-zinc-700/60 pb-2.5 flex-wrap sm:flex-nowrap">
            <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight truncate max-w-[35%] sm:max-w-xs shrink-0" title={shift.clientName}>
              {shift.clientName}
            </h2>
            
            <div className="bg-brand-teal/20 border border-brand-teal/40 text-brand-teal px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-sm shrink-0">
              {getShortDateBadge(shift.start)}
            </div>
            
            <div className="bg-white/5 border border-white/10 text-zinc-200 px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold whitespace-nowrap shadow-sm shrink-0">
              {new Date(shift.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(shift.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
              {clientAddress && (
                 <a
                   href={`https://maps.google.com/?q=${encodeURIComponent(clientAddress)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-brand-blue/15 text-blue-300 hover:bg-brand-blue/30 border border-brand-blue/30 transition-all shadow-sm"
                   title="View Client Address on Google Maps"
                 >
                   <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                   <span className="hidden sm:inline">Map</span>
                 </a>
               )}
               <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04]">
                 <X className="w-5 h-5 md:w-6 md:h-6" />
               </button>
            </div>
          </div>

          {/* Line 2: Assigned Tasks */}
          <div className="flex flex-row items-start sm:items-center gap-1.5 sm:gap-2 pt-1 w-full text-left">
            <span className="text-xs sm:text-sm text-zinc-400 font-bold uppercase tracking-wider shrink-0 mt-0.5 sm:mt-0">Assigned Tasks:</span>
            {shift.servicesData && shift.servicesData.length > 0 ? (
               <div className="flex-1 min-w-0 text-left">
                  {shift.servicesData.slice(0, 1).map((s: any, idx: number) => {
                     const srv = servicesList.find((srv: any) => String(srv.id) === String(s.serviceId));
                     const srvName = srv ? srv.name : (s.serviceName || s.serviceCode || shift.serviceName);
                     return (
                        <span key={idx} className="block text-sm md:text-base font-semibold text-brand-teal line-clamp-2 leading-tight" title={srvName}>
                            {srvName}
                        </span>
                     );
                  })}
               </div>
            ) : shift.serviceName ? (
               <span className="block text-sm md:text-base font-semibold text-brand-teal line-clamp-2 flex-1 min-w-0 leading-tight text-left" title={shift.serviceName}>
                   {shift.serviceName}
               </span>
            ) : (
               <span className="block text-sm md:text-base font-semibold text-zinc-500 italic flex-1 min-w-0 text-left">
                   Not specified
               </span>
            )}
          </div>
          
          {isEarlyStart && !isLocked && (
             <div className="pt-1 text-left">
               <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30">
                  {Math.floor(startDiffMs / 60000)} minutes until shift
               </span>
             </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 pr-1 sm:pr-2 pb-2">
          {showCancelPrompt ? (
            <div className="space-y-6 outline-none animate-in opacity-100">
              <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold border-b border-red-500/30 text-red-400 pb-3 mb-4">Cancel Shift</h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200 leading-relaxed shadow-sm">
                    You are about to cancel this shift. This action cannot be undone. Please provide a brief reason.
                  </div>
                </div>
                
                <div className="space-y-4 flex flex-col">
                  <div>
                    <div className="mb-5 bg-zinc-800/40 p-3 sm:p-4 rounded-xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <span className="text-sm md:text-base font-medium text-zinc-200">
                      Did the client give {settings?.cancellationNoticePeriod || '24'} hours' notice?
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => setClientGaveNotice(true)}
                        className={`flex-1 sm:flex-none py-2 px-6 text-sm font-bold rounded-lg transition-all ${clientGaveNotice ? 'bg-brand-teal text-zinc-950 shadow-md ring-2 ring-brand-teal/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setClientGaveNotice(false)}
                        className={`flex-1 sm:flex-none py-2 px-6 text-sm font-bold rounded-lg transition-all ${!clientGaveNotice ? 'bg-red-500 text-white shadow-md ring-2 ring-red-500/50' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                  <label className="block text-sm md:text-base font-semibold text-zinc-300 mb-2">Reason for Cancellation</label>
                    <textarea 
                      rows={4} 
                      className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl p-4 text-sm md:text-base text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-inner"
                      placeholder="E.g., Client sick, Car broke down"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : !completeMode ? (
            <div className="flex flex-col gap-4">
              {shift.status === 'PUBLISHED' && (
                <div className="flex flex-col gap-2">
                  <div className="w-full py-5 bg-zinc-800/90 border-2 border-zinc-700 shadow-md rounded-xl font-bold flex flex-col items-center justify-center text-zinc-100">
                    {canStart && <span className="text-brand-green text-2xl md:text-3xl font-extrabold animate-pulse tracking-wide drop-shadow-md mb-2">Ready to Start</span>}
                    {startDiffMs > 0 ? (
                       <span className="text-zinc-300 text-sm md:text-base font-medium">Starts in: <span className="text-white font-bold">{formatCountdown(startDiffMs)}</span></span>
                    ) : (
                       <span className="text-zinc-300 text-sm md:text-base font-medium">Started <span className="text-white font-bold">{formatCountdown(Math.abs(startDiffMs))}</span> ago</span>
                    )}
                  </div>
                </div>
              )}

              {shift.status === 'IN_PROGRESS' && (
                <div className="flex flex-col gap-2">
                  <div className="w-full py-5 bg-zinc-800/90 border-2 border-zinc-700 shadow-md rounded-xl font-bold flex flex-col items-center justify-center text-zinc-100">
                    {canComplete && <span className="text-brand-green text-xl md:text-2xl animate-pulse tracking-wide drop-shadow-md mb-1.5">Ready to Complete</span>}
                    {endDiffMs > 0 ? (
                       <span className="text-zinc-300 text-sm md:text-base font-medium">Ends in: <span className="text-white">{formatCountdown(endDiffMs)}</span></span>
                    ) : (
                       <span className="text-amber-400 text-sm md:text-base font-medium">Overdue by <span className="text-amber-300">{formatCountdown(Math.abs(endDiffMs))}</span></span>
                    )}
                  </div>
                  <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-3.5 shadow-sm">
                    <span className="text-zinc-300 font-bold block mb-2 text-xs uppercase tracking-wider">Shift Notes</span>
                    <textarea 
                      rows={3} 
                      className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-sm md:text-base text-zinc-100 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal resize-none transition-colors placeholder:text-zinc-500"
                      placeholder="Log any incidents, tasks completed, client mood, etc."
                      value={notes}
                      onChange={e => handleNotesChange(e.target.value)}
                    />
                  </div>
                  {isNDIS && (() => {
                    const vId = (shift as any).vehicle_id || (shift as any).vehicleId || selectedVehicleId;
                    const assignedVehicle = vehicles.find(v => String(v.id) === String(vId));
                    if (!assignedVehicle) return null;
                    return (
                      <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 flex items-center font-medium">
                          <Car className="w-3.5 h-3.5 mr-1.5 text-brand-teal shrink-0" />
                          Vehicle:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {assignedVehicle.name} ({assignedVehicle.rego || 'No Rego'})
                          {assignedVehicle.ownership === 'COMPANY' ? (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Company</span>
                          ) : (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-300">Personal</span>
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {shift.status === 'COMPLETED' && (
                <div className="flex flex-col gap-2">
                  <div className="w-full py-5 bg-brand-green/10 border-2 border-brand-green/30 text-brand-green shadow-md rounded-xl font-bold md:text-xl text-center">
                    Shift Completed
                  </div>
                  <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-3.5 shadow-sm">
                    <span className="text-zinc-300 font-bold block mb-2 text-xs uppercase tracking-wider">Shift Notes</span>
                    <p className="text-sm md:text-base leading-relaxed text-zinc-100 text-center bg-black/40 rounded-lg p-3 border border-zinc-700/50">{shift.notes || "No notes provided."}</p>
                  </div>
                  {isNDIS && (() => {
                    const vId = (shift as any).vehicle_id || (shift as any).vehicleId || selectedVehicleId;
                    const assignedVehicle = vehicles.find(v => String(v.id) === String(vId));
                    if (!assignedVehicle) return null;
                    return (
                      <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                        <span className="text-zinc-400 flex items-center font-medium">
                          <Car className="w-3.5 h-3.5 mr-1.5 text-brand-teal shrink-0" />
                          Vehicle:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {assignedVehicle.name} ({assignedVehicle.rego || 'No Rego'})
                          {assignedVehicle.ownership === 'COMPANY' ? (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Company</span>
                          ) : (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-700 text-zinc-300">Personal</span>
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {shift.status === 'PUBLISHED' && (
                <div className="flex flex-col gap-3">
                  {/* Vehicle Selection - NDIS shifts only */}
                  {isNDIS && (
                    <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-xl p-4 shadow-sm space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs md:text-sm font-extrabold text-zinc-100 uppercase tracking-widest flex items-center mb-1">
                            <Car className="w-4 h-4 mr-2 text-brand-teal shrink-0" /> SHIFT VEHICLE
                          </h4>
                          <p className="text-xs text-zinc-400 leading-snug font-medium">
                            Select the vehicle you are using for this shift.
                          </p>
                        </div>
                      </div>

                      <div>
                        <select
                          className="w-full bg-black/60 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-sm md:text-base text-white focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-colors"
                          value={selectedVehicleId}
                          onChange={e => setSelectedVehicleId(e.target.value)}
                        >
                          {vehicles.length === 0 ? (
                            <option value="">No vehicles found</option>
                          ) : (
                            <>
                              {vehicles.filter(v => v.ownership === 'PRIVATE').length > 0 && (
                                <optgroup label="Personal Vehicles (Staff)">
                                  {vehicles
                                    .filter(v => v.ownership === 'PRIVATE')
                                    .map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.name} ({v.rego || 'No Rego'}){v.is_primary ? ' ★ Primary' : ''}
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                              {vehicles.filter(v => v.ownership === 'COMPANY').length > 0 && (
                                <optgroup label="Company Vehicles">
                                  {vehicles
                                    .filter(v => v.ownership === 'COMPANY')
                                    .map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.name} ({v.rego || 'No Rego'}) - Company Vehicle
                                      </option>
                                    ))}
                                </optgroup>
                              )}
                            </>
                          )}
                        </select>
                      </div>

                      {(() => {
                        const sel = vehicles.find(v => String(v.id) === String(selectedVehicleId));
                        if (sel && sel.ownership === 'COMPANY') {
                          return (
                            <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start leading-relaxed">
                              <Info className="w-4 h-4 mr-2 text-amber-400 shrink-0 mt-0.5" />
                              <div className="space-y-1.5 w-full">
                                <div>
                                  <strong>Company Vehicle Selected:</strong> Provider Travel starts and ends at the Business Address. In accordance with policy, staff travel KM reimbursement is not credited for company vehicle use.
                                </div>
                                <div className="font-bold text-amber-200 tracking-wide text-[11px] uppercase bg-amber-900/50 px-2.5 py-1 rounded border border-amber-500/40 flex items-center">
                                  <span>REMINDER: ENTER ALL TRAVEL DESTINATIONS AS PER NORMAL</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <>
                    {isNDIS && (
                      <div className="bg-indigo-900/40 border-2 border-indigo-500/30 shadow-md rounded-xl p-4 space-y-4 mt-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs md:text-sm font-extrabold text-indigo-100 uppercase tracking-widest flex items-center mb-1">
                              <MapPin className="w-4 h-4 mr-2 text-brand-teal shrink-0" /> START ODOMETER
                            </h4>
                            <p className="text-xs text-indigo-200/80 leading-snug font-medium">
                              Record before driving to the client.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <input 
                            type="number" 
                            step="1"
                            placeholder="e.g. 85000"
                            className="w-full bg-black/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-base md:text-lg text-white focus:outline-none focus:border-brand-teal shadow-inner transition-colors"
                            value={odometerReading}
                            onChange={e => setOdometerReading(e.target.value)}
                          />
                        </div>
                        
                        {showCamera ? (
                          <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-8">
                              <button 
                                onClick={takePhoto}
                                className="bg-white text-black rounded-full p-5 shadow-xl active:scale-95 transition-transform"
                              >
                                <Camera className="w-8 h-8" />
                              </button>
                              <button 
                                onClick={stopCamera}
                                className="bg-zinc-800/90 text-white rounded-full p-5 shadow-xl active:scale-95 transition-transform backdrop-blur-sm"
                              >
                                <X className="w-8 h-8" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <button 
                              onClick={startCamera}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-2 px-4 text-sm md:text-base flex justify-center items-center font-medium transition-colors border border-white/[0.12] shadow-sm"
                            >
                              <Camera className="w-5 h-5 mr-2 text-zinc-400" />
                              {odometerPhoto ? 'Retake Photo' : 'Take Photo'}
                            </button>
                          </div>
                        )}

                        {odometerPhoto && !showCamera && (
                          <div className="mt-3 text-center relative max-w-max mx-auto">
                            <img src={odometerPhoto} alt="Odometer Preview" className="max-h-36 rounded-lg border-2 border-white/[0.12] shadow-md" />
                            <button 
                              onClick={() => setOdometerPhoto('')}
                              className="absolute -top-3 -right-3 bg-red-500 rounded-full text-white p-1.5 shadow-lg hover:bg-red-400 transition-transform active:scale-90"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 outline-none animate-in opacity-100">
              <h3 className="text-lg md:text-xl font-semibold border-b border-white/[0.08] pb-2 text-white mb-2">Complete Shift Checklist</h3>
              
              <div className="flex flex-col space-y-2 sm:mx-auto w-full">
                {/* 2. Transport & Odometer */}
                {isNDIS && (
                  <>
                    <div className="bg-indigo-900/20 rounded-xl p-3.5 shadow-sm border border-indigo-500/20">
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs md:text-sm font-bold text-indigo-100 uppercase tracking-wide flex items-center">
                          <Car className="w-4 h-4 mr-1.5 text-brand-teal shrink-0" /> TRAVEL ALLOWANCE
                        </h4>
                        {shift.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextEditing = !isEditingTransport;
                              setIsEditingTransport(nextEditing);
                              if (routeLogDetailsRef.current) {
                                routeLogDetailsRef.current.open = false;
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 border transition-all shadow-sm ${
                              isEditingTransport
                                ? 'bg-brand-teal text-zinc-950 border-brand-teal ring-2 ring-brand-teal/30'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/[0.12]'
                            }`}
                            title="Edit Client Transport"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>{isEditingTransport ? 'Editing' : 'Edit'}</span>
                          </button>
                        )}
                      </div>

                      {shift.status === 'COMPLETED' && (() => {
                        let log: any = null;
                        if (shift.transportRouteLog) {
                          try { log = JSON.parse(shift.transportRouteLog); } catch(e) {}
                        }
                        let breakdownArr: string[] = [];
                        if (shift.travelBreakdown) {
                          try { breakdownArr = JSON.parse(shift.travelBreakdown); } catch(e) {}
                        }

                        const providerKm = isHCP
                          ? (shift.homeCareTravelKm ?? shift.providerTravelKm ?? log?.homeCareTravel?.distance ?? 0)
                          : (shift.providerTravelKm ?? log?.providerTravel?.distance ?? 0);

                        const providerLegMins = isHCP
                          ? (log?.homeCareTravel?.legs || []).reduce((sum: number, l: any) => sum + (Number(l.durationMins) || 0), 0)
                          : (log?.providerTravel?.legs || []).reduce((sum: number, l: any) => sum + (Number(l.durationMins) || 0), 0);

                        const providerMins = Number(shift.providerTravelMinutes) || (isHCP ? Number(log?.homeCareTravel?.minutes) : Number(log?.providerTravel?.minutes)) || providerLegMins || 0;

                        const abtKmVal = shift.abtKm ?? log?.abt?.distance ?? 0;

                        const hasProviderLegs = log?.providerTravel?.legs && log.providerTravel.legs.length > 0 && !isHCP;
                        const hasHomeCareLegs = log?.homeCareTravel?.legs && log.homeCareTravel.legs.length > 0;
                        const hasAbtLog = !!log?.abt;
                        const hasAnyLogContent = breakdownArr.length > 0 || hasProviderLegs || hasHomeCareLegs || hasAbtLog;

                        return (
                          <div className="space-y-3 mb-2">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className={`p-3 rounded-xl border flex flex-col justify-center ${providerKm > 0 ? 'bg-indigo-950/40 border-brand-teal/30' : 'bg-zinc-900/60 border-white/[0.08]'}`}>
                                <p className="text-[11px] font-bold text-brand-teal/90 uppercase tracking-wider mb-1">
                                  {isHCP ? 'Home Care Provider Travel (Between Shifts)' : 'Provider Travel (To/From Shift)'}
                                </p>
                                <div className="flex items-baseline gap-2.5 flex-wrap">
                                  <span className="text-lg font-extrabold text-white">
                                    {Number(providerKm).toFixed(2)} <span className="text-xs font-medium text-brand-teal">km</span>
                                  </span>
                                  {isHCP && (
                                    <span className="text-xs font-bold text-brand-teal bg-brand-teal/15 px-2 py-0.5 rounded-md border border-brand-teal/30">
                                      {Math.round(providerMins)} mins
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className={`p-3 rounded-xl border flex flex-col justify-center ${abtKmVal > 0 ? 'bg-brand-green/10 border-brand-green/30' : 'bg-zinc-900/60 border-white/[0.08]'}`}>
                                <p className="text-[11px] font-bold text-brand-green/90 uppercase tracking-wider mb-1">
                                  Activity Based Transport (Client Travel)
                                </p>
                                <div className="flex items-baseline gap-2.5 flex-wrap">
                                  <span className="text-lg font-extrabold text-white">
                                    {Number(abtKmVal).toFixed(2)} <span className="text-xs font-medium text-brand-green">km</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Full-Width Dropdown Log */}
                            <div className="w-full bg-[#09090b]/90 px-3.5 py-2.5 rounded-xl border border-white/[0.1] shadow-inner">
                              <details ref={routeLogDetailsRef} className="group">
                                <summary className="text-xs sm:text-sm font-semibold text-zinc-200 cursor-pointer flex items-center hover:text-white transition-colors outline-none list-none py-0.5">
                                  <span className="flex-1">View Transport Route Log</span>
                                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 group-open:rotate-180 transition-transform">
                                    <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
                                  </div>
                                </summary>
                                <div className="mt-3 space-y-3 pt-3 border-t border-white/[0.08]">
                                  {breakdownArr.length > 0 && (
                                    <div className="bg-[#121214] p-3.5 rounded-xl border border-white/[0.08]">
                                      <span className="text-[11px] font-bold text-brand-teal/80 mb-2.5 uppercase tracking-wider block">Calculated Travel Journey:</span>
                                      <div className="space-y-2">
                                        {breakdownArr.map((item, idx) => {
                                          const isZero = item.includes('0km') || item.includes('Ignored');
                                          return (
                                            <div key={idx} className={`text-xs sm:text-sm ${isZero ? 'text-zinc-500 italic' : 'text-zinc-200'}`}>
                                              {item}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {hasProviderLegs && (
                                    <div className="bg-[#121214] p-3.5 rounded-xl border border-white/[0.08]">
                                      <span className="text-[11px] font-bold text-brand-teal/80 mb-3 uppercase tracking-wider block">Provider Travel (To/From Shift):</span>
                                      <div className="space-y-4">
                                        {log.providerTravel.legs.map((leg: any, i: number) => (
                                          <div key={i}>
                                            {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins)}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 pt-3 border-t border-white/[0.08] gap-2">
                                        <span className="inline-flex items-center px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-md w-max">
                                          {Number(providerKm).toFixed(2)} km
                                        </span>
                                        {log.providerTravel.calculatedAt && (
                                          <span className="text-[10px] text-zinc-500 font-medium">Calculated: {new Date(log.providerTravel.calculatedAt).toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {hasHomeCareLegs && (
                                    <div className="bg-[#121214] p-3.5 rounded-xl border border-white/[0.08]">
                                      <span className="text-[11px] font-bold text-brand-teal/80 mb-3 uppercase tracking-wider block">Home Care Travel Route:</span>
                                      <div className="space-y-4">
                                        {log.homeCareTravel.legs.map((leg: any, i: number) => {
                                          if (leg.distance === 0 && leg.description && leg.description.includes('Private Commute')) {
                                            return (
                                              <div key={i} className="text-xs sm:text-sm text-zinc-400 italic">
                                                {leg.description}
                                              </div>
                                            );
                                          }
                                          if (leg.distance === 0) return null;
                                          return (
                                            <div key={i}>
                                              {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins || providerMins)}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 pt-3 border-t border-white/[0.08] gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="inline-flex items-center px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-md">
                                            {Number(providerKm).toFixed(2)} km
                                          </span>
                                          <span className="inline-flex items-center px-3 py-1.5 bg-zinc-800 text-brand-teal border border-brand-teal/30 text-xs font-bold rounded-md">
                                            {Math.round(providerMins)} mins
                                          </span>
                                        </div>
                                        {log.homeCareTravel.calculatedAt && (
                                          <span className="text-[10px] text-zinc-500 font-medium">Calculated: {new Date(log.homeCareTravel.calculatedAt).toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {hasAbtLog ? (
                                    <div className="bg-[#121214] p-3.5 rounded-xl border border-white/[0.08]">
                                      <span className="text-[11px] font-bold text-brand-green/80 mb-3 uppercase tracking-wider block">Activity Based Transport (ABT):</span>
                                      {log.abt.legs && log.abt.legs.length > 0 ? (
                                        <div className="space-y-4">
                                          {log.abt.legs.map((leg: any, i: number) => (
                                            <div key={i}>
                                              {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins)}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div>{renderFormattedDescription(log.abt.description || 'Activity Based Transport', log.abt.distance, log.abt.calculatedAt, log.abt.minutes)}</div>
                                      )}
                                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 pt-3 border-t border-white/[0.08] gap-2">
                                        <span className="inline-flex items-center px-3 py-1.5 bg-brand-green/20 text-brand-green text-xs font-black rounded-md border border-brand-green/30 w-max">
                                          {log.abt.distance != null ? Number(log.abt.distance).toFixed(2) : Number(abtKmVal).toFixed(2)} km
                                        </span>
                                        {log.abt.calculatedAt && (
                                          <span className="text-[10px] text-zinc-500 font-medium">Calculated: {new Date(log.abt.calculatedAt).toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-[#121214] p-3 rounded-xl border border-white/[0.08] text-xs text-zinc-400 italic">
                                      No client transport (Activity Based Transport) recorded for this shift.
                                    </div>
                                  )}

                                  {!hasAnyLogContent && (
                                    <div className="text-xs text-zinc-400 italic">
                                      No billable travel route log recorded for this shift.
                                    </div>
                                  )}
                                </div>
                              </details>
                            </div>
                          </div>
                        );
                      })()}

                      {(shift.status !== 'COMPLETED' || isEditingTransport) && (
                        <div className={shift.status === 'COMPLETED' ? 'pt-3 mt-3 border-t border-indigo-500/30 animate-in fade-in' : ''}>
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col pr-4">
                              <label className="text-sm md:text-base text-indigo-200 font-semibold leading-snug">Did you perform any travel for the client?</label>
                              <span className="text-xs text-indigo-300/70 mt-1">(Will update or replace any previous transport entered)</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                setDidTransport(!didTransport);
                                setHasModifiedTransport(true);
                              }}
                              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-zinc-900 shadow-inner ${didTransport ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                            >
                              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${didTransport ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {didTransport && (
                            <div className="space-y-3 pt-3 mt-3 border-t border-brand-teal/20">
                              <div className="flex items-start bg-indigo-500/10 border border-brand-teal/20 rounded-lg p-2.5">
                                <Info className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5 mr-2" />
                                <p className="text-[11px] md:text-xs text-indigo-200 leading-snug font-medium">
                                  Client's Home is automatically your starting point. Add destinations below.
                                </p>
                              </div>
                              <div className="relative">
                                <div className="flex items-center space-x-3 bg-[#09090b] border border-white/[0.12]/80 rounded-xl px-3 focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal transition-shadow shadow-inner">
                                  <MapPin className="text-brand-teal w-5 h-5 flex-shrink-0" />
                                  <input 
                                    type="text" 
                                    placeholder="Search destination address..." 
                                    className="w-full bg-transparent border-none py-3 text-sm md:text-base text-white focus:outline-none focus:ring-0"
                                    value={searchQuery}
                                    onChange={e => searchLocation(e.target.value)}
                                  />
                                </div>
                                
                                {searchResults.length > 0 && (
                                  <ul className="absolute z-20 w-full mt-2 bg-zinc-800 border border-white/[0.12] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-zinc-700/50 font-medium">
                                    {searchResults.map((res: any, idx: number) => (
                                      <li 
                                        key={idx} 
                                        className="px-4 py-3 hover:bg-zinc-700 cursor-pointer text-sm md:text-base transition-colors text-zinc-200 hover:text-white"
                                        onClick={() => addWaypoint(res)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="truncate">{res.placePrediction.text.text}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {waypoints.map((wp: any, idx: number) => (
                                  <div key={idx} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600 flex items-center justify-between">
                                    <span className="text-sm md:text-base truncate mr-3 text-zinc-300 font-medium flex items-center min-w-0">
                                       <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 text-brand-teal rounded-full flex items-center justify-center text-xs mr-3 font-bold">{idx + 1}</span>
                                       <span className="truncate">{wp.name}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWaypoints(waypoints.filter((_: any, i: number) => i !== idx));
                                        setHasModifiedTransport(true);
                                      }}
                                      className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04] shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="flex justify-between items-center bg-[#09090b]/80 p-3 rounded-xl mt-2 shadow-sm">
                                <label className="text-sm md:text-base text-zinc-300 font-medium pr-4 leading-snug">Did you return to clients home?</label>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setReturnedHome(!returnedHome);
                                    setHasModifiedTransport(true);
                                  }}
                                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-zinc-900 shadow-inner ${returnedHome ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${returnedHome ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {shift.status !== 'COMPLETED' && (
                      <div className="bg-emerald-900/10 rounded-xl p-3 space-y-2 mt-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs md:text-sm font-bold text-zinc-100 uppercase tracking-wide flex items-center mb-0.5">
                              <MapPin className="w-4 h-4 mr-1.5 text-brand-green shrink-0" /> END ODOMETER
                            </h4>
                            <p className="text-[11px] md:text-xs text-zinc-400 leading-snug font-medium">
                              Record your odometer at the end of the shift.
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <input 
                            type="number" 
                            step="1"
                            placeholder="e.g. 85025"
                            className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl py-2 px-3 text-base md:text-lg text-white focus:outline-none focus:border-brand-green shadow-inner transition-colors"
                            value={odometerReading}
                            onChange={e => setOdometerReading(e.target.value)}
                          />
                        </div>
                        
                        {showCamera ? (
                          <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-8">
                              <button 
                                onClick={takePhoto}
                                className="bg-white text-black rounded-full p-5 shadow-xl active:scale-95 transition-transform"
                              >
                                <Camera className="w-8 h-8" />
                              </button>
                              <button 
                                onClick={stopCamera}
                                className="bg-zinc-800/90 text-white rounded-full p-5 shadow-xl active:scale-95 transition-transform backdrop-blur-sm"
                              >
                                <X className="w-8 h-8" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <button 
                              onClick={startCamera}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl py-2 px-4 text-sm md:text-base flex justify-center items-center font-medium transition-colors border border-white/[0.12] shadow-sm"
                            >
                              <Camera className="w-5 h-5 mr-2 text-zinc-400" />
                              {odometerPhoto ? 'Retake Photo' : 'Take Photo'}
                            </button>
                          </div>
                        )}

                        {odometerPhoto && !showCamera && (
                          <div className="mt-3 text-center relative max-w-max mx-auto">
                            <img src={odometerPhoto} alt="Odometer Preview" className="max-h-36 rounded-lg border-2 border-white/[0.12] shadow-md" />
                            <button 
                              onClick={() => setOdometerPhoto('')}
                              className="absolute -top-3 -right-3 bg-red-500 rounded-full text-white p-1.5 shadow-lg hover:bg-red-400 transition-transform active:scale-90"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 3. Shift Notes & Observations */}
                <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/[0.08] flex flex-col space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm md:text-base font-medium text-zinc-300">Shift Notes & Observations</label>
                      <label className="flex items-center cursor-pointer gap-2">
                        <span className={`text-sm font-medium ${isIncident ? 'text-red-400' : 'text-zinc-400'}`}>Has an Incident occurred?</span>
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isIncident ? 'bg-red-500' : 'bg-zinc-700'}`}>
                           <input type="checkbox" className="sr-only" checked={isIncident} onChange={(e) => setIsIncident(e.target.checked)} />
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isIncident ? 'translate-x-4' : 'translate-x-1'}`} />
                        </div>
                      </label>
                    </div>
                    <textarea 
                      rows={6} 
                      className={`w-full bg-[#09090b] border border-white/[0.12]/50 rounded-xl p-4 text-sm md:text-base text-zinc-100 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal shadow-inner resize-y transition-colors ${isIncident ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder={isIncident ? "Please describe the incident in detail..." : "Log any incidents, tasks completed, client mood, etc."}
                      value={notes}
                      onChange={e => handleNotesChange(e.target.value)}
                    />
                  </div>
                  {isIncident && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                      <Info className="w-5 h-5 shrink-0" />
                      <p>This note will be submitted as an <strong>Incident</strong>, alerting administration for further policy action.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/[0.08]/80 mt-2 shrink-0 bg-[#121214] z-10 w-full">
          {showCancelPrompt ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <button 
                onClick={() => setShowCancelPrompt(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium text-base transition-colors border border-white/[0.12] shadow-sm"
              >
                Back
              </button>
              <button 
                onClick={handleCancelShift}
                disabled={loading || !cancelReason.trim()}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-base flex justify-center items-center transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Confirm Cancel"}
              </button>
            </div>
          ) : completeMode ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${!isNDIS ? 'sm:mx-auto max-w-2xl' : ''}`}>
              <button 
                onClick={() => setCompleteMode(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-base md:text-lg transition-colors shadow-sm"
              >
                Back
              </button>
              <button 
                onClick={handleCompleteShift}
                disabled={loading}
                className="w-full py-3 bg-brand-green/80 hover:bg-brand-green text-white rounded-xl font-bold text-base md:text-lg flex justify-center items-center transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit"}
              </button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${!isNDIS ? 'sm:mx-auto max-w-2xl' : ''}`}>
              {shift.status === 'PUBLISHED' && (
                <>
                  <button 
                    onClick={() => setShowCancelPrompt(true)}
                    disabled={loading}
                    className="w-full py-3 bg-transparent border-2 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 text-red-400 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm"
                  >
                    Cancel Shift
                  </button>
                  <button 
                    onClick={handleStartShift}
                    disabled={loading || !canStart}
                    className="w-full py-3 bg-brand-blue hover:bg-indigo-500 text-white rounded-xl font-bold md:text-lg flex items-center justify-center transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:active:scale-100"
                  >
                    <Play className="w-5 h-5 md:w-6 md:h-6 mr-2 shrink-0" /> Start Shift
                  </button>
                </>
              )}
              {shift.status === 'IN_PROGRESS' && (
                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-[1fr_3fr] gap-3">
                  <button 
                     onClick={handleUndoStartShift}
                     disabled={loading}
                     className="w-full py-3 bg-transparent border-2 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 text-red-400 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm shrink-0"
                     title="Undo Start Shift"
                  >
                     <RotateCcw className="w-5 h-5 md:w-6 md:h-6 sm:mr-2" /> 
                     <span className="sm:hidden ml-2 text-base">Undo Start</span>
                     <span className="hidden sm:inline text-base">Undo</span>
                  </button>
                  <button 
                    onClick={() => setCompleteMode(true)}
                    disabled={loading}
                    className="w-full py-3 bg-brand-green/80 hover:bg-brand-green text-white rounded-xl font-bold text-lg md:text-xl flex items-center justify-center transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:active:scale-100"
                  >
                    <StopCircle className="w-6 h-6 mr-2 shrink-0" /> Complete Shift
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
