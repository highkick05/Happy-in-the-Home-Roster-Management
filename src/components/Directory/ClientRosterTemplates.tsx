import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Calendar, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';

interface ClientRosterTemplatesProps {
  client: any;
}

interface ServiceFormEntry {
  serviceId: string;
  qtyOverride?: number | string;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function ClientRosterTemplates({ client }: ClientRosterTemplatesProps) {
  const clientId = client?.id;
  const { token, user, settings } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate drop down days based on settings start day (default Monday)
  const displayDaysOrder = useMemo(() => {
    const startDayName = settings?.invoicingStartDay || 'Monday';
    const startIndex = DAYS_OF_WEEK.indexOf(startDayName) !== -1 ? DAYS_OF_WEEK.indexOf(startDayName) : 1; // Default 1 (Monday)
    const order = [];
    for (let i = 0; i < 7; i++) {
      order.push((startIndex + i) % 7);
    }
    return order;
  }, [settings]);

  // New template form state
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

  useEffect(() => {
    if (daysOfWeek.length === 0 && displayDaysOrder.length > 0) {
      setDaysOfWeek([displayDaysOrder[0]]);
    }
  }, [displayDaysOrder]);

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [staffId, setStaffId] = useState('');
  const [servicesData, setServicesData] = useState<ServiceFormEntry[]>([{ serviceId: '' }]);

  // Generate roster state
  const [generateDuration, setGenerateDuration] = useState('Month');
  
  const getTodayInTimezone = (tz?: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch (e) {
      console.error('Timezone formatting error:', e);
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEndOfMonthFromDateStr = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const end = new Date(Number(y), Number(m), 0, 12, 0, 0);
    const yEnd = end.getFullYear();
    const mEnd = String(end.getMonth() + 1).padStart(2, '0');
    const dEnd = String(end.getDate()).padStart(2, '0');
    return `${yEnd}-${mEnd}-${dEnd}`;
  };

  const [generateStartDate, setGenerateStartDate] = useState(() => {
    return getTodayInTimezone(settings?.timezone);
  });
  const [generateEndDate, setGenerateEndDate] = useState(() => {
    return getEndOfMonthFromDateStr(getTodayInTimezone(settings?.timezone));
  });

  useEffect(() => {
    if (settings?.timezone && generateStartDate === getTodayInTimezone()) {
      const tzToday = getTodayInTimezone(settings.timezone);
      setGenerateStartDate(tzToday);
      setGenerateEndDate(getEndOfMonthFromDateStr(tzToday));
    }
  }, [settings?.timezone]);

  const handleDurationChange = (val: string) => {
    setGenerateDuration(val);
    if (!generateStartDate) return;
    const [y, m, d] = generateStartDate.split('-');
    const start = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    let end = new Date(start);
    if (val === 'Week') {
      end.setDate(start.getDate() + 6);
    } else if (val === 'Fortnight') {
      end.setDate(start.getDate() + 13);
    } else if (val === 'Month') {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);
    }
    const yEnd = end.getFullYear();
    const mEnd = String(end.getMonth() + 1).padStart(2, '0');
    const dEnd = String(end.getDate()).padStart(2, '0');
    setGenerateEndDate(`${yEnd}-${mEnd}-${dEnd}`);
  };

  const currentMonthName = useMemo(() => {
    const today = new Date();
    return today.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, []);

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);
  
  // Conflicts modal state
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showRunBuilderModal, setShowRunBuilderModal] = useState(false);
  const [existingShiftsCount, setExistingShiftsCount] = useState(0);
  const [clientConflictsList, setClientConflictsList] = useState<any[]>([]);
  const [selectedConflictsToOverwrite, setSelectedConflictsToOverwrite] = useState<Set<number>>(new Set());
  const [resolvingConflicts, setResolvingConflicts] = useState(false);

