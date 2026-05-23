import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  staffList: any[];
  clientList: any[];
  servicesList: any[];
  initialData?: any;
  holidays?: any[];
}

interface ServiceFormEntry {
  id?: number; // only if editing existing
  serviceId: string;
  qtyOverride?: number | string;
}

export default function AddShiftModal({ isOpen, onClose, onSave, staffList, clientList, servicesList, initialData, holidays = [] }: AddShiftModalProps) {
  const { token, settings } = useAuth();
  
  const [staffId, setStaffId] = useState('');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationStr, setDurationStr] = useState('');
  const [notes, setNotes] = useState('');
  const [servicesData, setServicesData] = useState<ServiceFormEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStaffId(initialData?.staffId || '');
      setClientId(initialData?.clientId || '');
      
      const today = new Date().toLocaleDateString('en-CA');
      const startD = initialData?.startDate || initialData?.date || today;
      const endD = initialData?.endDate || initialData?.date || today;
      const startT = initialData?.startTime || '';
      const endT = initialData?.endTime || '';

      setStartDate(startD);
      setEndDate(endD);
      setStartTime(startT);
      setEndTime(endT);
      setNotes(initialData?.notes || '');
      
      if (startD && startT && endD && endT) {
         const start = new Date(`${startD}T${startT}:00`);
         const end = new Date(`${endD}T${endT}:00`);
         if (end >= start) {
            const h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            setDurationStr(h % 1 === 0 ? h.toString() : h.toFixed(2));
         } else {
            setDurationStr('');
         }
      } else {
         setDurationStr('');
      }
      
      if (initialData?.servicesData && initialData.servicesData.length > 0) {
        setServicesData(initialData.servicesData.map((s: any) => ({
          ...s,
          serviceId: String(s.serviceId)
        })));
      } else {
        setServicesData([
          {
            id: initialData?.id,
            serviceId: initialData?.serviceId || ''
          }
        ]);
      }
    }
  }, [isOpen, initialData]);

  const shiftHours = useMemo(() => {
    if (!startTime || !endTime || !startDate || !endDate) return 0;
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    if (end < start) return 0;
    const diff = end.getTime() - start.getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  }, [startTime, endTime, startDate, endDate]);

  const getServiceDetails = (serviceId: string) => {
    const service = servicesList.find(x => String(x.id) === serviceId);
    if (!service) return { rate: 0, unit: 'Hour', name: '' };
    
    let baseRate = Number(service.rate);
    let dayOfWeek = -1;
    let isPublicHoliday = false;

    if (startDate) {
      const d = new Date(startDate + 'T12:00:00');
      dayOfWeek = d.getDay();
      
      const dateStr = startDate; // date is in YYYY-MM-DD format
      isPublicHoliday = holidays.some(h => h.date.startsWith(dateStr));
    }
    
    let finalRate = baseRate;
    if (service.type === 'HOME_CARE' && service.rates_json) {
       try {
          const rates = JSON.parse(service.rates_json);
          if (isPublicHoliday && rates['Public Holiday']) finalRate = Number(rates['Public Holiday']);
          else if (dayOfWeek === 0 && rates['Sunday']) finalRate = Number(rates['Sunday']);
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
    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name || '' };
  };

  const selectedClient = useMemo(() => {
    return clientList.find(c => String(c.id) === clientId);
  }, [clientId, clientList]);

  const clientPersonalisedServices = useMemo(() => {
    if (!selectedClient || !selectedClient.service_ids || selectedClient.service_ids.length === 0) {
      return servicesList; // fallback to all if no client selected or format missing or empty
    }
    // Also make sure to always include currently selected services in the modal so they aren't hidden
    const selectedServiceIds = servicesData.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return servicesList.filter(s => selectedClient.service_ids.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [selectedClient, servicesList, servicesData]);

  if (!isOpen) return null;

  const handleAddServiceEntry = () => {
    setServicesData(prev => [
      ...prev,
      { serviceId: '' }
    ]);
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

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newStartT = e.target.value;
     setStartTime(newStartT);
     const hrs = parseFloat(durationStr);
     if (!isNaN(hrs) && hrs > 0 && startDate && newStartT) {
         const start = new Date(`${startDate}T${newStartT}:00`);
         const end = new Date(start.getTime() + hrs * 60 * 60 * 1000);
         setEndDate(end.toLocaleDateString('en-CA'));
         setEndTime(end.toTimeString().slice(0, 5));
     } else if (startDate && newStartT && endDate && endTime) {
         const start = new Date(`${startDate}T${newStartT}:00`);
         const end = new Date(`${endDate}T${endTime}:00`);
         if (end >= start) {
            const h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            setDurationStr(h % 1 === 0 ? h.toString() : h.toFixed(2));
         }
     }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newStartD = e.target.value;
     setStartDate(newStartD);
     const hrs = parseFloat(durationStr);
     if (!isNaN(hrs) && hrs > 0 && newStartD && startTime) {
         const start = new Date(`${newStartD}T${startTime}:00`);
         const end = new Date(start.getTime() + hrs * 60 * 60 * 1000);
         setEndDate(end.toLocaleDateString('en-CA'));
         setEndTime(end.toTimeString().slice(0, 5));
     } else if (newStartD && startTime && endDate && endTime) {
         const start = new Date(`${newStartD}T${startTime}:00`);
         const end = new Date(`${endDate}T${endTime}:00`);
         if (end >= start) {
            const h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            setDurationStr(h % 1 === 0 ? h.toString() : h.toFixed(2));
         }
     }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const val = e.target.value;
     setDurationStr(val);
     const hrs = parseFloat(val);
     if (!isNaN(hrs) && hrs >= 0 && startDate && startTime) {
         const start = new Date(`${startDate}T${startTime}:00`);
         const end = new Date(start.getTime() + hrs * 60 * 60 * 1000);
         setEndDate(end.toLocaleDateString('en-CA'));
         setEndTime(end.toTimeString().slice(0, 5));
     }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newEndT = e.target.value;
     setEndTime(newEndT);
     if (startDate && startTime && endDate && newEndT) {
         const start = new Date(`${startDate}T${startTime}:00`);
         const end = new Date(`${endDate}T${newEndT}:00`);
         if (end >= start) {
            const h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            setDurationStr(h % 1 === 0 ? h.toString() : h.toFixed(2));
         }
     }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newEndD = e.target.value;
     setEndDate(newEndD);
     if (startDate && startTime && newEndD && endTime) {
         const start = new Date(`${startDate}T${startTime}:00`);
         const end = new Date(`${newEndD}T${endTime}:00`);
         if (end >= start) {
            const h = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            setDurationStr(h % 1 === 0 ? h.toString() : h.toFixed(2));
         }
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffId || !clientId || !startDate || !endTime) {
      alert("Please select staff, client, start date, and times.");
      return;
    }

    if (servicesData.length === 0) {
      alert("Please add at least one service.");
      return;
    }

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);

    if (start >= end) {
      alert("Start time must be before end time.");
      return;
    }

    // Validate all services
    const isEditing = !!initialData?.id;
    for (const s of servicesData) {
      if (!s.serviceId) {
        alert("Please select a service for all entries.");
        return;
      }
    }

    try {
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(`${endDate}T${endTime}:00`);

      const url = isEditing ? `/api/shifts/${initialData?.id}` : '/api/shifts';
      const method = isEditing ? 'PUT' : 'POST';

      const bodyData: any = {
        staffId: parseInt(staffId),
        clientId: parseInt(clientId),
        serviceId: servicesData.length > 0 ? parseInt(servicesData[0].serviceId) : null,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: notes,
        servicesData: servicesData.map(s => ({
            ...s,
            serviceId: parseInt(s.serviceId)
        }))
      };

      if (!isEditing) {
        bodyData.status = 'DRAFT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        onSave();
        onClose();
        // Reset state
        setStaffId('');
        setClientId('');
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setDurationStr('');
        setNotes('');
        setServicesData([]);
      } else {
        alert(`Failed to save one or more shifts.`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Background was clicked directly, not the modal content.
      // But we don't have an auto-close on background for this modal by default.
      // We can trigger onClose() if desired, but previously it just stopped propagation.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-start z-50 p-4 overflow-y-auto custom-scrollbar" onClick={handleBackgroundClick}>
      <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative max-w-[1200px] w-full text-zinc-100 flex flex-col my-10 shrink-0 h-fit">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-4">{initialData?.id ? 'Edit Shift' : 'Add Shift(s)'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 pr-2 pb-4">
            
            {/* Left Column: Core Info */}
            <div className="md:w-[320px] shrink-0 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Staff Member *</label>
                <select 
                  required
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                >
                  <option value="">Select Staff</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Client *</label>
                <select 
                  required
                  value={clientId}
                  onChange={e => {
                    setClientId(e.target.value);
                    // Optionally reset selected services since they may not apply to new client
                    if (e.target.value !== clientId && !initialData?.id) {
                      setServicesData([{ serviceId: '' }]);
                    }
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                >
                  <option value="">Select Client</option>
                  {clientList.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Start Date *</label>
                  <CustomDatePicker 
                    
                    required
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">End Date *</label>
                  <CustomDatePicker 
                    
                    required
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Start Time *</label>
                  <CustomTimePicker
                    name="startTime"
                    required
                    value={startTime}
                    onChange={handleStartTimeChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Duration (hr)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={durationStr}
                    onChange={handleDurationChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">End Time *</label>
                  <CustomTimePicker
                    name="endTime"
                    required
                    value={endTime}
                    onChange={handleEndTimeChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  placeholder="Optional notes for shift..."
                />
              </div>
            </div>

            {/* Right Column: Multiple Services */}
            <div className="flex-1 border-t md:border-t-0 md:border-l border-white/[0.08] md:pl-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Services for Shift</h3>
                <button 
                  type="button"
                  onClick={handleAddServiceEntry}
                  className="text-xs flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Service
                </button>
              </div>

              <div className="space-y-3">
                {servicesData.map((s, index) => {
                  const { rate, unit, name } = getServiceDetails(s.serviceId);
                  
                  const isProviderTravel = name.toLowerCase().includes('provider travel');
                  const isABT = name.toLowerCase().includes('activity based transport');
                  const isTravelOrTransport = isProviderTravel || isABT;
                  
                  const effectiveQty = isTravelOrTransport ? 0 : (s.qtyOverride !== undefined && s.qtyOverride !== '' ? Number(s.qtyOverride) : (unit === 'Hour' ? shiftHours : 1));
                  const subtotal = effectiveQty * rate;
                  
                  return (
                    <div key={index} className="bg-[#09090b] p-4 rounded-md border border-white/[0.08] relative flex flex-col pr-12">
                      {servicesData.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceEntry(index)}
                          className="absolute right-4 top-4 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="w-full mb-3">
                        <select
                          required
                          value={String(s.serviceId || '')}
                          onChange={(e) => updateServiceEntry(index, 'serviceId', e.target.value)}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        >
                          <option value="">-- Choose Personalised Service --</option>
                          {clientPersonalisedServices.map(cs => (
                            <option key={cs.id} value={String(cs.id)}>{cs.name} ({cs.code})</option>
                          ))}
                        </select>
                        {clientId && selectedClient?.service_ids?.length === 0 && (
                          <p className="text-xs text-amber-500 mt-1">Showing all services (no personalised services set up).</p>
                        )}
                      </div>
                      
                      {s.serviceId && (
                        <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-zinc-500 text-xs block">Unit</span>
                              <span className="text-zinc-300">{unit}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-xs block">Rate</span>
                              <span className="text-zinc-300">${rate.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-xs block">Qty</span>
                              {isTravelOrTransport ? (
                                <span className="text-zinc-500 italic">Auto</span>
                              ) : unit === 'Hour' ? (
                                <span className="text-zinc-300">{effectiveQty.toFixed(2)}</span>
                              ) : (
                                <input 
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={s.qtyOverride || ''}
                                  onChange={(e) => updateServiceEntry(index, 'qtyOverride', e.target.value)}
                                  placeholder={String(effectiveQty)}
                                  className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1 py-0.5 text-zinc-300 focus:border-brand-teal outline-none"
                                />
                              )}
                            </div>
                          </div>
                          
                          {isTravelOrTransport ? (
                             <div className="text-left md:text-right flex-1 md:ml-4">
                               <span className="inline-block px-2 py-1 bg-indigo-900/40 text-brand-teal rounded border border-brand-teal/30 text-xs">
                                 {isProviderTravel 
                                   ? 'Auto-calculated via roster gaps upon save.' 
                                   : 'Calculated post-shift via worker waypoints.'}
                               </span>
                             </div>
                          ) : (
                            <div className="text-left md:text-right">
                              <span className="text-zinc-500 text-xs block">Subtotal</span>
                              <span className="text-brand-teal font-medium">${subtotal.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center space-x-2 mt-auto">
            <div className="text-lg font-medium text-white mb-4">
              Total Amount: <span className="text-brand-teal">${servicesData.reduce((acc, s) => {
                const { rate, unit, name } = getServiceDetails(s.serviceId);
                const isProviderTravel = name.toLowerCase().includes('provider travel');
                const isABT = name.toLowerCase().includes('activity based transport');
                if (isProviderTravel || isABT) return acc;
                const effectiveQty = s.qtyOverride !== undefined && s.qtyOverride !== '' ? Number(s.qtyOverride) : (unit === 'Hour' ? shiftHours : 1);
                return acc + (effectiveQty * rate);
              }, 0).toFixed(2)}</span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors"
              >
                Save Shift{servicesData.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

