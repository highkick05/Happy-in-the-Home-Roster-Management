import { useDropzone } from 'react-dropzone';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, CheckCircle, Eye, Trash2, Undo, Send, DollarSign, AlertCircle, X, Upload } from 'lucide-react';
import InvoicePreviewModal from './InvoicePreviewModal';
import { RefreshCw, Search } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function ManualInvoiceForm({ token, onGenerated, onClose }: { token: string | null, onGenerated: () => void, onClose: () => void }) {
  const { settings } = useAuth();
  const [formData, setFormData] = useState({
    clientId: '',
    staffId: '',
    customStaffName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    gstType: 'GST Free'
  });
  
  const [selectedServices, setSelectedServices] = useState<{ 
    serviceId: string; 
    qtyOverride: string; 
    rateOverride: string;
    isCustom?: boolean;
    customName?: string;
    customUnit?: string;
    customRate?: string;
  }[]>([
    { serviceId: '', qtyOverride: '', rateOverride: '' }
  ]);
  
  const [options, setOptions] = useState<{ clients: any[], staff: any[], services: any[] }>({ clients: [], staff: [], services: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = React.useMemo(() => {
    return options.clients.find(c => String(c.id) === formData.clientId);
  }, [formData.clientId, options.clients]);

  const clientPersonalisedServices = React.useMemo(() => {
    if (!selectedClient || !selectedClient.service_ids || selectedClient.service_ids.length === 0) {
      return options.services;
    }
    const selectedServiceIds = selectedServices.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return options.services.filter(s => selectedClient.service_ids.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [selectedClient, options.services, selectedServices]);


;

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/invoices/form-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOptions(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setSelectedServices([...selectedServices, { serviceId: '', qtyOverride: '', rateOverride: '' }]);
  };

  const addCustomService = () => {
    const customId = `custom-${Date.now()}`;
    setSelectedServices([
      ...selectedServices,
      {
        serviceId: customId,
        qtyOverride: '1',
        rateOverride: '0.00',
        isCustom: true,
        customName: '',
        customUnit: 'Hour',
        customRate: '0.00'
      }
    ]);
  };

  const getServiceDetails = (serviceId: string) => {
    if (serviceId && String(serviceId).startsWith('custom-')) {
      const match = selectedServices.find(s => s.serviceId === serviceId);
      if (match) {
        return {
          rate: Number(match.customRate || 0),
          unit: match.customUnit || 'Hour',
          name: match.customName || 'Custom Service'
        };
      }
    }
    const service = options.services.find(x => String(x.id) === serviceId);
    if (!service) return { rate: 0, unit: 'Hour', name: '' };
    
    // 1. Check custom rate for this client first
    if (selectedClient && selectedClient.custom_rates && selectedClient.custom_rates[service.id] !== undefined) {
      return {
        rate: Number(selectedClient.custom_rates[service.id]),
        unit: service.unit,
        name: service.name
      };
    }

    let baseRate = Number(service.rate || 0);
    let dayOfWeek = -1;
    if (formData.date) {
      dayOfWeek = new Date(formData.date).getDay();
    }

    // 2. Resolve Weekend / Weekday rates from rates_json
    if (service.rates_json) {
      try {
        const rates = JSON.parse(service.rates_json || '{}');
        if (dayOfWeek === 0 && rates['Sunday']) {
          baseRate = Number(rates['Sunday']);
        } else if (dayOfWeek === 6 && rates['Saturday']) {
          baseRate = Number(rates['Saturday']);
        } else if (rates['Weekday']) {
          baseRate = Number(rates['Weekday']);
        } else if (rates['Hourly Rate']) {
          baseRate = Number(rates['Hourly Rate']);
        } else if (rates['Standard']) {
          baseRate = Number(rates['Standard']);
        }
      } catch (e) {
        // Fall back to baseRate
      }
    } else if (service.type === 'HOME_CARE' && service.rate) {
      try {
        const rates = JSON.parse(service.rate || '{}');
        if (dayOfWeek === 0 && rates['Sunday']) {
          baseRate = Number(rates['Sunday']);
        } else if (dayOfWeek === 6 && rates['Saturday']) {
          baseRate = Number(rates['Saturday']);
        } else {
          baseRate = Number(rates['Weekday'] || rates['Hourly Rate'] || rates['Standard'] || 0);
        }
      } catch (e) {
         // keep baseRate if parsing fails
      }
    }
    
    return {
      rate: baseRate,
      unit: service.unit,
      name: service.name
    };
  };

  const shiftHours = React.useMemo(() => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`2000-01-01T${formData.startTime}`);
    const end = new Date(`2000-01-01T${formData.endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  }, [formData.startTime, formData.endTime]);

  const removeService = (index: number) => {
    if (selectedServices.length === 1) return;
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string) => {
    const fresh = [...selectedServices];
    (fresh[index] as any)[field] = value;
    setSelectedServices(fresh);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validServices = selectedServices.filter(s => s.serviceId);
    if (validServices.length === 0) {
      alert("Please select or create at least one service item.");
      return;
    }

    const invalidCustom = validServices.find(s => s.isCustom && !s.customName?.trim());
    if (invalidCustom) {
      alert("Please specify a service name for each custom service item.");
      return;
    }

    if (formData.staffId === 'custom' && !formData.customStaffName.trim()) {
      alert("Please enter a custom staff member name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices/manual', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          services: validServices
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        onGenerated();
        onClose();
      } else {
        alert(data.error || 'Failed to generate');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading form options...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client</label>
          <select
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none"
            value={formData.clientId}
            onChange={e => {
              setFormData({ ...formData, clientId: e.target.value });
              setSelectedServices([{ serviceId: '', qtyOverride: '', rateOverride: '' }]);
            }}
          >
            <option value="">Select Client</option>
            {options.clients.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Staff Member</label>
          <select
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none"
            value={formData.staffId}
            onChange={e => setFormData({ ...formData, staffId: e.target.value })}
          >
            <option value="">Select Staff</option>
            <option value="custom">-- Custom Staff Member Name --</option>
            {options.staff.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
            ))}
          </select>
          {formData.staffId === 'custom' && (
            <input
              type="text"
              required
              placeholder="Enter Custom Staff Name (e.g. John Doe)"
              className="mt-1.5 w-full bg-[#121214] border border-white/[0.08] rounded-md py-1.5 px-3 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none"
              value={formData.customStaffName}
              onChange={e => setFormData({ ...formData, customStaffName: e.target.value })}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date</label>
          <CustomDatePicker
            position="bottom"
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time</label>
          <CustomTimePicker
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.startTime}
            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Time</label>
          <CustomTimePicker
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.endTime}
            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GST Configuration</label>
          <select
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.gstType}
            onChange={e => setFormData({ ...formData, gstType: e.target.value })}
          >
            <option value="GST Free">GST Free</option>
            <option value="10%">GST (10%)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center flex-row">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Services / Items</label>
            {formData.clientId && options.clients.find(c => c.id === Number(formData.clientId))?.service_ids?.length === 0 && (
              <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">All services shown (no personalised ones set)</span>
            )}
          </div>
          <div className="flex space-x-2">
            <button 
              type="button" 
              onClick={addService}
              className="text-[10px] text-brand-teal hover:text-brand-teal font-bold uppercase tracking-widest flex items-center bg-brand-teal/5 hover:bg-brand-teal/10 px-2 py-1 rounded border border-brand-teal/10 transition-all"
            >
              <span className="text-base mr-1">+</span> Add Service item
            </button>
            <button 
              type="button" 
              onClick={addCustomService}
              className="text-[10px] text-brand-teal hover:text-brand-teal font-bold uppercase tracking-widest flex items-center bg-brand-teal/5 hover:bg-brand-teal/10 px-2 py-1 rounded border border-brand-teal/10 transition-all"
            >
              <span className="text-base mr-1">+</span> Create Service item
            </button>
          </div>
        </div>
        
        <div className="space-y-2 pb-2">
          {selectedServices.map((row, idx) => {
            let { rate, unit, name } = getServiceDetails(row.serviceId);
            if (row.rateOverride !== undefined && row.rateOverride !== null && row.rateOverride !== '') {
               rate = Number(row.rateOverride);
            }
            
            const isProviderTravel = name?.toLowerCase().includes('provider travel') || false;
            const isABT = name?.toLowerCase().includes('activity based transport') || false;
            const isTravelOrTransport = isProviderTravel || isABT;
            
            let effectiveQty = 0;
            if (row.qtyOverride !== undefined && row.qtyOverride !== '') {
              effectiveQty = Number(row.qtyOverride);
            } else {
              effectiveQty = isTravelOrTransport ? 0 : (unit === 'Hour' ? shiftHours : 1);
            }
            const subtotal = effectiveQty * rate;

            const isCustom = row.isCustom;
            return (
              <div key={idx} className="relative w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">
                    {isCustom ? "🔧 Custom (One-Off) Service item" : "📋 Catalog Service selection"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => removeService(idx)}
                    className="p-1 px-2.5 rounded bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-500/10 hover:border-red-500/30 text-[11px] font-medium transition-colors"
                    title="Remove Item"
                  >
                    Remove
                  </button>
                </div>

                {isCustom ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-500 font-medium">Service Name</span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Occupational Therapy sessions"
                          value={row.customName || ''}
                          onChange={e => updateService(idx, 'customName', e.target.value)}
                          className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <span className="text-[11px] text-zinc-500 font-medium font-sans">Unit</span>
                          <select
                            required
                            value={row.customUnit || 'Hour'}
                            onChange={e => {
                              updateService(idx, 'customUnit', e.target.value);
                            }}
                            className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none"
                          >
                            <option value="Hour">Hour</option>
                            <option value="Kilometre">Kilometre</option>
                            <option value="Standard">Standard</option>
                            <option value="Each">Each</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-zinc-500 font-medium">Rate $</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={row.customRate || ''}
                            onChange={e => {
                              updateService(idx, 'customRate', e.target.value);
                              updateService(idx, 'rateOverride', e.target.value);
                            }}
                            className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-zinc-500 font-medium">Qty</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            placeholder="1"
                            value={row.qtyOverride || ''}
                            onChange={e => updateService(idx, 'qtyOverride', e.target.value)}
                            className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-1">
                      <div className="text-right flex items-center bg-brand-teal/5 px-2 py-1 rounded border border-brand-teal/20 text-xs text-zinc-300">
                        <span className="text-zinc-500 text-[10px] font-medium mr-2">SUBTOTAL</span>
                        <span className="text-brand-teal font-bold font-mono">
                          ${(Number(row.customRate || 0) * Number(row.qtyOverride || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <select
                          required
                          className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none truncate"
                          value={row.serviceId}
                          onChange={e => updateService(idx, 'serviceId', e.target.value)}
                        >
                          <option value="">Select Service</option>
                          {clientPersonalisedServices.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {row.serviceId && (
                      <div className="flex md:items-center justify-between text-[11px] bg-[#09090b]/50 p-1.5 rounded border border-white/[0.08]/50 mt-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <span className="text-zinc-500 font-medium mr-1.5">Unit</span>
                            <span className="text-zinc-300">{unit}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-zinc-500 font-medium mr-1.5">Rate $</span>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.rateOverride || ''}
                              onChange={(e) => updateService(idx, 'rateOverride', e.target.value)}
                              placeholder={rate.toFixed(2)}
                              className="w-20 bg-[#09090b] border border-white/[0.12] rounded px-1 py-0.5 text-zinc-300 focus:border-brand-teal outline-none"
                            />
                          </div>
                          <div className="flex items-center">
                            <span className="text-zinc-500 font-medium mr-1.5">Qty</span>
                            {unit === 'Hour' && !isTravelOrTransport ? (
                              <span className="text-zinc-300">{effectiveQty.toFixed(2)}</span>
                            ) : (
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.qtyOverride}
                                onChange={(e) => updateService(idx, 'qtyOverride', e.target.value)}
                                placeholder={String(effectiveQty)}
                                className="w-14 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-0.5 text-zinc-300 focus:border-brand-teal outline-none"
                              />
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex items-center bg-indigo-500/10 px-2 py-0.5 rounded border border-brand-teal/20">
                          <span className="text-zinc-400 font-medium mr-2">SUBTOTAL</span>
                          <span className="text-brand-teal font-bold">${subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center space-x-3 mt-4">
        {(() => {
          const computedSubtotal = selectedServices.reduce((acc, s) => {
             let { rate, unit, name } = getServiceDetails(s.serviceId);
             if (s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== '') {
                rate = Number(s.rateOverride);
             }
             const isProviderTravel = name?.toLowerCase().includes('provider travel') || false;
             const isABT = name?.toLowerCase().includes('activity based transport') || false;
             const isTravelOrTransport = isProviderTravel || isABT;
             let effectiveQty = 0;
             if (s.qtyOverride !== undefined && s.qtyOverride !== '') {
               effectiveQty = Number(s.qtyOverride);
             } else {
               effectiveQty = isTravelOrTransport ? 0 : (unit === 'Hour' ? shiftHours : 1);
             }
             return acc + (effectiveQty * rate);
          }, 0);
          
          const computedGst = formData.gstType === '10%' ? computedSubtotal * 0.1 : 0;
          const computedTotal = computedSubtotal + computedGst;

          return (
            <div className="flex flex-col text-white text-sm font-medium">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 w-48">
                <span>Subtotal:</span>
                <span className="font-mono">${computedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 w-48">
                <span>GST:</span>
                <span className="font-mono">${computedGst.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between w-48 pt-1 border-t border-white/[0.08]">
                <span>Total:</span>
                <span className="text-brand-teal font-mono">${computedTotal.toFixed(2)}</span>
              </div>
            </div>
          );
        })()}
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
            disabled={submitting}
            className="px-4 py-2 bg-brand-blue hover:bg-brand-teal disabled:opacity-50 text-white text-sm font-bold rounded-md transition-all shadow-lg flex items-center"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

import QuotesView from './QuotesView';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';


function HistoricalDropzone({ uploadFile, setUploadFile }: { uploadFile: File | null, setUploadFile: (f: File | null) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setUploadFile(acceptedFiles[0]);
      }
    }
  });

  return (
    <div 
      {...getRootProps()}
      className={`w-full bg-black/40 border-2 border-dashed ${isDragActive ? 'border-brand-teal bg-brand-teal/10' : 'border-white/[0.08] hover:border-white/20'} rounded-lg p-12 flex flex-col items-center justify-center transition-colors cursor-pointer`}
    >
      <input {...getInputProps()} required={!uploadFile} />
      <div className="flex flex-col items-center space-y-3 pointer-events-none">
        <FileText className={`w-10 h-10 ${uploadFile ? 'text-brand-teal' : 'text-zinc-500'}`} />
        {uploadFile ? (
          <span className="text-[14px] text-brand-teal font-medium text-center">{uploadFile.name}</span>
        ) : (
          <>
            <span className="text-[14px] text-zinc-300 font-medium">Click or drag PDF here</span>
            <span className="text-[12px] text-zinc-500">Maximum file size 10MB</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function InvoicingView() {
  const { token, user } = useAuth();
  const [tab, setTab] = useLocalStorage<'invoices' | 'quotes'>('invoicing_tab', 'invoices');
  const [subTab, setSubTab] = useLocalStorage<'active' | 'sent' | 'paid'>('invoicing_sub_tab', 'active');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewShiftId, setPreviewShiftId] = useState<number | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<number | null>(null);

  const [filterClient, setFilterClient] = useLocalStorage('invoicing_filter_client', '');
  const [filterStaff, setFilterStaff] = useLocalStorage('invoicing_filter_staff', '');
  const [showManualModal, setShowManualModal] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadDate, setUploadDate] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const [allDbClients, setAllDbClients] = useState<any[]>([]);
  const [allDbStaff, setAllDbStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch('/api/invoices/form-data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllDbClients(data.clients || []);
          setAllDbStaff(data.staff || []);
        }
      } catch (e) {
        console.error('Failed to fetch dropdown options:', e);
      }
    };
    if (token) {
      fetchOptions();
    }
  }, [token]);

  const clientsList = Array.from(new Set([
    ...allDbClients.map(c => `${c.first_name || ''} ${c.last_name || ''}`.trim()),
    ...invoices.map(i => `${i.client_first_name || ''} ${i.client_last_name || ''}`.trim())
  ])).filter(Boolean).sort();

  const staffList = Array.from(new Set([
    ...allDbStaff.map(s => `${s.first_name || ''} ${s.last_name || ''}`.trim()),
    ...invoices.map(i => `${i.staff_first_name || ''} ${i.staff_last_name || ''}`.trim())
  ])).filter(Boolean).sort();

  const getFallbackInvoiceNumber = (i: any) => {
    if (i.invoice_number) return i.invoice_number;
    const date = new Date(i.start_time || i.created_at);
    const yyyymmdd = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    return `INV-${yyyymmdd}-${String(i.shift_id || i.id).padStart(4, '0')}`;
  };

  useEffect(() => {
    if (!loading && allDbClients.length > 0) {
      if (filterClient && !clientsList.includes(filterClient)) {
        setFilterClient('');
      }
      if (filterStaff && !staffList.includes(filterStaff)) {
        setFilterStaff('');
      }
    }
  }, [loading, allDbClients, allDbStaff, filterClient, filterStaff, clientsList, staffList, setFilterClient, setFilterStaff]);

  const currentTabInvoices = invoices.filter(i => {
    if (subTab === 'paid') return i.status === 'PAID';
    if (subTab === 'sent') return i.status === 'SENT';
    return i.status !== 'PAID' && i.status !== 'SENT' && i.status !== 'VOID';
  });

  const filteredInvoices = currentTabInvoices.filter(i => {
    const clientName = `${i.client_first_name} ${i.client_last_name}`.trim();
    const staffName = `${i.staff_first_name || ''} ${i.staff_last_name || ''}`.trim();
    
    if (filterClient && clientName !== filterClient) return false;
    if (filterStaff && staffName !== filterStaff) return false;

    return true;
  });

  const totalAmount = filteredInvoices.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const averageAmount = filteredInvoices.length > 0 ? totalAmount / filteredInvoices.length : 0;
  const selectedCount = selectedInvoiceIds.length;
  const selectedAmount = invoices
    .filter(i => selectedInvoiceIds.includes(i.id))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadClientId || !uploadDate || !uploadFile) {
      alert("Please fill all fields and select a file.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('clientId', uploadClientId);
    formData.append('date', uploadDate);
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/invoices/historical', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload historical invoice');
      setShowUploadModal(false);
      setUploadClientId('');
      setUploadDate('');
      setUploadFile(null);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setIsUploading(false);
    }
  }

  const fetchInvoices = async () => {
    setLoading(true);
    setSelectedInvoiceIds([]);
    try {
      const res = await fetch('/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInvoices(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoiceById = async (invoiceId: number, filename: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/download-by-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `invoice-${invoiceId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Could not download invoice.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleInvoiceSelection = (id: number) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(invoiceId => invoiceId !== id) : [...prev, id]
    );
  };

  const toggleAllInvoices = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoiceIds([]);
    } else {
      if (filteredInvoices.length > 0) {
         const firstClient = filteredInvoices[0].client_id;
         const sameClientInvoices = filteredInvoices.filter(i => i.client_id === firstClient);
         setSelectedInvoiceIds(sameClientInvoices.map(i => i.id));
      }
    }
  };

  const handleMergeInvoices = async () => {
    if (selectedInvoiceIds.length < 2) {
      alert("Please select at least two invoices to merge.");
      return;
    }

    if (!confirm(`Are you sure you want to merge these ${selectedInvoiceIds.length} invoices into one? This cannot be undone.`)) {
      return;
    }

    // Check if they are all from the same client
    const firstInvoice = invoices.find(inv => inv.id === selectedInvoiceIds[0]);
    if (firstInvoice) {
      const clientId = firstInvoice.client_id;
      const allSameClient = selectedInvoiceIds.every(id => {
        const inv = invoices.find(i => i.id === id);
        return inv && inv.client_id === clientId;
      });
      if (!allSameClient) {
        alert("Cannot merge invoices from different clients.");
        return;
      }
    }


    setIsMerging(true);
    try {
      const res = await fetch('/api/invoices/merge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ invoiceIds: selectedInvoiceIds })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedInvoiceIds([]);
        fetchInvoices();
      } else {
        alert(data.error || 'Failed to merge invoices');
      }
    } catch (e) {
      console.error(e);
      alert('Network error merging invoices');
    } finally {
      setIsMerging(false);
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedInvoiceIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedInvoiceIds.length} invoices? Valid shifts will return to pending.`)) return;

    try {
      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoiceIds: selectedInvoiceIds })
      });
      if (res.ok) {
        setSelectedInvoiceIds([]);
        fetchInvoices();
      } else {
        alert('Failed to delete invoices');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice? The shift will return to pending.')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedInvoiceIds(prev => prev.filter(i => i !== id));
        fetchInvoices();
      } else {
        alert('Failed to delete invoice');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndoMerge = async (id: number) => {
    if (!confirm('Are you sure you want to undo this merge? The original invoices will be restored.')) return;
    try {
      const res = await fetch(`/api/invoices/undo-merge/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchInvoices();
      } else {
        alert('Failed to undo merge');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'GENERATED' | 'SENT' | 'PAID' | 'VOID') => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchInvoices();
      } else {
        alert('Failed to update status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-zinc-400">You do not have permission to view invoices.</div>;
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex border-b border-white/[0.08] justify-between items-center">
        <div className="flex space-x-6">
          <button 
            onClick={() => setTab('invoices')} 
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${tab === 'invoices' ? 'border-brand-teal text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Invoices
          </button>
          <button 
            onClick={() => setTab('quotes')} 
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${tab === 'quotes' ? 'border-brand-teal text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            Quotes
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg select-none mb-3">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] md:text-xs font-bold text-amber-500 tracking-wide uppercase">
            ANY EDITS TO INVOICES MUST BE DONE THROUGH
          </span>
          <span className="inline-flex items-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] md:text-[11px] font-bold tracking-wider uppercase">
            ROSTER &gt; SHIFT DETAILS &gt; EDIT SHIFT
          </span>
        </div>
      </div>

      {tab === 'quotes' ? (
        <QuotesView />
      ) : (
        <div className="flex-1 flex flex-col space-y-4">
          
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-3xl w-full flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-white tracking-tight">Upload Historical Invoice</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 bg-[#09090b]">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Client</label>
                <select
                  required
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                >
                  <option value="">Select Client</option>
                  {allDbClients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Historical Date</label>
                <input
                  type="date"
                  required
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Invoice PDF</label>
                <HistoricalDropzone uploadFile={uploadFile} setUploadFile={setUploadFile} />
              </div>
              <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-[13px] font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{showManualModal && (
        <div className="fixed inset-0 z-[60] flex justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto custom-scrollbar" onClick={() => setShowManualModal(false)}>
          <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-fit my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg shrink-0">
              <div>
                <h3 className="text-lg font-medium text-[#E6EDF3] mb-4">Manual Invoice Generation</h3>
                <p className="text-sm text-[#8B949E] mt-1">Configure service and timing details for a standalone invoice.</p>
              </div>
              <button 
                onClick={() => setShowManualModal(false)}
                className="w-10 h-10 flex items-center justify-center bg-brand-navy border border-border-subtle hover:border-brand-blue rounded-md text-[#E6EDF3] transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-visible flex-1">
              <ManualInvoiceForm 
                token={token} 
                onGenerated={() => fetchInvoices()} 
                onClose={() => setShowManualModal(false)} 
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
          <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-6 md:mb-0">Invoices</h2>
          <div className="flex bg-brand-navy rounded border border-border-subtle p-0.5">
            <button
              onClick={() => setSubTab('active')}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${subTab === 'active' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            >
              Active
            </button>
            <button
              onClick={() => setSubTab('sent')}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${subTab === 'sent' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            >
              Sent
            </button>
            <button
              onClick={() => setSubTab('paid')}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${subTab === 'paid' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            >
              Paid
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedInvoiceIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedInvoiceIds.length})
            </button>
          )}
          {selectedInvoiceIds.length > 1 && (
            <button
              onClick={handleMergeInvoices}
              disabled={isMerging}
              className="bg-gradient-to-r from-brand-teal to-brand-green text-white px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center shadow-sm whitespace-nowrap"
            >
              {isMerging ? 'Merging...' : `Merge (${selectedInvoiceIds.length})`}
            </button>
          )}
          
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="pl-3 pr-8 py-2 bg-brand-navy border border-border-subtle rounded-md text-sm text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-40 md:w-48 transition-colors"
          >
            <option value="">All Clients</option>
            {clientsList.map((client, idx) => (
              <option key={idx} value={client}>{client}</option>
            ))}
          </select>

          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="pl-3 pr-8 py-2 bg-brand-navy border border-border-subtle rounded-md text-sm text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-40 md:w-48 hidden sm:block transition-colors"
          >
            <option value="">All Staff</option>
            {staffList.map((staff, idx) => (
              <option key={idx} value={staff}>{staff}</option>
            ))}
          </select>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center px-4 py-2 bg-brand-navy hover:hover-bg border border-border-subtle hover:border-brand-blue text-[#E6EDF3] text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto"
          >
            Generate Invoice
          </button>
          {subTab === 'paid' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto whitespace-nowrap"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Historical
            </button>
          )}
          <div className="hidden md:flex text-[10px] border border-border-subtle bg-brand-navy text-[#8B949E] px-2 py-1 rounded items-center uppercase tracking-wider">
            <CheckCircle className="w-3 h-3 mr-1.5 text-brand-teal" />
            Auto-gen Active
          </div>
        </div>
      </div>

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto flex flex-col shadow-sm">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[#8B949E]">Loading invoices...</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10 transition-colors">
                  <th className="px-4 py-4 font-semibold w-12">
                    <input
                      type="checkbox"
                      className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy"
                      checked={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={toggleAllInvoices}
                    />
                  </th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Client</th>
                  <th className="px-4 py-4 font-semibold">Invoice ID</th>
                  <th className="px-4 py-4 font-semibold">Staff Member</th>
                  <th className="px-4 py-4 font-semibold">Amount</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredInvoices.map(i => {
                  const isChecked = selectedInvoiceIds.includes(i.id);
                  const firstSelected = invoices.find(inv => inv.id === selectedInvoiceIds[0]);
                  const isDisabled = firstSelected && firstSelected.client_id !== i.client_id && !isChecked;
                  
                  return (
                  <tr key={i.id} className={`transition-colors group ${i.status === 'SENT' ? 'bg-brand-green/10 hover:bg-brand-green/20' : 'hover:bg-brand-bg/50'} ${isDisabled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        disabled={!!isDisabled}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy disabled:opacity-50"
                        checked={isChecked}
                        onChange={() => toggleInvoiceSelection(i.id)}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-[#E6EDF3]">
                      {(() => {
                        const d = new Date(i.start_time || i.created_at);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                      })()}
                    </td>
                    <td className="px-4 py-4 text-[#E6EDF3]">
                      {i.client_first_name} {i.client_last_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">
                      {getFallbackInvoiceNumber(i)}
                    </td>
                    <td className="px-4 py-4 text-[#E6EDF3]">
                      {i.staff_first_name ? `${i.staff_first_name} ${i.staff_last_name}` : <span className="text-[#8B949E]">N/A</span>}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#E6EDF3]">
                      ${Number(i.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        i.status === 'PAID' ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 
                        'bg-brand-bg text-[#8B949E] border border-border-subtle'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right flex items-center justify-end space-x-1">
                       {subTab === 'active' && (
                         <button
                           title="Lock & Send"
                           onClick={() => handleUpdateStatus(i.id, 'SENT')}
                           className="p-1.5 text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors"
                         >
                           <Send className="w-4 h-4" />
                         </button>
                       )}
                       {subTab === 'sent' && (
                         <>
                           <button
                             title="Mark as Paid"
                             onClick={() => handleUpdateStatus(i.id, 'PAID')}
                             className="p-1.5 text-zinc-400 hover:text-brand-green hover:bg-brand-green/10 rounded-md transition-colors"
                           >
                             <DollarSign className="w-4 h-4" />
                           </button>
                           <button
                             title="Mark as Active"
                             onClick={() => handleUpdateStatus(i.id, 'GENERATED')}
                             className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                           >
                             <Undo className="w-4 h-4" />
                           </button>
                         </>
                       )}
                       {subTab === 'paid' && (
                         <>
                           <button
                             title="Mark as Unpaid"
                             onClick={() => handleUpdateStatus(i.id, 'GENERATED')}
                             className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                           >
                             <Undo className="w-4 h-4" />
                           </button>
                           <button
                             title="Delete Invoice"
                             onClick={() => handleDeleteSingle(i.id)}
                             className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </>
                       )}
                       {i.is_merged === 1 && i.status !== 'SENT' && i.status !== 'PAID' && (
                         <button
                           title="Undo Merge"
                           onClick={() => handleUndoMerge(i.id)}
                           className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                         >
                           <Undo className="w-4 h-4" />
                         </button>
                       )}
                       {(i.shift_id || i.services_json || i.is_merged) && (
                         <button
                           title="Preview Invoice"
                           onClick={() => { if (i.shift_id) { setPreviewShiftId(i.shift_id); } else { setPreviewInvoiceId(i.id); } }}
                           className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                         >
                           <Eye className="w-4 h-4" />
                         </button>
                       )}
                      {i.file_path ? (
                        <button 
                          title="Download PDF"
                          onClick={() => downloadInvoiceById(i.id, i.file_path)}
                          className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-md transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="p-1.5 w-7 text-transparent"><Download className="w-4 h-4" /></span>
                      )}
                      {i.status !== 'SENT' && i.status !== 'PAID' && (
                        <button
                          title="Delete Invoice"
                          onClick={() => handleDeleteSingle(i.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-[#121214] rounded-full border border-white/[0.08]">
                          <FileText className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div className="text-zinc-400">
                          {filterClient || filterStaff ? `No invoices matching filters.` : 'No invoices generated yet.'}
                        </div>
                        {!(filterClient || filterStaff) && <div className="text-xs text-zinc-500">Invoices are automatically created when shifts are marked COMPLETED.</div>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Statistics Footer */}
        <div className="border-t border-[#30363D] bg-brand-navy px-6 py-4 rounded-b-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm">
          {selectedCount > 0 ? (
            <div className="bg-brand-teal/10 border border-brand-teal/30 px-4 py-2 rounded-lg flex items-center space-x-3 text-brand-teal self-start sm:self-center">
              <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              <div className="flex flex-col text-xs sm:text-sm">
                <span className="font-semibold">{selectedCount} Selected</span>
                <span className="text-zinc-400 text-xs mt-0.5">Total Value: ${selectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex flex-wrap items-center justify-end gap-6 w-full sm:w-auto">
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Total Invoices</span>
              <span className="text-base sm:text-lg font-semibold text-[#E6EDF3] mt-0.5">{filteredInvoices.length}</span>
            </div>
            <div className="h-8 w-[1px] bg-[#30363D] hidden sm:block" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-widest font-sans">Grand Total</span>
              <span className="text-base sm:text-lg font-bold text-brand-green mt-0.5">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="h-8 w-[1px] bg-[#30363D] hidden sm:block" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Average Value</span>
              <span className="text-base sm:text-lg font-semibold text-[#E6EDF3] mt-0.5">${averageAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
      
      {(previewShiftId || previewInvoiceId) && (
        <InvoicePreviewModal
          shiftId={previewShiftId} invoiceId={previewInvoiceId}
          onClose={() => { setPreviewShiftId(null); setPreviewInvoiceId(null); }}
        />
      )}
      </div>
      )}
    </div>
  );
}