  useEffect(() => {
    fetchData();
  }, [clientId, token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [templatesRes, allServicesRes, staffRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/roster-templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (allServicesRes.ok) setServicesList(await allServicesRes.json());
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData.filter((user: any) => user.role !== 'ADMIN'));
      }
      
      // Default to today/end of current month
      const tzToday = getTodayInTimezone(settings?.timezone);
      setGenerateStartDate(tzToday);
      setGenerateEndDate(getEndOfMonthFromDateStr(tzToday));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clientPersonalisedServices = useMemo(() => {
    const clientServiceIds = client?.service_ids || [];
    if (clientServiceIds.length === 0) {
      return servicesList;
    }
    const selectedServiceIds = servicesData.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return servicesList.filter(s => clientServiceIds.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [client, servicesList, servicesData]);

  const shiftHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    let end = new Date(`1970-01-01T${endTime}:00`);
    if (end < start) end = new Date(`1970-01-02T${endTime}:00`);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  }, [startTime, endTime]);

  const getServiceDetails = (serviceId: string, dayOfWeek: number) => {
    const service = servicesList.find(x => String(x.id) === serviceId);
    if (!service) return { rate: 0, unit: 'Hour', name: '' };
    
    let baseRate = Number(service.rate);
    let finalRate = baseRate;
    
    if (service.type === 'HOME_CARE' && service.rates_json) {
       try {
          const rates = JSON.parse(service.rates_json);
          if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
          else if (dayOfWeek === 6 && rates['Saturday']) finalRate = Number(rates['Saturday']);
          else if (rates['Weekday']) finalRate = Number(rates['Weekday']);
       } catch(e) {}
    } else if (service.type === 'NDIS' && service.rates_json) {
       try {
          const rates = JSON.parse(service.rates_json);
          const region = settings?.ndisRegion || 'NSW';
          if (rates[region] !== undefined) finalRate = Number(rates[region]);
       } catch(e) {}
    }
    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name };
  };

  const weeklyTotalAmount = useMemo(() => {
    let total = 0;
    templates.forEach(t => {
      const tStart = new Date(`1970-01-01T${t.start_time}:00`);
      let tEnd = new Date(`1970-01-01T${t.end_time}:00`);
      if (tEnd < tStart) tEnd = new Date(`1970-01-02T${t.end_time}:00`);
      const tShiftHours = Math.max(0, (tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60));

      if (t.servicesData && t.servicesData.length > 0) {
        t.servicesData.forEach((sd: any) => {
          const { rate, unit } = getServiceDetails(String(sd.serviceId), t.day_of_week);
          const effectiveQty = (sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== '') ? Number(sd.qtyOverride) : (unit === 'Hour' ? tShiftHours : 1);
          total += rate * effectiveQty;
        });
      } else if (t.service_id) {
         // Legacy templates handling
         const { rate, unit } = getServiceDetails(String(t.service_id), t.day_of_week);
         total += rate * tShiftHours;
      }
    });
    return total;
  }, [templates, servicesList]);

  const handleAddServiceEntry = () => {
    setServicesData(prev => [...prev, { serviceId: '' }]);
  };

  const handleRemoveServiceEntry = (index: number) => {
    setServicesData(prev => prev.filter((_, i) => i !== index));
  };

  const updateServiceEntry = (index: number, field: keyof ServiceFormEntry, value: string) => {
    setServicesData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!staffId) {
      alert("Please select a Pref. Staff member.");
      return;
    }

    if (daysOfWeek.length === 0) {
      alert("Please select at least one day of the week.");
      return;
    }

    if (servicesData.length === 0) {
      alert("Please add at least one service.");
      return;
    }

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (start >= end) {
      alert("Start time must be before end time.");
      return;
    }

