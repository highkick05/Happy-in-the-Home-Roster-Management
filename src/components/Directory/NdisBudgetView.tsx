import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, RefreshCw, X, FileText, CheckCircle2, Calendar, Pencil, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NdisBudgetView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedAgrId, setSelectedAgrId] = useState<number | null>(null);
  
  const [client, setClient] = useState<any>(null);
  const [allServices, setAllServices] = useState<any[]>([]);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newAgr, setNewAgr] = useState({
    name: '',
    startDate: '',
    endDate: '',
    items: [] as any[]
  });

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, servicesRes, agrsRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/services`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients/${id}/ndis-agreements`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (clientRes.ok) setClient(await clientRes.json());
      if (servicesRes.ok) setAllServices(await servicesRes.json());
      
      if (agrsRes.ok) {
        const data = await agrsRes.json();
        setAgreements(data);
        if (data.length > 0 && !selectedAgrId) {
          setSelectedAgrId(data[0].id);
        } else if (data.length > 0 && selectedAgrId) {
          // ensure selected doesn't disappear
          if (!data.find((a: any) => a.id === selectedAgrId)) {
            setSelectedAgrId(data[0].id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setNewAgr({
      name: `Agreement ${new Date().getFullYear()}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      items: []
    });
    setShowAddModal(true);
  };

  const handleEditModal = () => {
    const selectedData = getSelectedData();
    if (!selectedData) return;
    
    setEditMode(true);
    setNewAgr({
      name: selectedData.name,
      startDate: selectedData.startDate.split('T')[0],
      endDate: selectedData.endDate.split('T')[0],
      items: selectedData.items.map((it: any) => ({
        service_id: it.service_id,
        supportItemCode: it.supportItemCode,
        supportItemName: it.supportItemName,
        allocatedBudget: it.allocatedBudget
      }))
    });
    setShowAddModal(true);
  };

  const handleSaveModal = async () => {
    try {
      const url = editMode 
        ? `/api/clients/${id}/ndis-agreements/${selectedAgrId}`
        : `/api/clients/${id}/ndis-agreements`;
      const method = editMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAgr)
      });
      if (res.ok) {
        setShowAddModal(false);
        const data = await res.json();
        if (data.agreementId) {
          setSelectedAgrId(data.agreementId);
        }
        await fetchData();
      } else {
        console.error("Failed to save agreement");
      }
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val || 0);
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getSelectedData = () => {
    if (!agreements || agreements.length === 0) return null;
    return agreements.find(a => a.id === selectedAgrId) || agreements[0];
  };

  const daysRemaining = (endDate: string) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };
  
  const totalDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };
  
  const timeElapsedPct = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const daysElapsed = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    return Math.min(100, (daysElapsed / totalDays(startDate, endDate)) * 100);
  };
  
  const fundsUtilizedPct = (totalClaimed: number, totalAgreementValue: number) => {
    if (!totalAgreementValue) return 0;
    return Math.min(100, (totalClaimed / totalAgreementValue) * 100);
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E]">Loading NDIS Service Agreements...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-red-500">Client not found.</div>;
  }

  const selectedData = getSelectedData();

  return (
    <div className="w-full flex flex-col h-full space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/clients/${id}`)}
            className="p-2 -ml-2 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight">
              Service Agreement Tracking
            </h2>
            <div className="flex items-center text-sm mt-1 text-[#8B949E] space-x-2">
              <span className="font-medium text-[#E6EDF3]">{client.first_name} {client.last_name}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">NDIS</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Service Agreement</span>
        </button>
      </div>

      {/* TABS */}
      {agreements.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-white/10 shrink-0">
          {agreements.map((agr) => (
            <button
              key={agr.id}
              onClick={() => setSelectedAgrId(agr.id)}
              className={`flex items-center px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap text-sm font-medium ${
                selectedAgrId === agr.id
                  ? 'bg-zinc-800 text-white border-b-2 border-brand-blue'
                  : 'text-[#8B949E] hover:text-white hover:bg-white/5'
              }`}
            >
              {agr.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-6 space-y-6">
        {!selectedData ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900 border border-white/[0.08] rounded-xl">
             <FileText className="w-12 h-12 text-zinc-600 mb-4" />
             <h3 className="text-lg font-medium text-[#E6EDF3] mb-2">No Service Agreements</h3>
             <p className="text-[#8B949E] text-center max-w-sm mb-6">Create a new service agreement to track budgets and consumption.</p>
             <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
             >
                <Plus className="w-4 h-4" />
                <span>Create Service Agreement</span>
             </button>
          </div>
        ) : (
          <>
            {/* Agreement Actions Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleEditModal}
                className="flex items-center space-x-2 bg-white/[0.05] hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors font-medium text-sm"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit Agreement</span>
              </button>
              <div className="flex items-center space-x-6 bg-black/40 border border-white/[0.08] px-4 py-2 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Start Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-medium text-[#E6EDF3]">{formatDate(selectedData.startDate)}</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">End Date</span>
                  <span className="text-sm font-medium text-[#E6EDF3] mt-0.5">{formatDate(selectedData.endDate)}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                    {daysRemaining(selectedData.endDate)} Days Remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-sm font-medium mb-1">Total Agreement Funds</div>
                <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(selectedData.totalAgreementValue)}</div>
              </div>
              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-sm font-medium mb-1">Total Claims / Utilized</div>
                <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(selectedData.totalClaimed)}</div>
              </div>
              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-sm font-medium mb-1">Available Balance</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(selectedData.totalRemainingBalance)}
                </div>
              </div>
            </div>
            
            {/* BUDGET CONSUMPTION TIMELINE */}
            <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col">
              <h3 className="text-[15px] font-semibold text-[#E6EDF3] mb-4">Funding Consumption Timeline</h3>
              
              <div className="relative w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${fundsUtilizedPct(selectedData.totalClaimed, selectedData.totalAgreementValue)}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 box-content"
                  style={{ left: `${timeElapsedPct(selectedData.startDate, selectedData.endDate)}%` }}
                >
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-red-400" />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-zinc-400">0%</span>
                <span className="text-xs font-mono text-zinc-300">
                  Financial Burn: <span className="text-indigo-400 font-semibold">{fundsUtilizedPct(selectedData.totalClaimed, selectedData.totalAgreementValue).toFixed(1)}% Utilized</span> vs. <span className="text-red-400 font-semibold">{timeElapsedPct(selectedData.startDate, selectedData.endDate).toFixed(1)}% Time Elapsed</span>
                </span>
                <span className="text-xs text-zinc-400">100%</span>
              </div>
            </div>

            {/* SERVICE AGREEMENT ITEMS */}
            <div className="bg-zinc-900 border border-white/[0.08] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2 text-[#E6EDF3]">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-[15px] font-semibold">Service Agreement Support Items</h3>
                </div>
                <button onClick={fetchData} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
              
              <div className="overflow-x-auto min-h-0">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#1C2128]/50 text-[#8B949E] uppercase text-[10px] font-semibold tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 border-b border-white/5 whitespace-nowrap">Support Item Code</th>
                      <th className="px-6 py-3 border-b border-white/5">Support Item Name</th>
                      <th className="px-6 py-3 border-b border-white/5 text-right">Hours (Alloc. vs Deliv.)</th>
                      <th className="px-6 py-3 border-b border-white/5 text-right w-32">Allocated Budget</th>
                      <th className="px-6 py-3 border-b border-white/5 text-right w-32">Amount Spent</th>
                      <th className="px-6 py-3 border-b border-white/5 text-right w-32">Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedData.items.map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-3 whitespace-nowrap font-mono text-xs text-[#E6EDF3] group-hover:text-white transition-colors">{item.supportItemCode}</td>
                        <td className="px-6 py-3 text-[#E6EDF3] group-hover:text-white transition-colors line-clamp-2 md:line-clamp-none">{item.supportItemName}</td>
                        <td className="px-6 py-3 text-right whitespace-nowrap">
                          {item.allocatedHours ? <span className="text-zinc-500 font-mono text-xs">{item.allocatedHours} h / </span> : <span className="text-zinc-500 font-mono text-xs">0.0 h / </span>}
                          <span className="text-brand-blue font-mono font-medium text-xs">{item.deliveredHours > 0 ? item.deliveredHours.toFixed(1) : '0.0'} h</span>
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-zinc-400 font-mono text-xs">{formatCurrency(item.allocatedBudget)}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-brand-blue font-mono font-medium text-xs">{formatCurrency(item.amountSpent)}</td>
                        <td className="px-6 py-3 text-right tabular-nums font-mono font-medium text-xs">
                          <span className={item.remainingBalance < 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatCurrency(item.remainingBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedData.items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[#8B949E]">
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
                            <p>No support items found for this agreement.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ADD SERVICE AGREEMENT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
                <h3 className="text-lg font-semibold text-white">{editMode ? 'Edit Service Agreement' : 'Add Service Agreement'}</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Agreement Name</label>
                    <input
                      type="text"
                      value={newAgr.name}
                      onChange={(e) => setNewAgr(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                      placeholder="e.g. Funding 2026-2027"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={newAgr.startDate}
                        onChange={(e) => setNewAgr(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={newAgr.endDate}
                        onChange={(e) => setNewAgr(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Agreement Services</h4>
                    <div className="text-xs text-zinc-400">
                      Total: <span className="font-mono text-brand-blue font-medium">{formatCurrency(newAgr.items.reduce((s, it) => s + (Number(it.allocatedBudget) || 0), 0))}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <select
                      onChange={(e) => {
                        const selectedServiceId = parseInt(e.target.value);
                        if (!selectedServiceId) return;
                        
                        const activeAssignedServices = allServices.filter(s => client?.service_ids?.includes(s.id));
                        const service = activeAssignedServices.find(s => s.id === selectedServiceId);
                        
                        if (service) {
                          setNewAgr(prev => ({
                            ...prev,
                            items: [...prev.items, {
                               service_id: service.id,
                               supportItemCode: service.code,
                               supportItemName: service.name,
                               allocatedBudget: 0
                            }]
                          }));
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-zinc-300 outline-none focus:border-brand-blue transition-colors cursor-pointer"
                    >
                      <option value="">+ Select a service to add...</option>
                      {allServices
                        .filter(s => client?.service_ids?.includes(s.id))
                        .filter(s => !newAgr.items.find((i: any) => i.service_id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {newAgr.items.length === 0 ? (
                    <div className="p-4 bg-black/20 border border-dashed border-white/10 rounded-lg text-center text-zinc-500 text-sm">
                      No services added to this agreement. Select from the dropdown above.
                    </div>
                  ) : (
                    <div className="space-y-3 bg-black/20 border border-white/[0.08] p-3 rounded-lg max-h-64 overflow-y-auto">
                      {newAgr.items.map((item, index) => (
                        <div key={item.service_id} className="flex items-center justify-between bg-zinc-900 border border-white/[0.05] p-3 rounded-md">
                          <div className="flex-1 pr-4 min-w-0">
                            <div className="text-xs text-zinc-400 font-mono mb-1 truncate">{item.supportItemCode}</div>
                            <div className="text-sm text-white font-medium truncate">{item.supportItemName}</div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-32">
                              <label className="block text-[10px] text-zinc-500 mb-1">Allocated Budget ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.allocatedBudget || ''}
                                onChange={(e) => {
                                  const newItems = [...newAgr.items];
                                  newItems[index].allocatedBudget = parseFloat(e.target.value) || 0;
                                  setNewAgr({ ...newAgr, items: newItems });
                                }}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors text-right"
                              />
                            </div>
                            <button
                              onClick={() => {
                                const newItems = [...newAgr.items];
                                newItems.splice(index, 1);
                                setNewAgr({ ...newAgr, items: newItems });
                              }}
                              className="p-1.5 mt-4 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
                              title="Remove Service"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModal}
                  disabled={!newAgr.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
                >
                  Save Agreement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
