function ManualRemittanceForm({ token, onGenerated, onClose }: { token: string | null, onGenerated: () => void, onClose: () => void }) {
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
      
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        submitData.append(key, val);
      });
      submitData.append('services', JSON.stringify(validServices));
      attachments.forEach(file => {
        submitData.append('attachments', file);
      });

      const res = await fetch('/api/remittances/manual?folderPath=Invoices/Attachments', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: submitData
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
    <form onSubmit={handleSubmit} className="p-5 space-y-3">
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
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Start Time (Optional)</label>
          <CustomTimePicker
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.startTime}
            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">End Time (Optional)</label>
          <CustomTimePicker
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
              <div key={idx} className="relative w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
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
                          <option value="orientation">-- Orientation --</option>
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
                              disabled={row.serviceId === 'orientation'}
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

      <div className="pt-4 border-t border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4">
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
          
          const computedGst = formData.gstType === '10%' ? selectedServices.reduce((acc, s) => {
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
             return acc + (Math.round((effectiveQty * rate) * 0.1 * 100) / 100);
          }, 0) : 0;
          const computedTotal = computedSubtotal + computedGst;

          return (
            <div className="flex flex-col text-white text-sm font-medium shrink-0">
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

        <div className="pt-2 flex-1 min-w-0 w-full max-w-full md:max-w-md">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">Additional Evidence (Attachments)</label>
          <div 
            className="border-2 border-dashed border-white/10 rounded-md p-4 text-center hover:bg-white/[0.02] transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setAttachments(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            <p className="text-xs text-zinc-500">Drag & drop files here, or click to select files</p>
            {attachments.length > 0 && (
              <div className="mt-2 text-left flex flex-col gap-1">
                {attachments.map((f, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/5 px-2 py-1 rounded text-xs overflow-hidden w-full">
                    <span className="text-zinc-300 truncate min-w-0 flex-1 mr-2">{f.name}</span>
                    <button 
                      type="button" 
                      className="text-red-400 hover:text-red-300 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachments(prev => prev.filter((_, idx) => idx !== i));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-2 shrink-0 w-full md:w-auto justify-end mt-2 md:mt-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
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
                Generate Remittance
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}