    for (const s of servicesData) {
      if (!s.serviceId) {
        alert("Please select a service for all entries.");
        return;
      }
    }

    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          daysOfWeek,
          startTime,
          endTime,
          staffId: parseInt(staffId),
          servicesData
        })
      });
      if (res.ok) {
        fetchData();
        setShowAddTemplateModal(false);
      } else {
        alert('Failed to add template.');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred.');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/client-roster-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearTemplate = async () => {
    if (!confirm('Are you sure you want to clear all template shifts for this client?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        setDaysOfWeek([]);
        setStartTime('09:00');
        setEndTime('17:00');
        setStaffId('');
        setServicesData([{ serviceId: '' }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateRoster = async () => {
    if (!generateStartDate || !generateEndDate) {
      alert('Please select start and end dates.');
      return;
    }
    setGenerating(true);
    setGenerateResult(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.existingShiftsCount > 0) {
          setExistingShiftsCount(data.existingShiftsCount);
          setShowConflictsModal(true);
          setGenerating(false);
        } else {
          executeGenerateRoster('all');
        }
      } else {
        alert(data.error || 'Failed to check roster.');
        setGenerating(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
      setGenerating(false);
    }
  };

  const executeGenerateRoster = async (overwriteParam: any) => {
    setResolvingConflicts(true);
    setGenerating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: false, overwriteConflicts: overwriteParam })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setGenerateResult(data);
        setShowConflictsModal(false);
        setShowRunBuilderModal(false); // Close Modal on success
      } else {
        alert(data.error || 'Failed to generate roster.');
      }
    } catch (e) {
      console.error(e);
      alert('Error generating roster.');
    } finally {
      setResolvingConflicts(false);
      setGenerating(false);
    }
  };

  const hrStyle = "border-white/[0.08] my-6";

  const handleResolveConflicts = async () => {
    executeGenerateRoster('all');
  };

  if (loading) return <div className="p-4 text-zinc-400">Loading templates...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Bottom Section: Templates List */}
      <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-[#121214] flex justify-between items-center shrink-0">
           <h3 className="text-lg font-medium text-white">Current Roster Templates</h3>
           <div className="flex items-center gap-2">
             {user?.role === 'ADMIN' && (
               <>
                 <button
                   onClick={() => setShowRunBuilderModal(true)}
                   className="px-3 py-1.5 bg-brand-green/80 hover:bg-brand-green text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                 >
                   <Calendar className="w-4 h-4 mr-2" />
                   Run Builder
                 </button>
                 <button
                   onClick={() => setShowAddTemplateModal(true)}
                   className="px-3 py-1.5 bg-indigo-500 hover:bg-brand-blue text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Add Shift
                 </button>
               </>
             )}
             {templates.length > 0 && (
               <button
                 onClick={handleClearTemplate}
                 className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/20 transition-colors"
               >
                 Clear All
               </button>
             )}
           </div>
        </div>
        <div className="flex-1 overflow-x-auto p-4 flex gap-4 custom-scrollbar items-stretch bg-[#121214]/10 h-full">
          {templates.length === 0 ? (
            <div className="text-zinc-500 text-sm py-8 w-full text-center bg-[#09090b] rounded-lg border border-white/[0.08] border-dashed h-fit">
              No templates defined yet.
            </div>
          ) : (
             displayDaysOrder.map(dayIdx => {
               const dayTemplates = templates.filter(t => t.day_of_week === dayIdx).sort((a, b) => a.start_time.localeCompare(b.start_time));
               
               return (
                 <div key={dayIdx} className="flex-1 min-w-[120px] flex flex-col gap-3 h-full overflow-hidden">
                   <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                     <span className="text-sm font-medium text-zinc-300">{DAYS_OF_WEEK[dayIdx]}</span>
                     <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-brand-teal ml-auto">{dayTemplates.length} SHIFT{dayTemplates.length === 1 ? '' : 'S'}</span>
                   </div>
                   
                   <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                     {dayTemplates.length === 0 ? null : dayTemplates.map(t => (
                       <div key={t.id} className="flex flex-col justify-between p-3 bg-[#09090b] border border-white/[0.08] rounded-lg hover:border-white/[0.12] transition-colors group">
                         <div className="flex justify-between items-start mb-2">
                           <div className="flex-1 pr-3">
                             <div className="flex items-center gap-3 mb-1">
                               <div className="text-sm font-medium text-zinc-100">{t.start_time} - {t.end_time}</div>
                             </div>
                             <div className="mb-2">
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-800/50 border border-white/[0.12]/50 text-[11px] text-zinc-300">
                                 Staff: {t.staff_first_name} {t.staff_last_name}
                               </span>
                             </div>
                           </div>
                           {user?.role === 'ADMIN' && (
                             <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/[0.04]">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                         </div>
                         
                         <div className="space-y-1.5 mt-auto">
                           {t.servicesData && t.servicesData.length > 0 ? (
                             t.servicesData.map((sd: any, idx: number) => {
                               const { rate, unit, name } = getServiceDetails(String(sd.serviceId), t.day_of_week);
                               
                               const tStart = new Date(`1970-01-01T${t.start_time}:00`);
                               let tEnd = new Date(`1970-01-01T${t.end_time}:00`);
                               if (tEnd < tStart) tEnd = new Date(`1970-01-02T${t.end_time}:00`);
                               const tShiftHours = Math.max(0, (tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60));
                               
                               const effectiveQty = (sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== '') ? Number(sd.qtyOverride) : (unit === 'Hour' ? tShiftHours : 1);
                               const qtyText = (sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== '') ? Number(sd.qtyOverride) : (unit === 'Hour' ? `Auto Hrs (${tShiftHours.toFixed(2)})` : 1);
                               const totalAmount = rate * effectiveQty;
       
                               return (
                                  <div key={idx} className="bg-[#121214] border border-white/[0.08] rounded-md p-2">
                                    <div className="flex items-start mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 mr-2"></div>
                                      <div className="text-zinc-200 text-sm font-medium leading-tight">{name || 'Service'}</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center bg-black/30 rounded-md p-2">
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Unit</span>
                                        <span className="text-xs font-medium text-zinc-300">{unit}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Qty</span>
                                        <span className="text-xs font-medium text-zinc-300">{qtyText}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Rate</span>
                                        <span className="text-xs font-medium text-zinc-300">${rate.toFixed(2)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Total</span>
                                        <span className="text-xs font-medium text-brand-teal">${totalAmount.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                               );
                             })
                           ) : (
                             <div className="bg-[#121214] border border-white/[0.08] rounded-md p-2 flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mr-2"></div>
                                <span className="text-zinc-300 text-sm font-medium">{t.service_name || 'Legacy Service'}</span>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               );
             })
          )}
        </div>
        {/* Weekly Total Footer */}
        {templates.length > 0 && (
          <div className="p-4 border-t border-white/[0.08] bg-[#09090b] flex justify-between items-center shrink-0">
            <span className="text-[12px] font-medium text-zinc-400">Total Weekly Value</span>
            <span className="text-base font-semibold text-brand-green">${weeklyTotalAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Add Template Modal */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl max-w-[80vw] w-[80vw] h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214]">
              <div>
                <h3 className="text-xl font-semibold text-white">Add Template Shift</h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Multiple services on the same day/time will belong to ONE shift.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    setDaysOfWeek(displayDaysOrder.length > 0 ? [displayDaysOrder[0]] : []);
                    setStartTime('09:00');
                    setEndTime('17:00');
                    setStaffId('');
                    setServicesData([{ serviceId: '' }]);
                  }}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/20 transition-colors"
                >
                  Clear All
                </button>
                <button onClick={() => setShowAddTemplateModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              <form id="add-template-form" onSubmit={(e) => { handleAddTemplate(e); setShowAddTemplateModal(false); }} className="space-y-6 h-full flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                  <div className="space-y-4 border-r border-white/[0.08] pr-5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Days of Week</label>
                      <div className="flex flex-wrap gap-1.5">
                        {displayDaysOrder.map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (daysOfWeek.includes(idx)) {
                                setDaysOfWeek(daysOfWeek.filter(d => d !== idx));
                              } else {
                                setDaysOfWeek([...daysOfWeek, idx]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors border ${daysOfWeek.includes(idx) ? 'bg-indigo-500/20 text-brand-teal border-brand-teal/30' : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:bg-zinc-800'}`}
                          >
                            {DAYS_OF_WEEK[idx].substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Time</label>
                        <CustomTimePicker required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Time</label>
                        <CustomTimePicker required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pref. Staff Member *</label>
                      <select required value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors">
                        <option value="">Select Staff</option>
                        {staff.map((s:any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-zinc-400">Services Provided</label>
                    </div>
                    
                    {servicesData.map((s, index) => {
                      const { rate, unit } = getServiceDetails(s.serviceId, daysOfWeek[0] ?? 1);
                      const effectiveQty = (s.qtyOverride !== undefined && s.qtyOverride !== null && s.qtyOverride !== '') ? Number(s.qtyOverride) : (unit === 'Hour' ? shiftHours : 1);
                      const totalAmount = rate * effectiveQty;
                      
                      return (
                        <div key={index} className="bg-[#121214] border border-white/[0.08] rounded-md p-3">
                          <select
                            required
                            value={String(s.serviceId || '')}
                            onChange={e => updateServiceEntry(index, 'serviceId', e.target.value)}
                            className="w-full bg-[#09090b] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm text-white focus:border-brand-teal outline-none mb-2"
                          >
                            <option value="">-- Choose Service --</option>
                            {clientPersonalisedServices.map(cs => (
                              <option key={cs.id} value={String(cs.id)} className="truncate">{cs.name}</option>
                            ))}
                          </select>
                          
                          {s.serviceId && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.08]">
                              <div className="flex items-center gap-2">
                                {unit !== 'Hour' && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Qty</span>
                                    <input 
                                      type="number" min="0.01" step="0.01"
                                      value={s.qtyOverride || ''}
                                      onChange={(e) => updateServiceEntry(index, 'qtyOverride', e.target.value)}
                                      placeholder={String(effectiveQty)}
                                      className="w-14 bg-[#09090b] border border-white/[0.08] rounded px-1.5 py-1 text-sm text-zinc-200 focus:border-brand-teal outline-none"
                                    />
                                  </div>
                                )}
                                {unit === 'Hour' && (
                                  <span className="text-[10px] text-zinc-400 bg-[#09090b] px-1.5 py-1 rounded border border-white/[0.08]">{effectiveQty.toFixed(2)} Hrs</span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-brand-teal">${totalAmount.toFixed(2)}</span>
                                {servicesData.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveServiceEntry(index)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-md"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <button 
                      type="button"
                      onClick={handleAddServiceEntry}
                      className="w-full py-2 bg-[#121214] hover:bg-zinc-800 border border-white/[0.08] border-dashed text-zinc-300 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Service
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-white/[0.08] bg-[#121214] flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-white rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-template-form"
                className="px-5 py-2 bg-indigo-500 hover:bg-brand-blue text-white rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save Shift Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Builder Modal */}
      {showRunBuilderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214]">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-brand-teal mr-2.5" />
                <h3 className="text-xl font-semibold text-white">Run Roster Builder</h3>
              </div>
              <button onClick={() => setShowRunBuilderModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Duration Preset</label>
                <select 
                  value={generateDuration} 
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                >
                  <option value="Week">1 Week</option>
                  <option value="Fortnight">1 Fortnight</option>
                  <option value="Month">1 Month</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
                  <CustomDatePicker 
                     
                    value={generateStartDate} 
                    onChange={e => {
                      const newStartStr = e.target.value;
                      setGenerateStartDate(newStartStr);
                      if (!newStartStr) return;
                      const [y, m, d] = newStartStr.split('-');
                      const start = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
                      let end = new Date(start);
                      if (generateDuration === 'Week') end.setDate(start.getDate() + 6);
                      else if (generateDuration === 'Fortnight') end.setDate(start.getDate() + 13);
                      else if (generateDuration === 'Month') end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);
                      const yEnd = end.getFullYear();
                      const mEnd = String(end.getMonth() + 1).padStart(2, '0');
                      const dEnd = String(end.getDate()).padStart(2, '0');
                      setGenerateEndDate(`${yEnd}-${mEnd}-${dEnd}`);
                    }} 
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
                  <CustomDatePicker  value={generateEndDate} onChange={e => setGenerateEndDate(e.target.value)} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors" />
                </div>
              </div>
              
              <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3 text-sm text-brand-blue">
                This will automatically create draft shifts for this client based on their active templates for the selected period.
              </div>
              
              {generateResult && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-green-400 text-sm font-medium">Created {generateResult.createdCount} draft shifts successfully.</h4>
                  </div>
                  {generateResult.conflicts && generateResult.conflicts.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center text-amber-500 mb-2 text-xs font-medium tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                        Conflicts & Warnings
                      </div>
                      <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {generateResult.conflicts.map((c: any, i: number) => (
                          <li key={i} className="text-[11px] text-zinc-300 bg-black/40 p-2 rounded-md border border-white/[0.05] leading-snug">
                            <strong className="text-white block mb-0.5">{c.date} ({c.startTime}-{c.endTime})</strong> 
                            <span className="text-zinc-400">{c.message}</span>
                            <div className="text-zinc-500 mt-1">✓ Unassigned draft created.</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/[0.08] bg-[#121214] flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setShowRunBuilderModal(false)}
                className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-white rounded-md text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handleGenerateRoster} 
                disabled={generating || templates.length === 0}
                className="px-5 py-2 bg-brand-green/80 hover:bg-brand-green text-white disabled:bg-zinc-800 disabled:text-zinc-500 rounded-md text-sm font-bold transition-all shadow-md flex items-center justify-center shrink-0 active:scale-[0.98]"
               >
                {generating ? 'Generating...' : 'Build Shifts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConflictsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214]/50">
              <div>
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                  Existing Shifts Found
                </h3>
              </div>
              <button onClick={() => setShowConflictsModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-zinc-300">
                This client already has <strong className="text-white">{existingShiftsCount}</strong> scheduled shift(s) between {generateStartDate} and {generateEndDate}.
              </p>
              <p className="text-zinc-400 text-sm mt-3 border-l-2 border-amber-500 pl-3">
                Building the roster will <strong>permanently replace all scheduled shifts</strong> for this client in the selected date range. Completed or In-Progress shifts will not be affected.
              </p>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#121214]/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowConflictsModal(false)}
                disabled={resolvingConflicts}
                className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto"
              >
                Cancel
              </button>
              <button 
                onClick={handleResolveConflicts}
                disabled={resolvingConflicts}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-medium transition-colors flex items-center"
              >
                {resolvingConflicts ? 'Replacing...' : 'Replace Scheduled Shifts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
