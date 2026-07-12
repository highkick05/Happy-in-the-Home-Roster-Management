import React, { useState, useEffect, useRef } from 'react';
import { X, Play, StopCircle, MapPin, Plus, Trash2, Info, Camera, RotateCcw, CheckSquare } from 'lucide-react';
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
  const [didTransport, setDidTransport] = useState(false);
  const [waypoints, setWaypoints] = useState<{name: string, placeId?: string, coords?: number[] | string}[]>([]);
  const [returnedHome, setReturnedHome] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [odometerReading, setOdometerReading] = useState('');
  const [odometerPhoto, setOdometerPhoto] = useState('');

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
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
      } else {
         setCompleteMode(false);
      }
      
      setShowCancelPrompt(false);
      setCancelReason('');
      setDidTransport(false);
      setReturnedHome(false);
      setWaypoints([]);
      setOdometerReading('');
      setOdometerPhoto('');
      
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
          odometer_start_photo: odometerPhoto
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
        body: JSON.stringify({ reason: cancelReason })
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
      ? ['CLIENT_HOME', ...waypoints.map(wp => ({ placeId: wp.placeId, address: wp.name })), ...(returnedHome ? ['CLIENT_HOME'] : [])] 
      : null;

    if (didTransport && waypoints.length === 0) {
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
      odometer_end_reading: odometerReading ? Math.round(Number(odometerReading)).toString() : '',
      odometer_end_photo: odometerPhoto
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
    setSearchQuery('');
    setSearchResults([]);
  };

  const isNDIS = shift.fundingType === 'NDIS' || !shift.fundingType;
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
        <div className="flex justify-between items-start mb-4 shrink-0 gap-3">
          <div className="flex-1 space-y-3">
             {/* Top Row: Name, Time, Map */}
             <div className="flex items-center w-full border-b border-zinc-700/60 pb-2 sm:pb-3 gap-2 sm:gap-4">
               <div className="flex-1 min-w-0 text-left">
                 <h2 className="text-[22px] md:text-3xl font-extrabold text-white tracking-tight truncate">
                   {shift.clientName}
                 </h2>
               </div>
               
               <div className="shrink-0 text-right sm:text-center ml-auto">
                 <p className="text-sm sm:text-base md:text-lg text-zinc-200 font-semibold whitespace-nowrap">
                   {new Date(shift.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(shift.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </p>
               </div>
               
               <div className="shrink-0">
                 {clientAddress && (
                   <a
                     href={`https://maps.google.com/?q=${encodeURIComponent(clientAddress)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-brand-blue/15 text-blue-300 hover:bg-brand-blue/30 border border-brand-blue/20 transition-all"
                     title="View Client Address on Google Maps"
                   >
                     <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                     <span className="hidden sm:inline">Directions</span>
                     <span className="sm:hidden">Map</span>
                   </a>
                 )}
               </div>
             </div>

             {/* Bottom Row: Assigned Tasks */}
             <div className="flex items-center gap-3 pt-1 w-full">
                 <span className="text-xs sm:text-sm text-zinc-400 font-bold uppercase tracking-wider shrink-0 text-left">Assigned Tasks:</span>
                 {shift.servicesData && shift.servicesData.length > 0 ? (
                    <div className="flex items-center justify-start overflow-hidden flex-1 min-w-0">
                       {shift.servicesData.slice(0, 1).map((s: any, idx: number) => {
                          const srv = servicesList.find((srv: any) => String(srv.id) === String(s.serviceId));
                          const srvName = srv ? srv.name : (s.serviceName || s.serviceCode || shift.serviceName);
                          return (
                             <span key={idx} className="block text-sm md:text-base font-semibold text-brand-teal truncate text-left" title={srvName}>
                                 {srvName}
                             </span>
                          );
                       })}
                    </div>
                 ) : shift.serviceName ? (
                    <span className="block text-sm md:text-base font-semibold text-brand-teal truncate text-left flex-1 min-w-0" title={shift.serviceName}>
                        {shift.serviceName}
                    </span>
                 ) : (
                    <span className="block text-sm md:text-base font-semibold text-zinc-500 italic text-left flex-1 min-w-0">
                        Not specified
                    </span>
                 )}
             </div>
             
             {isEarlyStart && !isLocked && (
                <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/30">
                   {Math.floor(startDiffMs / 60000)} minutes until shift
                </span>
             )}
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04] shrink-0 -mt-1 -mr-1">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
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
                </div>
              )}

              {shift.status === 'PUBLISHED' && (
                <div className="flex flex-col">
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
                    <div className="bg-indigo-900/20 rounded-xl p-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col pr-4">
                          <label className="text-sm md:text-base text-indigo-200 font-semibold leading-snug">Did you transport the client?</label>
                          <span className="text-xs text-indigo-300/70 mt-1">(Will update or replace any previous transport entered)</span>
                        </div>
                        <button 
                          onClick={() => setDidTransport(!didTransport)}
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
                              <div key={idx} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                                <span className="text-sm md:text-base truncate mr-3 text-zinc-300 font-medium flex items-center">
                                   <span className="flex-shrink-0 w-6 h-6 bg-indigo-500/20 text-brand-teal rounded-full flex items-center justify-center text-xs mr-3 font-bold">{idx + 1}</span>
                                   {wp.name}
                                </span>
                                <button onClick={() => setWaypoints(waypoints.filter((_: any, i: number) => i !== idx))} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04]">
                                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center bg-[#09090b]/80 p-3 rounded-xl mt-2 shadow-sm">
                            <label className="text-sm md:text-base text-zinc-300 font-medium pr-4 leading-snug">Did you return the client home?</label>
                            <button 
                              onClick={() => setReturnedHome(!returnedHome)}
                              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-zinc-900 shadow-inner ${returnedHome ? 'bg-indigo-500' : 'bg-zinc-700'}`}
                            >
                              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${returnedHome ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
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
                <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/[0.08] flex flex-col">
                  <label className="block text-sm md:text-base font-medium text-zinc-300 mb-2">Shift Notes & Observations</label>
                  <textarea 
                    rows={6} 
                    className="w-full bg-[#09090b] border border-white/[0.12]/50 rounded-xl p-4 text-sm md:text-base text-zinc-100 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal shadow-inner resize-y transition-colors"
                    placeholder="Log any incidents, tasks completed, client mood, etc."
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                  />
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
