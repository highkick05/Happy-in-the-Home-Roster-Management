import React from 'react';
import { X, Trash2, CheckCircle, Edit, Cast, Undo2, ArrowDown, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShiftEvent } from './RosterCalendar';

interface ShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  shift: ShiftEvent | null;
  onEdit?: (shift: ShiftEvent) => void;
  servicesList?: any[];
  holidays?: any[];
}

export default function ShiftDetailsModal({ isOpen, onClose, onSave, shift, onEdit, servicesList = [], holidays }: ShiftDetailsModalProps) {
  const { token, user, settings } = useAuth();
  const [showCancelPrompt, setShowCancelPrompt] = React.useState(false);
  const [showProgressNotePrompt, setShowProgressNotePrompt] = React.useState(false);
  const [progressNoteText, setProgressNoteText] = React.useState('');
  const [cancelReason, setCancelReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [internalHolidays, setInternalHolidays] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!isOpen) {
      setShowCancelPrompt(false);
      setShowProgressNotePrompt(false);
      setProgressNoteText('');
      setCancelReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (holidays && holidays.length > 0) {
      setInternalHolidays(holidays);
    } else if (isOpen && shift && shift.start) {
      const year = new Date(shift.start).getFullYear();
      fetch(`/api/holidays?year=${year}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setInternalHolidays(data.holidays || []);
        })
        .catch(err => {
          console.error("Failed to fetch holidays in ShiftDetailsModal:", err);
        });
    }
  }, [isOpen, shift, holidays, token]);

  if (!isOpen || !shift) return null;

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
                  {prefix && <span className="font-semibold uppercase text-white text-base tracking-tight">{prefix}</span>}
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
              let label = isStart ? 'START' : isEnd ? 'END' : 'WAYPOINT';

              return (
                <div key={i} className="flex gap-4 items-start relative z-10 mb-6 last:mb-0">
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
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/[0.08]/60 pl-8">
              <div className="flex gap-3">
                <span className="text-sm font-black text-brand-green bg-brand-green/10 px-4 py-2 rounded-lg border border-brand-green/30 shadow-sm shadow-brand-green/10">
                  {distance.toFixed(2)} km
                </span>
                {durationMins != null && durationMins > 0 && (
                   <span className="text-sm font-black text-zinc-300 bg-zinc-800/50 px-4 py-2 rounded-lg border border-white/10 shadow-sm">
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
        <div className="flex flex-col gap-5 pl-1 mt-1 relative before:absolute before:inset-y-[12px] before:left-[11px] before:w-[2px] before:bg-zinc-800/80">
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
            <div className="flex justify-between items-center mt-2 pt-4 border-t border-white/[0.08]/60 pl-8">
              <div className="flex gap-3">
                <span className="text-sm font-black text-brand-teal bg-indigo-500/10 px-4 py-2 rounded-lg border border-brand-teal/30 shadow-sm shadow-brand-teal/10">
                  {distance.toFixed(2)} km
                </span>
                {durationMins != null && durationMins > 0 && (
                   <span className="text-sm font-black text-zinc-300 bg-zinc-800/50 px-4 py-2 rounded-lg border border-white/10 shadow-sm">
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
          <div className="mt-3 flex gap-3">
             <span className="text-xs font-black text-brand-teal bg-indigo-500/10 px-3 py-1.5 rounded-md border border-brand-teal/20">
               {distance.toFixed(2)} km
             </span>
             {durationMins != null && durationMins > 0 && (
                <span className="text-xs font-black text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-md border border-white/5">
                  {durationMins.toFixed(0)} mins
                </span>
             )}
          </div>
        )}
      </div>
    );
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const isRespite = shift.isRespiteWrapper;
      const endpoint = isRespite 
        ? `/api/respite-bookings/${shift.respiteData?.id}/status` 
        : `/api/shifts/${shift.id}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        onSave();
        onClose();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        if (status === 'COMPLETED') {
          // just close smoothly
        }
      } else {
        const err = await res.json();
        alert(`Failed to update status: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error updating status: ${e}`);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsSubmitting(true);
    try {
      const isRespite = shift.isRespiteWrapper;
      const endpoint = isRespite 
        ? `/api/invoices/respite/${shift.respiteData?.id}/generate` 
        : `/api/invoices/${shift.id}/generate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert('Invoice generated successfully!');
        onSave();
        onClose();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
      } else {
        const err = await res.json();
        alert(`Failed to generate invoice: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error generating invoice: ${e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const isRespite = shift.isRespiteWrapper;
      const endpoint = isRespite 
        ? `/api/respite-bookings/${shift.respiteData?.id}` 
        : `/api/shifts/${shift.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        onSave();
        onClose();
      } else {
        alert('Failed to delete shift');
      }
    } catch (e) {
      console.error(e);
    }
  };


  const handleSaveProgressNote = async () => {
    setIsSubmitting(true);
    try {
      const isRespite = shift.isRespiteWrapper;
      // if respite, maybe we don't have notes update route, but assuming it uses the same PUT or doesn't have notes
      // We will just do it for shifts. For respite, we can try to PUT /api/respite-bookings/:id ?
      // Wait, let's just do it for normal shifts. If it's respite, we'll try PUT /api/respite-bookings/:id with notes
      // Let's check how EditShiftModal saves notes for respite. Usually respite also has notes.
      const endpoint = isRespite 
        ? `/api/respite-bookings/${shift.respiteData?.id}` 
        : `/api/shifts/${shift.id}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ notes: progressNoteText })
      });
      if (res.ok) {
        setShowProgressNotePrompt(false);
        onSave(); // this refetches the events
      } else {
        const err = await res.json();
        alert(`Failed to save progress note: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving progress note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelShift = async () => {
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    setIsSubmitting(true);
    try {
      const isRespite = shift.isRespiteWrapper;
      const endpoint = isRespite 
        ? `/api/respite-bookings/${shift.respiteData?.id}/status` 
        : `/api/shifts/${shift.id}/cancel`;

      const method = isRespite ? 'PUT' : 'POST';
      const body = isRespite ? { status: 'CANCELLED' } : { reason: cancelReason };

      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        onSave();
        onClose();
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
      } else {
        const err = await res.json();
        alert(`Failed to cancel shift: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error cancelling shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAssignedStaff = user?.id === shift.staffId;
  const canEdit = isAdmin; // Staff cannot edit shifts anymore

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-4" onClick={handleBackgroundClick}>
      <div 
        className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 sm:p-4 max-w-full sm:max-w-2xl lg:max-w-3xl w-full text-zinc-100 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl transition-all" 
      >
        <div className="flex justify-between items-center mb-5 md:mb-6 shrink-0">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-4">Shift Details</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04]">
            <X className="w-5 h-5 md:w-6 md:h-6 text-zinc-300" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 sm:pr-2 pb-2">
          {showCancelPrompt ? (
            <div className="space-y-6 outline-none animate-in opacity-100">
              <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold border-b border-red-500/30 text-red-100 pb-3 mb-4">Cancel Shift</h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200 leading-relaxed shadow-sm">
                    You are cancelling this shift as an administrator. This action will cancel the shift and save the cancellation reason into the progress notes using the assigned staff member's name and designation.
                  </div>
                </div>
                
                <div className="space-y-4 flex flex-col">
                  <div>
                    <label className="block text-sm md:text-base font-semibold text-zinc-300 mb-2">Reason for Cancellation</label>
                    <textarea 
                      rows={4} 
                      className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl p-4 text-sm md:text-base text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-inner resize-none"
                      placeholder="E.g., Client sick, Support worker unavailable"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : showProgressNotePrompt ? (
            <div className="space-y-6 outline-none animate-in opacity-100">
              <div className="flex flex-col gap-4">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold border-b border-brand-teal/30 text-brand-teal pb-3 mb-4">Progress Note</h3>
                  <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-xl p-4 text-sm text-brand-teal leading-relaxed shadow-sm">
                    Enter the progress note for this shift. This will be saved directly to the shift's details.
                  </div>
                </div>
                
                <div className="space-y-4 flex flex-col">
                  <div>
                    <label className="block text-sm md:text-base font-semibold text-zinc-300 mb-2">Note content</label>
                    <textarea 
                      rows={6} 
                      className="w-full bg-[#09090b] border border-white/[0.08] rounded-xl p-4 text-sm md:text-base text-white focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal shadow-inner resize-none custom-scrollbar"
                      placeholder="Optional notes for shift..."
                      value={progressNoteText}
                      onChange={e => setProgressNoteText(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-6">
            <div className="bg-zinc-800/30 p-3 sm:p-4 rounded-xl border border-white/[0.08]/80">
              <p className="text-xs md:text-sm text-zinc-500 font-medium mb-1 uppercase tracking-wide">Client</p>
              <p className="font-bold text-zinc-200">{shift.clientName}</p>
            </div>
            <div className="bg-zinc-800/30 p-3 sm:p-4 rounded-xl border border-white/[0.08]/80">
              <p className="text-xs md:text-sm text-zinc-500 font-medium mb-1 uppercase tracking-wide">Staff</p>
              <p className="font-bold text-zinc-200">
                {shift.isRespiteWrapper && shift.respiteData?.shifts
                  ? Array.from(new Set(shift.respiteData.shifts.map((s: any) => `${s.staff_first_name} ${s.staff_last_name}`))).join(', ')
                  : shift.staffName}
              </p>
            </div>
            <div className="bg-zinc-800/30 p-3 sm:p-4 rounded-xl border border-white/[0.08]/80">
              <p className="text-xs md:text-sm text-zinc-500 font-medium mb-1 uppercase tracking-wide">Status</p>
              <span className={`inline-block px-3 py-1 mt-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${
                shift.status === 'DRAFT' ? 'bg-zinc-800 text-zinc-300 border border-white/[0.12]' :
                shift.status === 'PUBLISHED' ? 'bg-indigo-500/20 text-brand-teal border border-brand-teal/30' :
                shift.status === 'COMPLETED' ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' :
                shift.status === 'IN_PROGRESS' || shift.status === 'PENDING_SYNC' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {shift.status.replace('_', ' ')}
              </span>
            </div>
            <div className="bg-zinc-800/30 p-3 sm:p-4 rounded-xl border border-white/[0.08]/80">
              <p className="text-xs md:text-sm text-zinc-500 font-medium mb-1 uppercase tracking-wide">Date & Time</p>
              <p className="font-bold text-zinc-200">{new Date(shift.start).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{new Date(shift.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(shift.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            
            {shift.status === 'COMPLETED' && (shift.providerTravelKm !== undefined || shift.homeCareTravelKm !== undefined) && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-4 mt-2 border-t border-white/[0.08]/80">
                 <p className="text-sm md:text-base font-bold text-zinc-300 mb-3">Transport & Travel Details</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {(() => {
                     const isHCP = shift.fundingType === 'HOME_CARE' || shift.fundingType === 'Home Care' || shift.fundingType === 'HCP';
                     const km = isHCP ? (shift.homeCareTravelKm || shift.providerTravelKm || 0) : (shift.providerTravelKm || 0);
                     const title = isHCP ? 'Home Care Travel (Client Gap)' : 'Provider Travel (Distance to Shift)';
                     
                     if (km > 0) {
                       return (
                         <div className="bg-indigo-900/10 p-4 rounded-xl border border-brand-teal/20 shadow-sm flex flex-col justify-center">
                           <p className="text-xs font-medium text-brand-teal/80 mb-1 uppercase tracking-wider">{title}</p>
                           <p className="text-xl text-indigo-100 font-extrabold">{km.toFixed(2)} <span className="text-sm font-medium text-brand-teal">km</span></p>
                         </div>
                       );
                     }
                     return (
                       <div className="bg-zinc-800/50 p-4 rounded-xl border border-white/[0.08]/80 shadow-sm flex flex-col justify-center">
                         <p className="text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">{isHCP ? 'Home Care Travel (Client Gap)' : 'Provider Travel'}</p>
                         <p className="text-xl text-zinc-300 font-extrabold">0.00 <span className="text-sm font-medium text-zinc-500">km</span></p>
                       </div>
                     );
                   })()}
                   {!(shift.fundingType === 'HOME_CARE' || shift.fundingType === 'Home Care' || shift.fundingType === 'HCP') && (
                     <div className="bg-brand-green/10 p-4 rounded-xl border border-brand-green/20 shadow-sm flex flex-col justify-center">
                       <p className="text-xs font-medium text-brand-green/80 mb-1 uppercase tracking-wider">Activity Based Transport (ABT)</p>
                       <p className="text-xl text-white font-extrabold">{shift.abtKm ? shift.abtKm.toFixed(2) : 0} <span className="text-sm font-medium text-brand-green/80">km</span></p>
                     </div>
                   )}
                   {(shift.travelBreakdown || shift.transportRouteLog) && (() => {
                     let log: any = null;
                     if (shift.transportRouteLog) {
                       try { log = JSON.parse(shift.transportRouteLog); } catch(e) {}
                     }
                     
                     let breakdownArr: string[] = [];
                     if (shift.travelBreakdown) {
                       try { breakdownArr = JSON.parse(shift.travelBreakdown); } catch(e) {}
                     }

                     if (!log && breakdownArr.length === 0) return null;

                     return (
                     <div className="col-span-1 sm:col-span-2 bg-[#09090b]/80 p-4 rounded-xl border border-white/[0.08] shadow-inner mt-2">
                       <details className="group">
                          <summary className="text-sm md:text-base font-medium text-zinc-300 cursor-pointer flex items-center hover:text-white transition-colors outline-none list-none">
                            <span className="flex-1">View Transport Route Log</span>
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 group-open:rotate-180 transition-transform">
                              <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
                            </div>
                          </summary>
                          <div className="mt-4 space-y-4 pt-4 border-t border-white/[0.08]/80">
                            {breakdownArr && breakdownArr.length > 0 && (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 bg-[#121214] p-4 md:p-5 rounded-2xl border border-white/[0.08]">
                                  <span className="text-xs font-bold text-brand-teal/80 mb-5 uppercase tracking-wider block">Calculated Travel Journey:</span>
                                  <div className="space-y-3">
                                    {breakdownArr.map((item, idx) => {
                                      const isZero = item.includes('0km') || item.includes('Ignored');
                                      return (
                                        <div key={idx} className={`text-sm ${isZero ? 'text-zinc-500 italic' : 'text-zinc-200'}`}>
                                          {item}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                            {log && log.providerTravel && log.providerTravel.legs && log.providerTravel.legs.length > 0 && !(shift.fundingType === 'HOME_CARE' || shift.fundingType === 'Home Care' || shift.fundingType === 'HCP') && (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0 bg-[#121214] p-4 md:p-5 rounded-2xl border border-white/[0.08]">
                                  <span className="text-xs font-bold text-brand-teal/80 mb-5 uppercase tracking-wider block">Provider Travel (To/From Shift):</span>
                                  <div className="space-y-6">
                                    {log.providerTravel.legs.map((leg: any, i: number) => (
                                      <div key={i} className="mb-2">
                                        {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins)}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-6 pt-5 border-t border-white/[0.08]/80 sm:pl-8 gap-3">
                                    <span className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto">
                                      {shift.providerTravelKm != null ? shift.providerTravelKm.toFixed(2) : log.providerTravel.legs.reduce((sum: number, leg: any) => sum + (leg.distance || 0), 0).toFixed(2)} km
                                    </span>
                                    {log.providerTravel.calculatedAt && (
                                      <span className="text-[10px] md:text-xs text-zinc-500 font-medium self-start sm:self-auto text-left sm:text-right">Calculated: <br className="sm:hidden"/>{new Date(log.providerTravel.calculatedAt).toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {log && log.homeCareTravel && log.homeCareTravel.legs && log.homeCareTravel.legs.length > 0 && (
                              <div className="flex items-start gap-3 pt-2">
                                <div className="flex-1 min-w-0 bg-[#121214] p-4 md:p-5 rounded-2xl border border-white/[0.08]">
                                  <span className="text-xs font-bold text-brand-teal/80 mb-5 uppercase tracking-wider block">Home Care Travel Route:</span>
                                  <div className="space-y-6">
                                    {log.homeCareTravel.legs.map((leg: any, i: number) => {
                                      if (leg.distance === 0 && leg.description.includes('Private Commute')) {
                                        return (
                                          <div key={i} className="mb-2 text-zinc-400 italic">
                                            {leg.description}
                                          </div>
                                        );
                                      }
                                      if (leg.distance === 0) return null;
                                      return (
                                        <div key={i} className="mb-2">
                                          {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-6 pt-5 border-t border-white/[0.08]/80 sm:pl-8 gap-3">
                                    <span className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto">
                                      {shift.homeCareTravelKm != null ? shift.homeCareTravelKm.toFixed(2) : log.homeCareTravel.legs.reduce((sum: number, leg: any) => sum + (leg.distance || 0), 0).toFixed(2)} km
                                    </span>
                                    {log.homeCareTravel.calculatedAt && (
                                      <span className="text-[10px] md:text-xs text-zinc-500 font-medium self-start sm:self-auto text-left sm:text-right">Calculated: <br className="sm:hidden"/>{new Date(log.homeCareTravel.calculatedAt).toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}


                            {log && log.abt && (
                              <div className="flex items-start gap-3 pt-2">
                                  <div className="flex-1 min-w-0 bg-[#121214] p-4 md:p-5 rounded-2xl border border-white/[0.08]">
                                    <span className="text-xs font-bold text-brand-green/80 mb-5 uppercase tracking-wider block">Activity Based Transport (ABT):</span>
                                    {log.abt.legs && log.abt.legs.length > 0 ? (
                                      <div className="space-y-6">
                                        {log.abt.legs.map((leg: any, i: number) => (
                                          <div key={i} className="mb-2">
                                            {renderFormattedDescription(leg.description, leg.distance, undefined, leg.durationMins)}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="mb-1">{renderFormattedDescription(log.abt.description || 'Activity Based Transport', log.abt.distance, log.abt.calculatedAt, log.abt.minutes)}</div>
                                    )}
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-6 pt-5 border-t border-white/[0.08]/80 sm:pl-8 gap-3">
                                      <span className="flex items-center px-4 py-2 bg-brand-green/20 text-brand-green text-[13px] font-black rounded-md border border-brand-green/30 w-full justify-center md:w-auto">
                                        {log.abt.distance != null ? log.abt.distance.toFixed(2) : 0} km
                                      </span>
                                      {log.abt.calculatedAt && (
                                        <span className="text-[10px] md:text-xs text-zinc-500 font-medium self-start sm:self-auto text-left sm:text-right">Calculated: <br className="sm:hidden"/>{new Date(log.abt.calculatedAt).toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                              </div>
                            )}
                          </div>
                       </details>
                     </div>
                     );
                   })()}
                 </div>
              </div>
            )}
          </div>
          
          {isAdmin && (shift.serviceId || (shift.servicesData && shift.servicesData.length > 0)) && !shift.isRespiteWrapper && (
            <div className="pt-5 mt-5 border-t border-white/[0.08]/80">
              <p className="text-sm md:text-base font-bold text-zinc-300 mb-4">Billing Information</p>
              
              {(() => {
                const sData = (shift.servicesData && shift.servicesData.length > 0) 
                  ? shift.servicesData 
                  : [{ serviceId: shift.serviceId }];

                let grandTotal = 0;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sData.map((sd: any, idx: number) => {
                      const sIdStr = String(sd.serviceId);
                      const fullService = servicesList.find(s => String(s.id) === sIdStr);
                      const serviceName = fullService ? fullService.name : (sd.serviceName || (idx === 0 ? shift.serviceName : 'Unknown Service'));
                      const unit = fullService ? (fullService.unit || 'Hour') : (sd.serviceUnit || shift.serviceUnit || 'Hour');
                      const serviceType = (sd.serviceType || shift.serviceType) || (fullService ? fullService.type : 'Unknown');
                      const ratesJson = (sd.serviceRatesJson || shift.serviceRatesJson) || (fullService ? fullService.rates_json : null);

                      const startMs = new Date(shift.start).getTime();
                      const endMs = new Date(shift.end).getTime();
                      const hours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
                      
                      let baseRate = Number((sd.serviceRate !== undefined && sd.serviceRate !== null) ? sd.serviceRate : (shift.serviceRate !== undefined && shift.serviceRate !== null ? shift.serviceRate : (fullService ? fullService.rate : 0)));
                      let dayOfWeek = new Date(shift.start).getDay();
                      let finalRate = baseRate;
                      
                      const startDateObj = new Date(shift.start);
                      const yyyy = startDateObj.getFullYear();
                      const mm = String(startDateObj.getMonth() + 1).padStart(2, '0');
                      const dd = String(startDateObj.getDate()).padStart(2, '0');
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      const isPublicHoliday = internalHolidays.some((h: any) => h.date && h.date.startsWith(dateStr));
                      
                      if (serviceType === 'HOME_CARE' && ratesJson) {
                         try {
                            const rates = JSON.parse(ratesJson);
                            if (isPublicHoliday && rates['Public Holiday']) finalRate = Number(rates['Public Holiday']);
                            else if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
                            else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
                            else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
                         } catch(e) {}
                      } else if (serviceType === 'NDIS' && ratesJson) {
                         try {
                            const rates = JSON.parse(ratesJson);
                            const region = settings?.ndisRegion || 'NSW';
                            if (rates[region] !== undefined) finalRate = Number(rates[region]);
                         } catch(e) {}
                      }

                      if (sd.rateOverride !== undefined && sd.rateOverride !== null && sd.rateOverride !== '') {
                        finalRate = Number(sd.rateOverride);
                      }
                      
                      const qty = (sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== '') ? Number(sd.qtyOverride) : (unit === 'Hour' ? hours : 1);
                      const subtotal = qty * finalRate;
                      grandTotal += subtotal;

                      return (
                        <div key={idx} className="bg-[#121214] p-4 rounded-xl border border-white/[0.08] text-sm md:text-base shadow-sm">
                          <div className="flex justify-between mb-2">
                            <span className="text-zinc-500 font-medium">Service</span>
                            <span className="text-zinc-200 ml-4 text-right truncate font-bold" title={serviceName}>{serviceName}</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span className="text-zinc-500 font-medium">Duration/Qty</span>
                            <span className="text-zinc-200 font-medium">{qty.toFixed(2)} {unit}</span>
                          </div>
                          <div className="flex justify-between mb-3">
                            <span className="text-zinc-500 font-medium">Rate</span>
                            <span className="text-zinc-200 font-medium">${finalRate.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-3 border-t border-white/[0.08]/80 font-bold">
                            <span className="text-zinc-400 uppercase tracking-widest text-xs mt-1">Total</span>
                            <span className="text-brand-teal text-lg">${subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {sData.length > 1 && (
                       <div className="md:col-span-2 flex justify-between items-center p-4 md:p-5 bg-indigo-900/10 rounded-xl border border-brand-teal/30 font-bold mb-4 shadow-sm">
                         <span className="text-brand-teal uppercase tracking-widest text-sm">Grand Total</span>
                         <span className="text-brand-teal text-xl">${grandTotal.toFixed(2)}</span>
                       </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {shift.isRespiteWrapper && shift.respiteData?.shifts && (
            <div className="pt-5 mt-5 border-t border-white/[0.08]/80">
              <p className="text-sm md:text-base font-bold text-zinc-300 mb-4">Respite Information</p>
              <div className="bg-[#121214] p-4 md:p-5 rounded-xl border border-white/[0.08] text-sm md:text-base mb-4 shadow-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-500 font-medium">Days Configured:</span>
                  <span className="text-zinc-200 font-bold">
                    {Array.from(new Set(shift.respiteData.shifts.map((s: any) => new Date(s.start_time).toLocaleDateString()))).length} Day(s)
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-500 font-medium">Shifts Mapped:</span>
                  <span className="text-zinc-200 font-bold">{shift.respiteData.shifts.length}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/[0.08]/50 text-xs md:text-sm text-zinc-400 leading-relaxed font-medium">
                  Open Edit Booking Details to see billing and specific breakdown.
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/[0.08]/80 shrink-0">
          {showCancelPrompt ? (
            <>
              <button 
                onClick={() => setShowCancelPrompt(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium text-sm md:text-base transition-colors border border-white/[0.12] shadow-sm animate-in fade-in"
              >
                Back
              </button>
              <button 
                onClick={handleCancelShift}
                disabled={isSubmitting || !cancelReason.trim()}
                className="w-full sm:col-span-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm md:text-base flex justify-center items-center transition-colors shadow-md disabled:opacity-50 animate-in fade-in"
              >
                {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Confirm Cancel"}
              </button>
            </>
          ) : showProgressNotePrompt ? (
            <>
              <button 
                onClick={() => setShowProgressNotePrompt(false)}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium text-sm md:text-base transition-colors border border-white/[0.12] shadow-sm animate-in fade-in"
              >
                Back
              </button>
              <button 
                onClick={handleSaveProgressNote}
                disabled={isSubmitting}
                className="w-full sm:col-span-2 py-3 bg-brand-teal hover:bg-brand-teal/80 text-zinc-950 rounded-xl font-bold text-sm md:text-base flex justify-center items-center transition-colors shadow-md disabled:opacity-50 animate-in fade-in"
              >
                {isSubmitting ? <span className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"/> : "Save Note"}
              </button>
            </>
          ) : (
            <>
              {canEdit && shift.status !== 'COMPLETED' && shift.status !== 'CANCELLED' && (
                <button 
                  onClick={() => {
                     setProgressNoteText(shift.notes || '');
                     setShowProgressNotePrompt(true);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal rounded-xl text-sm md:text-base font-bold transition-all shadow-md border border-brand-teal/30 animate-in fade-in"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Progress Note
                </button>
              )}
              {canEdit && shift.status !== 'COMPLETED' && shift.status !== 'CANCELLED' && (
                <button 
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-brand-green/80 hover:bg-brand-green text-white rounded-xl text-sm md:text-base font-bold transition-all shadow-md active:scale-95"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark Completed
                </button>
              )}

              {isAdmin && (shift.status === 'COMPLETED' || shift.status === 'CANCELLED') && (
                <button 
                  onClick={handleGenerateInvoice}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center px-4 py-3 bg-brand-teal/90 hover:bg-brand-teal text-zinc-950 rounded-xl text-sm md:text-base font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin mr-2" />
                  ) : (
                    <FileText className="w-5 h-5 mr-2 text-zinc-950" />
                  )}
                  Create Invoice
                </button>
              )}

              {isAdmin && (
                <button 
                  onClick={() => {
                     onClose();
                     if (onEdit) onEdit(shift);
                  }}
                  className="w-full flex items-center justify-center px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm md:text-base font-bold transition-all shadow-sm active:scale-95"
                >
                  <Edit className="w-5 h-5 mr-2 text-zinc-400" />
                  {shift.isRespiteWrapper ? "Edit Booking" : "Edit Shift"}
                </button>
              )}
              
              {isAdmin && shift.status === 'DRAFT' && (
                <button 
                  onClick={() => handleUpdateStatus('PUBLISHED')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-brand-blue hover:bg-indigo-500 text-white rounded-xl text-sm md:text-base font-bold transition-all shadow-md active:scale-95"
                >
                  <Cast className="w-5 h-5 mr-2" />
                  {shift.isRespiteWrapper ? "Publish Booking" : "Publish Shift"}
                </button>
              )}

              {isAdmin && shift.status === 'PUBLISHED' && (
                <button 
                  onClick={() => handleUpdateStatus('DRAFT')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-xl text-sm md:text-base font-bold transition-all active:scale-95"
                >
                  <Undo2 className="w-5 h-5 mr-2 shrink-0" />
                  {shift.isRespiteWrapper ? "Unpublish Booking" : "Unpublish Shift"}
                </button>
              )}

              {canEdit && shift.status !== 'CANCELLED' && shift.status !== 'COMPLETED' && (
                <button 
                  onClick={() => setShowCancelPrompt(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-red-500/30 text-red-100 hover:bg-red-500/10 rounded-xl text-sm md:text-base font-bold transition-all active:scale-95"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </button>
              )}

              {isAdmin && (
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center px-4 py-3 border border-red-600/50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-sm md:text-base font-bold transition-all shadow-sm active:scale-95"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  {shift.isRespiteWrapper ? "Delete Booking" : "Delete"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
