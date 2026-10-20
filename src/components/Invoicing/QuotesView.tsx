import { useDropzone } from 'react-dropzone';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, X, Upload, Copy, ChevronUp, ChevronDown, CheckCircle, Search, Trash2, Eye, Edit2 } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';
import QuotePreviewModal from './QuotePreviewModal';
import ServiceSearchDropdown, { isHomeCareService, isNdisService } from './ServiceSearchDropdown';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function GenerateQuoteForm({ token, onGenerated, onClose, editData }: { token: string | null, onGenerated: () => void, onClose: () => void, editData?: any }) {
  const { settings } = useAuth();
  
  const [formData, setFormData] = useState(() => {
    if (editData) {
      let gstType = 'GST Free';
      let endDate = '';
      try {
        const svcs = JSON.parse(editData.services_json || '[]');
        if (svcs.length > 0) {
           if (svcs[0].gstType) gstType = svcs[0].gstType;
           if (svcs[0].endDate) endDate = svcs[0].endDate;
        }
      } catch (e) {}

      let initialClientId = editData.client_id ? String(editData.client_id) : '';
      let initialCustomName = editData.custom_client_name || '';

      if (!initialClientId) {
        if (!initialCustomName || initialCustomName === 'Prospective Client') {
          initialClientId = 'prospective';
          initialCustomName = 'Prospective Client';
        } else {
          initialClientId = 'custom';
        }
      }

      return {
        clientId: initialClientId,
        customClientName: initialCustomName,
        activityName: editData.activity_name || '',
        date: editData.activity_date || new Date().toISOString().split('T')[0],
        endDate: endDate,
        quoteDate: editData.quote_date || new Date().toISOString().split('T')[0],
        importantNotes: editData.important_notes || '',
        gstType
      };
    }
    return {
      clientId: '',
      customClientName: '',
      activityName: '',
      date: new Date().toISOString().split('T')[0],
      endDate: '',
      quoteDate: new Date().toISOString().split('T')[0],
      importantNotes: '',
      gstType: 'GST Free'
    };
  });
  
  const [selectedServices, setSelectedServices] = useState<any[]>(() => {
    if (editData && editData.services_json) {
      try {
        const svcs = JSON.parse(editData.services_json);
        if (Array.isArray(svcs) && svcs.length > 0) {
          return svcs.map((s: any) => ({
            serviceId: String(s.serviceId || ''),
            qtyOverride: String(s.qtyOverride || ''),
            rateOverride: String(s.rateOverride || '')
          }));
        }
      } catch(e) {}
    }
    return [{ serviceId: '', qtyOverride: '', rateOverride: '' }];
  });
  
  const [options, setOptions] = useState<any>({ clients: [], services: [] });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fundingTypeFilter, setFundingTypeFilter] = useState<'ALL' | 'NDIS' | 'HOME_CARE'>('ALL');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/invoices/form-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      } else {
        console.error('Failed to fetch options:', await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = React.useMemo(() => {
    return (options.clients || []).find((c: any) => String(c.id) === String(formData.clientId));
  }, [formData.clientId, options.clients]);

  // Counts of NDIS and Home Care services
  const ndisCount = React.useMemo(() => {
    return (options.services || []).filter(isNdisService).length;
  }, [options.services]);

  const homeCareCount = React.useMemo(() => {
    return (options.services || []).filter(isHomeCareService).length;
  }, [options.services]);

  // Auto-sync funding type filter when a client with set funding_type is selected
  useEffect(() => {
    if (selectedClient && selectedClient.funding_type) {
      const ft = String(selectedClient.funding_type).toUpperCase();
      if (ft === 'NDIS') {
        setFundingTypeFilter('NDIS');
      } else if (ft.includes('HOME') || ft.includes('HCP')) {
        setFundingTypeFilter('HOME_CARE');
      }
    }
  }, [selectedClient]);

  const clientPersonalisedServices = React.useMemo(() => {
    if (!selectedClient) return options.services || [];
    if (!selectedClient.service_ids || selectedClient.service_ids.length === 0) {
      return options.services || [];
    }
    const selectedServiceIds = selectedServices.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return (options.services || []).filter((s: any) => selectedClient.service_ids.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [selectedClient, options.services, selectedServices]);

  const getServiceDetails = (serviceId: string) => {
    if (!serviceId) return { rate: 0, unit: '', name: '', code: '', type: '' };
    const s = options.services.find((x: any) => x.id === Number(serviceId));
    if (!s) return { rate: 0, unit: '', name: '', code: '', type: '' };

    // 1. Check custom rate for this client first
    if (selectedClient && selectedClient.custom_rates && selectedClient.custom_rates[s.id] !== undefined) {
      return {
        rate: Number(selectedClient.custom_rates[s.id]),
        unit: s.unit || 'hr',
        name: s.name,
        code: s.code || '',
        type: s.type || ''
      };
    }

    let baseRate = Number(s.rate || 0);
    let dayOfWeek = -1;
    if (formData.date) {
      dayOfWeek = new Date(formData.date).getDay();
    }

    // 2. Resolve Weekend / Weekday rates from rates_json
    if (s.rates_json) {
      try {
        const rates = JSON.parse(s.rates_json || '{}');
        if (isHomeCareService(s)) {
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
        } else if (isNdisService(s)) {
          const region = settings?.ndisRegion || 'NSW';
          if (rates[region] !== undefined) {
            baseRate = Number(rates[region]);
          } else if (rates['Standard']) {
            baseRate = Number(rates['Standard']);
          }
        } else {
          if (dayOfWeek === 0 && rates['Sunday']) baseRate = Number(rates['Sunday']);
          else if (dayOfWeek === 6 && rates['Saturday']) baseRate = Number(rates['Saturday']);
          else baseRate = Number(rates['Weekday'] || rates['Hourly Rate'] || rates['Standard'] || s.rate || 0);
        }
      } catch (e) {
        // Fall back to baseRate
      }
    }
    
    return {
      rate: baseRate,
      unit: s.unit || 'hr',
      name: s.name,
      code: s.code || '',
      type: s.type || ''
    };
  };

  const addService = () => {
    let nextDate = '';
    let nextStartTime = '';
    
    if (selectedServices.length > 0) {
      const last = selectedServices[selectedServices.length - 1];
      if (last.date) {
        if (last.endTime) {
          nextStartTime = last.endTime;
        }
        
        // If end time is midnight (00:00) or it crossed midnight (startTime > endTime)
        if (last.endTime === '00:00' || (last.startTime && last.endTime && last.startTime > last.endTime)) {
          const d = new Date(last.date);
          d.setDate(d.getDate() + 1);
          nextDate = d.toISOString().split('T')[0];
        } else {
          nextDate = last.date;
        }
      }
    }
    
    setSelectedServices([...selectedServices, { serviceId: '', qtyOverride: '', rateOverride: '', date: nextDate, startTime: nextStartTime }]);
  };
  const removeService = (index: number) => {
    if (selectedServices.length === 1) return;
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };
  const updateService = (index: number, field: any, value: string) => {
    const fresh = [...selectedServices];
    const row = fresh[index];
    row[field] = value;

    // Time/Duration calculations
    if (field === 'startTime' || field === 'duration' || field === 'endTime') {
      const start = row.startTime;
      const end = row.endTime;
      let dur = parseFloat(row.duration) || 0;

      if (field === 'startTime' && start && dur > 0) {
        // recalc end time
        const [h, m] = start.split(':').map(Number);
        const totalMin = h * 60 + m + Math.round(dur * 60);
        const eh = Math.floor(totalMin / 60) % 24;
        const em = totalMin % 60;
        row.endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        row.qtyOverride = dur.toString();
      } else if (field === 'duration' && start && dur >= 0) {
        // recalc end time
        const [h, m] = start.split(':').map(Number);
        const totalMin = h * 60 + m + Math.round(dur * 60);
        const eh = Math.floor(totalMin / 60) % 24;
        const em = totalMin % 60;
        row.endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        row.qtyOverride = dur.toString();
      } else if (field === 'endTime' && start && end) {
        // recalc duration
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        row.duration = (diff / 60).toFixed(2);
        row.qtyOverride = row.duration;
      }
    }
    
    setSelectedServices(fresh);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert("Please select a client or choose Prospective / Custom Client.");
      return;
    }
    if (formData.clientId === 'custom' && !formData.customClientName.trim()) {
      alert("Please enter a custom client name.");
      return;
    }
    const validServices = selectedServices.filter(s => s.serviceId);
    if (validServices.length === 0) {
      alert("Please select at least one service.");
      return;
    }
    setSubmitting(true);
    try {
      const isCustomOrProspective = formData.clientId === 'prospective' || formData.clientId === 'custom';
      const resolvedClientId = isCustomOrProspective ? null : formData.clientId;
      const resolvedCustomName = formData.clientId === 'custom' 
        ? formData.customClientName.trim() 
        : (formData.clientId === 'prospective' ? 'Prospective Client' : null);

      const url = editData ? `/api/quotes/${editData.id}` : '/api/quotes';
      const method = editData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          clientId: resolvedClientId,
          customClientName: resolvedCustomName,
          services: validServices
        })
      });
      if (res.ok) {
        onGenerated();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to generate');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading form options...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client</label>
          <select
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-xs"
            value={formData.clientId}
            onChange={e => {
              const val = e.target.value;
              let nextCustom = formData.customClientName;
              if (val === 'prospective') {
                nextCustom = 'Prospective Client';
              } else if (val === 'custom') {
                if (nextCustom === 'Prospective Client') nextCustom = '';
              } else {
                nextCustom = '';
              }
              setFormData({ ...formData, clientId: val, customClientName: nextCustom });
              setSelectedServices([{ serviceId: '', qtyOverride: '', rateOverride: '' }]);
            }}
          >
            <option value="">Select Client</option>
            <optgroup label="── Prospective / Enquiries ──">
              <option value="prospective">Prospective Client (Name Unknown / Enquiry)</option>
              <option value="custom">Custom Client Name...</option>
            </optgroup>
            <optgroup label="── Registered Clients ──">
              {options.clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quote Date</label>
          <CustomDatePicker
            position="bottom"
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.quoteDate}
            onChange={e => setFormData({ ...formData, quoteDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Date</label>
          <CustomDatePicker
            position="bottom"
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Date</label>
          <CustomDatePicker
            position="bottom"
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GST Config</label>
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

      {formData.clientId === 'custom' && (
        <div className="p-3 bg-brand-navy border border-brand-teal/40 rounded-lg space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-brand-teal uppercase tracking-wider flex items-center gap-1.5">
              <span>Custom Client Name</span>
              <span className="text-[10px] text-zinc-400 normal-case font-normal">(Prospective / Unenrolled Client)</span>
            </label>
            <span className="text-[11px] text-zinc-400">Will be printed on quote & PDF</span>
          </div>
          <input
            type="text"
            required
            placeholder="e.g. John Doe, Sarah Connor (Enquiry), or Smith Family"
            className="w-full bg-[#09090b] border border-white/[0.12] focus:border-brand-teal rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-sm placeholder-zinc-500"
            value={formData.customClientName}
            onChange={e => setFormData({ ...formData, customClientName: e.target.value })}
            autoFocus
          />
        </div>
      )}

      {formData.clientId === 'prospective' && (
        <div className="px-3 py-2 bg-brand-teal/10 border border-brand-teal/30 rounded-lg flex items-center justify-between text-xs text-brand-teal">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse"></span>
            <span>Quote will be addressed to: <strong className="text-white font-medium">Prospective Client</strong> (General Cost Enquiry)</span>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, clientId: 'custom', customClientName: '' })}
            className="text-[11px] text-brand-teal hover:text-white underline font-medium transition-colors cursor-pointer"
          >
            Enter specific name instead
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Service Activity Title</label>
        <input
          type="text"
          required
          placeholder="e.g. Kalbarri National Park & Skywalk Trip"
          className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-sm"
          value={formData.activityName}
          onChange={e => setFormData({ ...formData, activityName: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#09090b]/80 border border-white/[0.08] p-2.5 rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Line Items</span>
              <span className="text-[11px] text-zinc-500 font-normal">({selectedServices.length})</span>
            </label>

            {/* Funding Filter Switcher: All | NDIS | Home Care */}
            <div className="flex items-center gap-1 bg-[#121214] border border-white/[0.1] rounded-lg p-0.5">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold pl-2 pr-1">Funding:</span>
              <button
                type="button"
                onClick={() => setFundingTypeFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  fundingTypeFilter === 'ALL'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({options.services?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setFundingTypeFilter('NDIS')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  fundingTypeFilter === 'NDIS'
                    ? 'bg-sky-600/30 text-sky-200 border border-sky-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-sky-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                NDIS ({ndisCount})
              </button>
              <button
                type="button"
                onClick={() => setFundingTypeFilter('HOME_CARE')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  fundingTypeFilter === 'HOME_CARE'
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-purple-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Home Care ({homeCareCount})
              </button>
            </div>
          </div>

          <button 
            type="button" 
            onClick={addService}
            className="text-[11px] text-brand-teal hover:text-white font-semibold uppercase tracking-wider flex items-center gap-1 bg-brand-teal/10 hover:bg-brand-teal/25 border border-brand-teal/30 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <span className="text-sm font-bold leading-none">+</span> Add Item
          </button>
        </div>
        
        <div className="space-y-2 pb-2">
          {selectedServices.map((row, idx) => {
            let { rate, unit } = getServiceDetails(row.serviceId);
            if (row.rateOverride !== undefined && row.rateOverride !== null && row.rateOverride !== '') {
               rate = Number(row.rateOverride);
            }
            const qty = Number(row.qtyOverride) || 0;
            const subtotal = qty * rate;

            return (
              <div key={idx} className="w-full relative bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                <div className="flex items-center space-x-2 mb-1.5 pr-8">
                  <div className="flex-1 min-w-0">
                    <ServiceSearchDropdown
                      services={options.services || []}
                      selectedServiceId={row.serviceId}
                      onSelect={(serviceId) => updateService(idx, 'serviceId', serviceId)}
                      fundingFilter={fundingTypeFilter}
                      onFilterChange={setFundingTypeFilter}
                      selectedClient={selectedClient}
                      date={row.date || formData.date}
                      settings={settings}
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeService(idx)}
                  className="absolute right-1.5 top-2 p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove Item"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-lg leading-none">&times;</div>
                </button>
                {row.serviceId && (
                  <div className="flex md:items-center justify-between text-[11px] bg-[#09090b]/50 p-1.5 rounded border border-white/[0.08]/50 mt-1">
                    <div className="flex items-center justify-between w-full flex-wrap xl:flex-nowrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Date</span>
                          {row.date && (
                            <span className="text-zinc-400 font-medium mr-1.5 w-20 truncate">
                              {new Date(row.date).toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                          )}
                          <CustomDatePicker 
                            position="top"
                            value={row.date || ''}
                            onChange={(e: any) => updateService(idx, 'date', e.target.value)}
                            className="w-28 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Time</span>
                          <CustomTimePicker 
                            value={row.startTime || ''}
                            onChange={(e: any) => updateService(idx, 'startTime', e.target.value)}
                            className="w-24 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                          <div className="flex items-center mx-1">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              placeholder="Dur (hr)"
                              title="Duration (hr)"
                              value={row.duration || ''}
                              onChange={(e) => updateService(idx, 'duration', e.target.value)}
                              className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                            />
                          </div>
                          <span className="text-zinc-500 mx-1">-</span>
                          <CustomTimePicker 
                            value={row.endTime || ''}
                            onChange={(e: any) => updateService(idx, 'endTime', e.target.value)}
                            className="w-24 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-auto">
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Unit</span>
                          <span className="text-zinc-300 w-8 truncate" title={unit}>{unit}</span>
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
                            className="w-20 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Qty</span>
                          <input 
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={row.qtyOverride}
                            onChange={(e) => updateService(idx, 'qtyOverride', e.target.value)}
                            placeholder="0"
                            className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                        <div className="font-semibold text-white ml-2 text-right w-16">
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Important Notes Override (Optional)</label>
        <textarea
          rows={10}
          placeholder="Leave blank to use default notes..."
          className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-sm resize-none custom-scrollbar"
          value={formData.importantNotes}
          onChange={e => setFormData({ ...formData, importantNotes: e.target.value })}
        />
      </div>

      <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center space-x-3 mt-4">
        {(() => {
          const computedSubtotal = selectedServices.reduce((acc, s) => {
             let { rate } = getServiceDetails(s.serviceId);
             if (s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== '') {
                rate = Number(s.rateOverride);
             }
             const qty = Number(s.qtyOverride) || 0;
             return acc + (qty * rate);
          }, 0);
          
          const computedGst = formData.gstType === '10%' ? selectedServices.reduce((acc, s) => {
             let { rate, unit, name } = getServiceDetails(s.serviceId);
             if (s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== '') {
                rate = Number(s.rateOverride);
             }
             let effectiveQty = s.qtyOverride !== undefined && s.qtyOverride !== '' ? Number(s.qtyOverride) : 1;
             return acc + (Math.round((effectiveQty * rate) * 0.1 * 100) / 100);
          }, 0) : 0;
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
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-brand-blue hover:bg-brand-teal disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {submitting ? (editData ? 'Saving...' : 'Generating...') : (editData ? 'Save Changes' : 'Generate Quote')}
        </button>
      </div>
    </form>
  );
}


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
        {uploadFile ? (
          <span className="text-[14px] text-brand-teal font-medium text-center">{uploadFile.name}</span>
        ) : (
          <span className="text-[14px] text-zinc-400 font-medium text-center">Drag & drop PDF here, or click to select</span>
        )}
      </div>
    </div>
  );
}

export default function QuotesView() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useLocalStorage<number>('quotes_page_size', 100);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (![100, 250, 500, 1000].includes(pageSize)) {
      setPageSize(100);
    }
  }, [pageSize, setPageSize]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const { token } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = useState<number | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadActivity, setUploadActivity] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [allDbClients, setAllDbClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/invoices/form-data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAllDbClients(data.clients || []);
        }
      } catch (e) {
        console.error('Failed to fetch clients:', e);
      }
    };
    if (token) {
      fetchClients();
    }
  }, [token]);

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
    if (uploadActivity) formData.append('activity', uploadActivity);

    try {
      const res = await fetch('/api/quotes/historical', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload historical quote');
      setShowUploadModal(false);
      setUploadClientId('');
      setUploadDate('');
      setUploadActivity('');
      setUploadFile(null);
      fetchQuotes();
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const fetchQuotes = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await fetch('/api/quotes', { headers: { Authorization: `Bearer ${token}` } });
      setQuotes(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return true;
    const cleanAmount = s.replace(/[\$,]/g, '');

    const clientDisplayName = q.custom_client_name || `${q.client_first_name || ''} ${q.client_last_name || ''}`.trim() || 'Prospective Client';
    const nameStr = clientDisplayName.toLowerCase();
    const idStr = (q.quote_number || '').toLowerCase();
    const staffStr = `${q.staff_first_name || ''} ${q.staff_last_name || ''}`.trim().toLowerCase();
    const activityStr = (q.activity_name || '').toLowerCase();
    const amountStr = String(q.amount ?? '');
    const amountFormatted = Number(q.amount || 0).toFixed(2);

    return nameStr.includes(s) || 
           idStr.includes(s) || 
           staffStr.includes(s) || 
           activityStr.includes(s) || 
           amountStr.includes(s) || 
           amountFormatted.includes(s) || 
           (cleanAmount && (amountStr.includes(cleanAmount) || amountFormatted.includes(cleanAmount)));
  });
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';

    if (sortField === 'date') {
      valA = new Date(a.activity_date || a.created_at).getTime();
      valB = new Date(b.activity_date || b.created_at).getTime();
    } else if (sortField === 'client') {
      valA = (a.custom_client_name || `${a.client_first_name || ''} ${a.client_last_name || ''}`.trim() || 'Prospective Client').toLowerCase();
      valB = (b.custom_client_name || `${b.client_first_name || ''} ${b.client_last_name || ''}`.trim() || 'Prospective Client').toLowerCase();
    } else if (sortField === 'id') {
      valA = (a.quote_number || '').toLowerCase();
      valB = (b.quote_number || '').toLowerCase();
    } else if (sortField === 'activity') {
      valA = (a.activity_name || '').toLowerCase();
      valB = (b.activity_name || '').toLowerCase();
    } else if (sortField === 'amount') {
      valA = Number(a.amount || 0);
      valB = Number(b.amount || 0);
    } else if (sortField === 'status') {
      valA = (a.status || '').toLowerCase();
      valB = (b.status || '').toLowerCase();
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedQuotes.length / pageSize);
  const paginatedQuotes = sortedQuotes.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize, sortField, sortDir]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === filteredQuotes.length && paginatedQuotes.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredQuotes.map(q => q.id));
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} quotes?`)) return;
    try {
      const res = await fetch('/api/quotes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quoteIds: selectedIds })
      });
      if (res.ok) fetchQuotes();
    } catch (e) { console.error(e); }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchQuotes();
    } catch (e) { console.error(e); }
  };

  const previewPDF = (id: number) => {
    setPreviewQuoteId(id);
  };

  const downloadPDF = async (id: number, numberStr: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${numberStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF');
    }
  };


  const renderSortableHeader = (field: string, label: string) => (
    <th 
      className="px-3 py-1.5 font-semibold text-[10px] cursor-pointer select-none hover:bg-brand-bg/50 transition-colors"
      onClick={() => {
        if (sortField === field) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
          setSortField(field);
          setSortDir('asc');
        }
      }}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <div className="flex flex-col text-[#8B949E]">
          <ChevronUp className={`w-3 h-3 -mb-1 ${sortField === field && sortDir === 'asc' ? 'text-brand-teal' : 'opacity-30'}`} />
          <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-brand-teal' : 'opacity-30'}`} />
        </div>
      </div>
    </th>
  );
  return (
    <div className="flex-1 flex flex-col space-y-3">
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-3xl w-full flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <h2 className="text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0">Upload Historical Quote</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-3 bg-[#09090b]">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Client</label>
                <select
                  required
                  value={uploadClientId}
                  onChange={e => setUploadClientId(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors"
                >
                  <option value="">Select Client</option>
                  {allDbClients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Historical Date</label>
                <input
                  type="date"
                  required
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Activity Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Historical Quote"
                  value={uploadActivity}
                  onChange={e => setUploadActivity(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Quote PDF</label>
                <HistoricalDropzone uploadFile={uploadFile} setUploadFile={setUploadFile} />
              </div>
              <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-medium rounded-md h-7 transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewQuoteId !== null && (
        <QuotePreviewModal 
          quoteId={previewQuoteId}
          onClose={() => setPreviewQuoteId(null)}
        />
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-[60] flex justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-2xl w-full max-w-[1400px] flex flex-col h-fit my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg shrink-0">
              <div>
                <h3 className="text-sm font-medium text-[#E6EDF3] mb-2">{editingQuote ? 'Edit Service Quote' : 'Generate Service Quote'}</h3>
                <p className="text-xs text-[#8B949E] mt-0">Configure service and cost details for a new quote.</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="w-10 h-10 flex items-center justify-center bg-brand-navy border border-border-subtle hover:border-brand-blue rounded-md text-[#E6EDF3] transition-colors">
                ×
              </button>
            </div>
            
            <div className="overflow-visible flex-1">
              <GenerateQuoteForm token={token} onGenerated={() => fetchQuotes()} onClose={() => { setShowGenerateModal(false); setEditingQuote(null); }} editData={editingQuote} />
            </div>
          </div>
        </div>
      )}

            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center shadow-sm h-7"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete ({selectedIds.length})
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-7 py-1 bg-brand-navy border border-border-subtle rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-56 transition-colors h-7"
            />
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-[#8B949E]" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors">&times;</button>}
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-2.5 py-1 bg-gradient-to-r from-brand-teal to-brand-green text-white border-0 text-xs font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-7 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload Historical
          </button>
          <button
            onClick={() => { setEditingQuote(null); setShowGenerateModal(true); }}
            className="flex items-center px-2.5 py-1 bg-gradient-to-r from-brand-teal to-brand-green text-white border-0 text-xs font-medium rounded-md transition-colors shadow-sm w-full sm:w-auto h-7"
          >
            Generate Quote
          </button>
        </div>
      </div>
<div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto flex flex-col shadow-sm">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[#8B949E]">Loading quotes...</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
                            <thead>
                <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10 transition-colors">
                  <th className="px-3 py-1.5 font-semibold text-[10px] w-12">
                    <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedIds.length === paginatedQuotes.length && paginatedQuotes.length > 0} onChange={toggleAll} />
                  </th>
                  {renderSortableHeader('date', 'Date')}
                  {renderSortableHeader('id', 'Quote ID')}
                  {renderSortableHeader('client', 'Client')}
                  {renderSortableHeader('activity', 'Activity')}
                  {renderSortableHeader('amount', 'Amount')}
                  {renderSortableHeader('status', 'Status')}
                  <th className="px-3 py-1.5 font-semibold text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginatedQuotes.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-[#8B949E]">No quotes found.</td></tr>
                ) : paginatedQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-brand-bg/50 transition-colors group">
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedIds.includes(q.id)} onChange={() => toggleSelection(q.id)} />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[#E6EDF3]">
                      {(() => {
                        const d = new Date(q.activity_date || q.created_at);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}-${month}-${year}`;
                      })()}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>{q.quote_number}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(q.quote_number); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === q.quote_number ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        {(() => {
                          const clientDisplay = q.custom_client_name 
                            ? q.custom_client_name 
                            : `${q.client_first_name || ''} ${q.client_last_name || ''}`.trim() || 'Prospective Client';
                          const isCustomOrProspective = !q.client_id || !!q.custom_client_name;
                          return (
                            <div className="flex items-center space-x-1.5">
                              <span>{clientDisplay}</span>
                              {isCustomOrProspective && (
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium border ${
                                  q.custom_client_name && q.custom_client_name !== 'Prospective Client'
                                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                }`}>
                                  {q.custom_client_name && q.custom_client_name !== 'Prospective Client' ? 'Custom' : 'Prospective'}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <button onClick={(e) => { 
                          e.stopPropagation(); 
                          const toCopy = q.custom_client_name || `${q.client_first_name || ''} ${q.client_last_name || ''}`.trim() || 'Prospective Client';
                          handleCopy(toCopy); 
                        }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === (q.custom_client_name || `${q.client_first_name || ''} ${q.client_last_name || ''}`.trim() || 'Prospective Client') ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[#E6EDF3]">{q.activity_name}</td>
                    <td className="px-3 py-1.5 font-medium text-[#E6EDF3]">
                      <div className="flex items-center space-x-2 group/copy">
                        <span>${Number(q.amount).toFixed(2)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(`$${Number(q.amount).toFixed(2)}`); }} className="opacity-0 group-hover/copy:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] transition-all">
                          {copiedText === `$${Number(q.amount).toFixed(2)}` ? <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-brand-bg text-[#8B949E] border border-border-subtle">{q.status}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right flex items-center justify-end space-x-1">
                      <button title="Edit Quote" onClick={() => { setEditingQuote(q); setShowGenerateModal(true); }} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button title="Preview PDF" onClick={() => previewPDF(q.id)} className="p-1.5 text-zinc-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-md transition-colors"><Eye className="w-4 h-4" /></button>
                      <button title="Download PDF" onClick={() => downloadPDF(q.id, q.quote_number)} className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-md transition-colors"><Download className="w-4 h-4" /></button>
                      <button title="Delete Quote" onClick={() => handleDeleteSingle(q.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && sortedQuotes.length > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-brand-bg">
            <div className="flex items-center space-x-2 text-sm text-[#8B949E]">
              <span>Rows per page:</span>
              <select 
                value={pageSize} 
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-brand-navy border border-border-subtle rounded text-[#E6EDF3] text-sm py-1 px-2 focus:outline-none focus:border-brand-teal"
              >
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
            <div className="flex items-center space-x-4 text-sm text-[#8B949E]">
              <span>
                {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, sortedQuotes.length)} of {sortedQuotes.length}
              </span>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-brand-navy disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-brand-navy disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
