import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';

interface AddRespiteBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  staffList: any[];
  clientList: any[];
  servicesList: any[];
  initialData?: any;
}

interface StaffShiftEntry {
  staffId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface ServiceFormEntry {
  serviceId: string;
  billingDate: string;
  staffShifts: StaffShiftEntry[];
}

export default function AddRespiteBookingModal({ isOpen, onClose, onSave, staffList, clientList, servicesList, initialData }: AddRespiteBookingModalProps) {
  const { token } = useAuth();
  
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [servicesData, setServicesData] = useState<ServiceFormEntry[]>([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setClientId(String(initialData.client_id || ''));
        setNotes(initialData.notes || '');
        
        if (initialData.shifts && initialData.shifts.length > 0) {
            const rawData: ServiceFormEntry[] = initialData.shifts.map((s: any) => {
               const sSt = new Date(s.start_time);
               const sEd = new Date(s.end_time);
               return {
                 serviceId: String(s.service_id),
                 billingDate: sSt.toLocaleDateString('en-CA'),
                 staffShifts: [{
                   staffId: String(s.staff_id),
                   startDate: sSt.toLocaleDateString('en-CA'),
                   endDate: sEd.toLocaleDateString('en-CA'),
                   startTime: sSt.toTimeString().slice(0, 5),
                   endTime: sEd.toTimeString().slice(0, 5)
                 }]
               }
            });
            const groupedData = rawData.reduce((acc, curr) => {
                const existing = acc.find(a => a.serviceId === curr.serviceId && a.billingDate === curr.billingDate);
                if (existing) {
                    existing.staffShifts.push(curr.staffShifts[0]);
                } else {
                    acc.push(curr);
                }
                return acc;
            }, [] as ServiceFormEntry[]);
            setServicesData(groupedData);
        } else {
            setServicesData([{ serviceId: '', billingDate: '', staffShifts: [] }]);
        }
      } else {
        setClientId('');
        setNotes('');
        setServicesData([{ serviceId: '', billingDate: '', staffShifts: [] }]);
      }
    }
  }, [isOpen, initialData]);

  const getServiceDetails = (serviceId: string) => {
    const service = servicesList.find(x => String(x.id) === serviceId);
    if (!service) return { rate: 0, unit: 'Hour' };
    
    let baseRate = Number(service.rate);
    return { rate: baseRate, unit: service.unit || 'Hour' };
  };

  const selectedClient = useMemo(() => {
    return clientList.find(c => String(c.id) === clientId);
  }, [clientId, clientList]);

  const clientPersonalisedServices = useMemo(() => {
    if (!selectedClient || !selectedClient.service_ids || selectedClient.service_ids.length === 0) {
      return servicesList; // fallback to all
    }
    const selectedServiceIds = servicesData.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return servicesList.filter(s => selectedClient.service_ids.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [selectedClient, servicesList, servicesData]);

  if (!isOpen) return null;

  const handleAddServiceEntry = () => {
    setServicesData(prev => [...prev, { serviceId: '', billingDate: '', staffShifts: [] }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!clientId) {
      setFormError("Please select a client.");
      return;
    }

    if (servicesData.length === 0) {
      setFormError("Please add at least one service.");
      return;
    }

    let minTime = Number.MAX_SAFE_INTEGER;
    let maxTime = Number.MIN_SAFE_INTEGER;

    const intervals: {start: number, end: number}[] = [];

    for (const s of servicesData) {
      if (!s.serviceId || !s.billingDate || s.staffShifts.length === 0) {
        setFormError("Please ensure all service entries have a service, billing date, and assigned staff.");
        return;
      }
      for (const ss of s.staffShifts) {
        if (!ss.startDate || !ss.endDate || !ss.startTime || !ss.endTime) {
          setFormError("Please ensure all staff shifts have start and end dates/times.");
          return;
        }
        const st = new Date(`${ss.startDate}T${ss.startTime}:00`).getTime();
        const ed = new Date(`${ss.endDate}T${ss.endTime}:00`).getTime();
        
        if (ed <= st) {
           setFormError("Staff shift end time must be after the start time.");
           return;
        }

        intervals.push({ start: st, end: ed });

        if (st < minTime) minTime = st;
        if (ed > maxTime) maxTime = ed;
      }
    }

    if (intervals.length === 0) {
        setFormError("Please ensure at least one staff shift is provided.");
        return;
    }

    // Sort intervals by start time
    intervals.sort((a, b) => a.start - b.start);

    // Merge overlapping/contiguous intervals
    const merged: {start: number, end: number}[] = [Object.assign({}, intervals[0])];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const curr = intervals[i];
        if (curr.start <= last.end) {
            last.end = Math.max(last.end, curr.end);
        } else {
            merged.push(Object.assign({}, curr));
        }
    }

    if (merged.length > 1) {
        setFormError("There is a gap in staff coverage. Please ensure the staff shifts cover the entire period continuously.");
        return;
    }

    const totalHours = (merged[0].end - merged[0].start) / (1000 * 60 * 60);
    const expectedHours = servicesData.length * 24;

    if (totalHours !== expectedHours) {
        setFormError(`The total staff coverage is ${totalHours} hours, but expected ${expectedHours} hours for ${servicesData.length} STA/Respite day(s). Please adjust shifts to equal ${expectedHours} hours total.`);
        return;
    }

    try {
      const globalStart = new Date(minTime);
      const globalEnd = new Date(maxTime);

      const formattedServices = servicesData.map(s => {
          return {
              serviceId: parseInt(s.serviceId),
              staffShifts: s.staffShifts.map(ss => {
                const sSt = new Date(`${ss.startDate}T${ss.startTime}:00`);
                const sEd = new Date(`${ss.endDate}T${ss.endTime}:00`);
                return {
                   staffId: parseInt(ss.staffId),
                   startTime: sSt.toISOString(),
                   endTime: sEd.toISOString(),
                }
              })
          }
      });

      const bodyData = {
          clientId: parseInt(clientId),
          startTime: globalStart.toISOString(),
          endTime: globalEnd.toISOString(),
          notes,
          servicesData: formattedServices
      };

      const url = initialData?.id ? `/api/respite-bookings/${initialData.id}` : '/api/respite-bookings';
      const method = initialData?.id ? 'PUT' : 'POST';

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
      } else {
        const err = await res.json();
        setFormError(`Failed to save respite booking: ` + err.error);
      }
    } catch (err) {
      console.error(err);
      setFormError("An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    // Removed window.confirm for iframe compatibility
    
    setFormError('');
    try {
      const res = await fetch(`/api/respite-bookings/${initialData.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        onSave();
        onClose();
      } else {
        const err = await res.json();
        setFormError(`Error deleting booking: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      setFormError("An error occurred");
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // background clicked
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={handleBackgroundClick}>
      <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden max-w-[1200px] w-full text-zinc-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-4">Add STA / Respite Booking</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {formError && (
            <div className="mx-6 mt-4 mb-2 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm whitespace-pre-wrap">
              {formError}
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4 lg:p-4 lg:pt-0">
            
              <div className="md:w-[320px] shrink-0 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Client *</label>
                <select 
                  required
                  value={clientId}
                  onChange={e => {
                    setClientId(e.target.value);
                    setServicesData([{ serviceId: '', billingDate: '', staffShifts: [] }]);
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                >
                  <option value="">Select Client</option>
                  {clientList.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Notes</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                  placeholder="Optional notes for booking..."
                />
              </div>
            </div>

            <div className="flex-1 border-t md:border-t-0 md:border-l border-white/[0.08] md:pl-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">Services for Booking</h3>
                <button 
                  type="button"
                  onClick={handleAddServiceEntry}
                  className="text-xs flex items-center px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Service
                </button>
              </div>

              <div className="space-y-4">
                {servicesData.map((s, index) => {
                  const { rate, unit } = getServiceDetails(s.serviceId);
                  
                  const subtotal = rate * 1; // 1 per booking day

                  const handleBillingDateChange = (val: string) => {
                     const copy = [...servicesData];
                     copy[index].billingDate = val;
                     // Auto-populate all staff shifts to default to this date if they are empty
                     copy[index].staffShifts = copy[index].staffShifts.map(st => {
                        if (!st.startDate) st.startDate = val;
                        if (!st.endDate) st.endDate = val;
                        return st;
                     });
                     setServicesData(copy);
                  };

                  const handleToggleStaff = (staffId: string) => {
                     const copy = [...servicesData];
                     const exists = copy[index].staffShifts.findIndex(ss => ss.staffId === staffId);
                     if (exists >= 0) {
                         copy[index].staffShifts.splice(exists, 1);
                     } else {
                         copy[index].staffShifts.push({
                            staffId,
                            startDate: copy[index].billingDate,
                            endDate: copy[index].billingDate,
                            startTime: '00:00',
                            endTime: '23:59'
                         });
                     }
                     setServicesData(copy);
                  };

                  const updateStaffShift = (staffIndex: number, field: keyof StaffShiftEntry, val: string) => {
                     const copy = [...servicesData];
                     copy[index].staffShifts[staffIndex] = { ...copy[index].staffShifts[staffIndex], [field]: val };
                     setServicesData(copy);
                  };
                  
                  return (
                    <div key={index} className="bg-[#09090b] p-4 rounded-md border border-white/[0.08] relative flex flex-col gap-4">
                      {servicesData.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceEntry(index)}
                          className="absolute right-4 top-4 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="w-full pr-8">
                        <label className="text-xs text-zinc-500 mb-1 block">Service</label>
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
                      </div>

                      <div className="w-full">
                         <label className="text-xs text-zinc-500 mb-1 block">Date of Service (Billable Date)</label>
                         <CustomDatePicker 
                            
                            required
                            value={s.billingDate}
                            onChange={(e) => handleBillingDateChange(e.target.value)}
                            className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                         />
                      </div>

                      <div className="w-full">
                         <label className="text-xs text-zinc-500 mb-1 block">Staff Member(s)</label>
                         <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                            {staffList.map(staff => {
                               const isSelected = s.staffShifts.some(ss => ss.staffId === String(staff.id));
                               return (
                               <label key={staff.id} className={`text-xs px-3 py-1.5 rounded cursor-pointer border ${isSelected ? 'bg-brand-blue border-brand-teal text-white' : 'bg-[#121214] border-white/[0.12] text-zinc-400 hover:border-zinc-500'}`}>
                                  <input type="checkbox" className="hidden" checked={isSelected}
                                    onChange={() => handleToggleStaff(String(staff.id))}
                                  />
                                  {staff.first_name || staff.firstName}
                               </label>
                               );
                            })}
                         </div>
                      </div>

                      {s.staffShifts.length > 0 && (
                          <div className="flex flex-col gap-3 mt-2">
                             {s.staffShifts.map((ss, stIdx) => {
                                const staffDetails = staffList.find(st => String(st.id) === ss.staffId);
                                return (
                                 <div key={stIdx} className="p-3 bg-[#121214]/50 border border-white/[0.08] rounded-md">
                                    <div className="text-xs font-semibold text-zinc-300 mb-2">{staffDetails?.first_name} {staffDetails?.last_name}</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Start Date & Time</label>
                                        <div className="flex gap-1">
                                           <CustomDatePicker  required value={ss.startDate} onChange={(e) => updateStaffShift(stIdx, 'startDate', e.target.value)} className="w-1/2 bg-[#121214] border border-white/[0.12] rounded p-1 text-xs text-white" />
                                           <input type="time" required value={ss.startTime} onChange={(e) => updateStaffShift(stIdx, 'startTime', e.target.value)} className="w-1/2 bg-[#121214] border border-white/[0.12] rounded p-1 text-xs text-white" />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase text-zinc-500 mb-1 block">End Date & Time</label>
                                        <div className="flex gap-1">
                                           <CustomDatePicker  required value={ss.endDate} onChange={(e) => updateStaffShift(stIdx, 'endDate', e.target.value)} className="w-1/2 bg-[#121214] border border-white/[0.12] rounded p-1 text-xs text-white" />
                                           <input type="time" required value={ss.endTime} onChange={(e) => updateStaffShift(stIdx, 'endTime', e.target.value)} className="w-1/2 bg-[#121214] border border-white/[0.12] rounded p-1 text-xs text-white" />
                                        </div>
                                      </div>
                                    </div>
                                 </div>
                                );
                             })}
                          </div>
                      )}
                      
                      {s.serviceId && (
                        <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-zinc-500 text-[10px] block uppercase">Unit</span>
                              <span className="text-zinc-300 text-xs">{unit}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[10px] block uppercase">Rate</span>
                              <span className="text-zinc-300 text-xs">${rate.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[10px] block uppercase">Qty</span>
                              <span className="text-zinc-300 text-xs">1.00</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 text-[10px] block uppercase">Subtotal</span>
                            <span className="text-brand-teal font-medium text-xs">${subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center space-x-2 mt-auto">
            {initialData?.id && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto"
              >
                Delete
              </button>
            )}
            <div className={`flex space-x-2 w-full ${initialData?.id ? 'justify-end' : 'justify-end'}`}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto"
              >
                Save STA / Respite Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
