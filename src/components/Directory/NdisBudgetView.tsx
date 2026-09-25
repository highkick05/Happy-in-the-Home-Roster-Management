import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, RefreshCw, X, FileText, CheckCircle2, Calendar, 
  Pencil, Plus, Trash2, Archive, Activity, BarChart3, Clock, 
  AlertTriangle, Layers, Percent, TrendingUp, Search, Eye, ShieldCheck,
  ChevronRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NdisBudgetView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedAgrId, setSelectedAgrId] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState<'both' | 'cards' | 'table'>('both');
  const [itemSearch, setItemSearch] = useState('');
  const [selectedShiftItem, setSelectedShiftItem] = useState<any | null>(null);
  
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
        serviceRate: Number(it.serviceRate || 0),
        serviceUnit: it.serviceUnit || 'Hour',
        allocatedBudget: Number(it.allocatedBudget || 0),
        allocatedHours: Number(it.allocatedHours || 0)
      }))
    });
    setShowAddModal(true);
  };

  const handleUpdateItem = (index: number, field: 'allocatedBudget' | 'allocatedHours', val: number) => {
    const newItems = [...newAgr.items];
    const item = { ...newItems[index] };
    const rate = Number(item.serviceRate || 0);

    if (field === 'allocatedBudget') {
      item.allocatedBudget = val;
      if (rate > 0) {
        item.allocatedHours = parseFloat((val / rate).toFixed(1));
      }
    } else {
      item.allocatedHours = val;
      if (rate > 0) {
        item.allocatedBudget = parseFloat((val * rate).toFixed(2));
      }
    }
    newItems[index] = item;
    setNewAgr(prev => ({ ...prev, items: newItems }));
  };

  const handleSaveModal = async () => {
    try {
      const url = editMode 
        ? `/api/clients/${id}/ndis-agreements/${selectedAgrId}`
        : `/api/clients/${id}/ndis-agreements`;
      const method = editMode ? 'PUT' : 'POST';

      const totalCalculatedBudget = newAgr.items.reduce((s, it) => s + (Number(it.allocatedBudget) || 0), 0);

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newAgr,
          totalBudget: totalCalculatedBudget
        })
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

  const handleDelete = async () => {
    if (!selectedAgrId) return;
    try {
      const res = await fetch(`/api/clients/${id}/ndis-agreements/${selectedAgrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedAgrId(null);
        await fetchData();
      }
    } catch (e) {
      console.error("Error deleting agreement", e);
    }
  };

  const handleArchive = async () => {
    if (!selectedAgrId) return;
    try {
      const selectedData = getSelectedData();
      const newStatus = selectedData.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      const res = await fetch(`/api/clients/${id}/ndis-agreements/${selectedAgrId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error("Error archiving agreement", e);
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
            onClick={() => navigate(`/clients/${id}`, { replace: true })}
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
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap text-sm font-medium ${
                selectedAgrId === agr.id
                  ? 'bg-zinc-800 text-white border-b-2 border-brand-blue'
                  : 'text-[#8B949E] hover:text-white hover:bg-white/5'
              } ${agr.status === 'ARCHIVED' ? 'opacity-60' : ''}`}
            >
              <span>{agr.name}</span>
              {agr.status === 'ARCHIVED' && <Archive className="w-3.5 h-3.5 ml-1.5 opacity-70" />}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditModal}
                  className="flex items-center space-x-2 bg-white/[0.05] hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors font-medium text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Agreement</span>
                </button>
                <button
                  onClick={handleArchive}
                  className="flex items-center space-x-2 bg-white/[0.05] hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors font-medium text-sm"
                  title={selectedData.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                >
                  <Archive className="w-4 h-4" />
                  <span>{selectedData.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}</span>
                </button>
                <button
                  onClick={() => {
                     if (window.confirm('Are you sure you want to delete this service agreement?')) {
                        handleDelete();
                     }
                  }}
                  className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg border border-red-500/20 transition-colors font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Grand Total Funding</span>
                  <Layers className="w-4 h-4 text-brand-blue opacity-70" />
                </div>
                <div className="text-2xl font-bold text-[#E6EDF3] tracking-tight">{formatCurrency(selectedData.totalAgreementValue)}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-mono">Sum of line item sub-totals</div>
              </div>

              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Delivered / Consumed</span>
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 opacity-70" />
                </div>
                <div className="text-2xl font-bold text-indigo-400 tracking-tight">{formatCurrency(selectedData.totalCompletedSpent || selectedData.totalClaimed)}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                  {fundsUtilizedPct(selectedData.totalCompletedSpent || selectedData.totalClaimed, selectedData.totalAgreementValue).toFixed(1)}% of total budget
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Scheduled / Upcoming</span>
                  <Clock className="w-4 h-4 text-sky-400 opacity-70" />
                </div>
                <div className="text-2xl font-bold text-sky-400 tracking-tight">{formatCurrency(selectedData.totalScheduledSpent || 0)}</div>
                <div className="text-[11px] text-zinc-500 mt-1 font-mono">Committed future shifts</div>
              </div>

              <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-zinc-400 text-xs font-medium mb-1 flex items-center justify-between">
                  <span>Available Balance</span>
                  <Sparkles className="w-4 h-4 text-emerald-400 opacity-70" />
                </div>
                <div className={`text-2xl font-bold tracking-tight ${selectedData.totalRemainingBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(selectedData.totalRemainingBalance)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 font-mono">Net remaining agreement funds</div>
              </div>
            </div>
            
            {/* BUDGET CONSUMPTION TIMELINE & BURN METER */}
            <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-[15px] font-semibold text-[#E6EDF3]">Funding Consumption Timeline</h3>
                </div>
                {(() => {
                  const burnPct = fundsUtilizedPct(selectedData.totalClaimed, selectedData.totalAgreementValue);
                  const timePct = timeElapsedPct(selectedData.startDate, selectedData.endDate);
                  const diff = burnPct - timePct;
                  if (diff > 15) {
                    return (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> High Burn Rate
                      </span>
                    );
                  } else if (diff < -15) {
                    return (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Under-utilizing Allocation
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Spending On Target
                    </span>
                  );
                })()}
              </div>
              
              <div className="relative w-full h-3.5 bg-black/50 rounded-full border border-white/5 overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${fundsUtilizedPct(selectedData.totalClaimed, selectedData.totalAgreementValue)}%` }}
                />
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 box-content shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                  style={{ left: `${timeElapsedPct(selectedData.startDate, selectedData.endDate)}%` }}
                >
                  <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 bg-red-400" />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-zinc-500 font-mono">Agreement Start</span>
                <span className="text-xs font-mono text-zinc-300">
                  Financial Burn: <span className="text-indigo-400 font-semibold">{fundsUtilizedPct(selectedData.totalClaimed, selectedData.totalAgreementValue).toFixed(1)}% Utilized</span> vs. <span className="text-red-400 font-semibold">{timeElapsedPct(selectedData.startDate, selectedData.endDate).toFixed(1)}% Time Elapsed</span>
                </span>
                <span className="text-xs text-zinc-500 font-mono">Agreement End</span>
              </div>
            </div>

            {/* SERVICE LINE ITEM CONSUMPTION TRACKER */}
            <div className="bg-zinc-900 border border-white/[0.08] rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-white/[0.08] gap-3">
                <div className="flex items-center space-x-2 text-[#E6EDF3]">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-[15px] font-semibold">Service Line Item Consumption Tracker</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Track shift hours and sub-total budget consumption per support line item</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Search support items..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue transition-colors w-44"
                    />
                  </div>

                  {/* View Filter Switcher */}
                  <div className="inline-flex items-center p-0.5 bg-black/40 border border-white/10 rounded-md text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setViewFilter('both')}
                      className={`px-2.5 py-1 rounded ${viewFilter === 'both' ? 'bg-brand-blue text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFilter('cards')}
                      className={`px-2.5 py-1 rounded ${viewFilter === 'cards' ? 'bg-brand-blue text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewFilter('table')}
                      className={`px-2.5 py-1 rounded ${viewFilter === 'table' ? 'bg-brand-blue text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Table
                    </button>
                  </div>

                  <button 
                    onClick={fetchData} 
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/10"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {(() => {
                const filteredItems = selectedData.items.filter((item: any) => {
                  if (!itemSearch.trim()) return true;
                  const q = itemSearch.toLowerCase();
                  return (
                    (item.supportItemCode || '').toLowerCase().includes(q) ||
                    (item.supportItemName || '').toLowerCase().includes(q)
                  );
                });

                if (filteredItems.length === 0) {
                  return (
                    <div className="p-10 text-center text-zinc-500 flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-zinc-600 mb-2 opacity-60" />
                      <p className="text-sm">No support items match the search query.</p>
                    </div>
                  );
                }

                return (
                  <div className="p-4 space-y-6">
                    {/* Visual Tracker Cards View */}
                    {(viewFilter === 'both' || viewFilter === 'cards') && (
                      <div>
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                          <span>Visual Consumption Trackers</span>
                          <span className="text-[11px] text-zinc-500 lowercase font-normal">{filteredItems.length} support items</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredItems.map((item: any, idx: number) => {
                            const allocBudget = Number(item.allocatedBudget || 0);
                            const spent = Number(item.amountSpent || 0);
                            const rem = Number(item.remainingBalance ?? (allocBudget - spent));
                            const pct = allocBudget > 0 ? Math.min(100, Math.max(0, (spent / allocBudget) * 100)) : 0;
                            const isOver = rem < 0;
                            const isNear = !isOver && pct >= 80;

                            return (
                              <div 
                                key={idx} 
                                className="bg-black/30 border border-white/[0.08] hover:border-white/20 transition-all rounded-xl p-4 flex flex-col justify-between shadow-sm relative group"
                              >
                                <div>
                                  {/* Top Row: Code, Rate, Status */}
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="px-2 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20 text-brand-blue font-mono text-[11px] font-medium inline-block mb-1">
                                        {item.supportItemCode}
                                      </span>
                                      <h4 className="text-sm font-semibold text-[#E6EDF3] leading-snug line-clamp-2" title={item.supportItemName}>
                                        {item.supportItemName}
                                      </h4>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-xs font-semibold text-zinc-300 font-mono">
                                        {formatCurrency(item.serviceRate)}
                                      </div>
                                      <div className="text-[10px] text-zinc-500">per {item.serviceUnit || 'Hour'}</div>
                                    </div>
                                  </div>

                                  {/* Metrics Grid */}
                                  <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-zinc-900/80 border border-white/5 text-center">
                                    <div>
                                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Sub-Total Alloc.</div>
                                      <div className="text-xs font-bold text-zinc-200 mt-0.5 font-mono">{formatCurrency(allocBudget)}</div>
                                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.allocatedHours ? `${item.allocatedHours}h` : '—'}</div>
                                    </div>
                                    <div className="border-x border-white/5 px-1">
                                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Spent to Date</div>
                                      <div className="text-xs font-bold text-indigo-400 mt-0.5 font-mono">{formatCurrency(spent)}</div>
                                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.deliveredHours ? `${item.deliveredHours}h` : '0h'}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Remaining</div>
                                      <div className={`text-xs font-bold mt-0.5 font-mono ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {formatCurrency(rem)}
                                      </div>
                                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                        {item.allocatedHours ? `${Math.max(0, parseFloat((item.allocatedHours - (item.deliveredHours || 0)).toFixed(1)))}h` : '—'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="space-y-1 mb-3">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-zinc-400 font-mono">Consumption</span>
                                      <span className={`font-mono font-medium ${isOver ? 'text-red-400 font-bold' : isNear ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {pct.toFixed(1)}% {isOver && '(Exceeded)'}
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-black/50 rounded-full border border-white/5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isOver 
                                            ? 'bg-red-500' 
                                            : isNear 
                                            ? 'bg-amber-400' 
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.min(100, pct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Shift Activity Footer Button */}
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                  <span className="text-[11px] text-zinc-500">
                                    {item.recentShifts?.length || 0} shift(s) tracked
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedShiftItem(item)}
                                    className="inline-flex items-center space-x-1 text-xs text-brand-blue hover:text-blue-400 font-medium transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Shift Log</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Tracker Table View */}
                    {(viewFilter === 'both' || viewFilter === 'table') && (
                      <div className="pt-2">
                        {(viewFilter === 'both') && (
                          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                            Itemized Detailed Audit Table
                          </div>
                        )}
                        <div className="overflow-x-auto rounded-lg border border-white/5">
                          <table className="w-full text-left text-[13px]">
                            <thead className="bg-[#1C2128]/80 text-[#8B949E] uppercase text-[10px] font-semibold tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                              <tr>
                                <th className="px-5 py-3 border-b border-white/5 whitespace-nowrap">Support Item</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Standard Rate</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Hours (Alloc. / Deliv.)</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Sub-Total Budget</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Amount Spent</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Remaining Balance</th>
                                <th className="px-5 py-3 border-b border-white/5 text-center whitespace-nowrap w-36">Consumption</th>
                                <th className="px-5 py-3 border-b border-white/5 text-right whitespace-nowrap">Shifts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filteredItems.map((item: any, i: number) => {
                                const allocBudget = Number(item.allocatedBudget || 0);
                                const spent = Number(item.amountSpent || 0);
                                const rem = Number(item.remainingBalance ?? (allocBudget - spent));
                                const pct = allocBudget > 0 ? Math.min(100, Math.max(0, (spent / allocBudget) * 100)) : 0;
                                const isOver = rem < 0;
                                const isNear = !isOver && pct >= 80;

                                return (
                                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-5 py-3 min-w-[200px]">
                                      <div className="font-mono text-xs text-brand-blue font-medium mb-0.5">{item.supportItemCode}</div>
                                      <div className="text-[#E6EDF3] group-hover:text-white font-medium text-xs line-clamp-1">{item.supportItemName}</div>
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums text-zinc-300 font-mono text-xs whitespace-nowrap">
                                      {formatCurrency(item.serviceRate)} / {item.serviceUnit || 'h'}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                      <span className="text-zinc-500 font-mono text-xs">{item.allocatedHours ? `${item.allocatedHours} h` : '—'} / </span>
                                      <span className="text-brand-blue font-mono font-medium text-xs">{item.deliveredHours > 0 ? item.deliveredHours.toFixed(1) : '0.0'} h</span>
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums text-zinc-300 font-mono text-xs font-semibold whitespace-nowrap">
                                      {formatCurrency(allocBudget)}
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums text-indigo-400 font-mono font-medium text-xs whitespace-nowrap">
                                      {formatCurrency(spent)}
                                    </td>
                                    <td className="px-5 py-3 text-right tabular-nums font-mono font-medium text-xs whitespace-nowrap">
                                      <span className={isOver ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                                        {formatCurrency(rem)}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap">
                                      <div className="flex items-center space-x-2">
                                        <div className="flex-1 h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, pct)}%` }}
                                          />
                                        </div>
                                        <span className={`text-[10px] font-mono ${isOver ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                                          {pct.toFixed(0)}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedShiftItem(item)}
                                        className="inline-flex items-center space-x-1 text-xs text-zinc-400 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>{item.recentShifts?.length || 0}</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* SHIFT ACTIVITY AUDIT MODAL */}
      <AnimatePresence>
        {selectedShiftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShiftItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded border border-brand-blue/20">
                      {selectedShiftItem.supportItemCode}
                    </span>
                    <h3 className="text-base font-semibold text-white">{selectedShiftItem.supportItemName}</h3>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Sub-Total Budget: <span className="text-white font-mono">{formatCurrency(selectedShiftItem.allocatedBudget)}</span> • Spent: <span className="text-indigo-400 font-mono">{formatCurrency(selectedShiftItem.amountSpent)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedShiftItem(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(!selectedShiftItem.recentShifts || selectedShiftItem.recentShifts.length === 0) ? (
                  <div className="p-8 text-center text-zinc-500">
                    <FileText className="w-8 h-8 text-zinc-600 mb-2 mx-auto opacity-50" />
                    <p className="text-sm">No shifts have consumed this support line item yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Recent Shift Consumptions ({selectedShiftItem.recentShifts.length})
                    </div>
                    {selectedShiftItem.recentShifts.map((sh: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded bg-white/5 text-zinc-400">
                            <Clock className="w-4 h-4 text-brand-blue" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-white">{sh.staffName || 'Staff Member'}</div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{formatDate(sh.date)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-indigo-400 font-mono">{formatCurrency(sh.cost)}</div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            {sh.hours ? `${sh.hours.toFixed(1)} hrs` : 'Standard Entry'} • <span className={sh.status === 'COMPLETED' ? 'text-emerald-400' : 'text-sky-400'}>{sh.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShiftItem(null)}
                  className="px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT SERVICE AGREEMENT MODAL */}
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
                <div>
                  <h3 className="text-lg font-semibold text-white">{editMode ? 'Edit Service Agreement' : 'Add Service Agreement'}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Configure line item sub-totals from Settings &gt; NDIS Price List</p>
                </div>
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
                      placeholder="e.g. NDIS Service Agreement 2026-2027"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={newAgr.startDate}
                        onChange={(e) => setNewAgr(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={newAgr.endDate}
                        onChange={(e) => setNewAgr(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Agreement Service Line Items</h4>
                      <p className="text-xs text-zinc-400">Input hours or sub-totals. The Grand Total is automatically calculated.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-400">Grand Total: </span>
                      <span className="font-mono text-brand-blue font-bold text-base">
                        {formatCurrency(newAgr.items.reduce((s, it) => s + (Number(it.allocatedBudget) || 0), 0))}
                      </span>
                    </div>
                  </div>

                  {/* Service Selection Dropdown */}
                  <div className="mb-4">
                    <select
                      onChange={(e) => {
                        const selectedServiceId = parseInt(e.target.value);
                        if (!selectedServiceId) return;
                        
                        const service = allServices.find(s => s.id === selectedServiceId);
                        if (service) {
                          setNewAgr(prev => ({
                            ...prev,
                            items: [...prev.items, {
                               service_id: service.id,
                               supportItemCode: service.code,
                               supportItemName: service.name,
                               serviceRate: Number(service.rate || 0),
                               serviceUnit: service.unit || 'Hour',
                               allocatedHours: 0,
                               allocatedBudget: 0
                            }]
                          }));
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-zinc-300 outline-none focus:border-brand-blue transition-colors cursor-pointer"
                    >
                      <option value="">+ Add service from NDIS Price List...</option>
                      {(() => {
                        const unaddedServices = allServices.filter(s => !newAgr.items.find((i: any) => i.service_id === s.id));
                        const assigned = unaddedServices.filter(s => client?.service_ids?.includes(s.id));
                        const others = unaddedServices.filter(s => !client?.service_ids?.includes(s.id));

                        if (assigned.length > 0) {
                          return (
                            <>
                              <optgroup label="⭐ Assigned Client Services">
                                {assigned.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.code} - {s.name} ({formatCurrency(s.rate)} / {s.unit || 'h'})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="All NDIS Price List Services">
                                {others.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.code} - {s.name} ({formatCurrency(s.rate)} / {s.unit || 'h'})
                                  </option>
                                ))}
                              </optgroup>
                            </>
                          );
                        }

                        return unaddedServices.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.code} - {s.name} ({formatCurrency(s.rate)} / {s.unit || 'h'})
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {newAgr.items.length === 0 ? (
                    <div className="p-6 bg-black/20 border border-dashed border-white/10 rounded-lg text-center text-zinc-500 text-sm">
                      No services added to this agreement yet. Select a service from the dropdown above to allocate hours and budget.
                    </div>
                  ) : (
                    <div className="space-y-3 bg-black/20 border border-white/[0.08] p-3 rounded-lg max-h-72 overflow-y-auto">
                      {newAgr.items.map((item, index) => {
                        const rate = Number(item.serviceRate || 0);
                        return (
                          <div key={item.service_id || index} className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900 border border-white/[0.05] p-3 rounded-md gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-mono text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded border border-brand-blue/20">
                                  {item.supportItemCode}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">
                                  Rate: {formatCurrency(rate)} / {item.serviceUnit || 'h'}
                                </span>
                              </div>
                              <div className="text-sm text-white font-medium truncate" title={item.supportItemName}>
                                {item.supportItemName}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Allocated Hours */}
                              <div className="w-24">
                                <label className="block text-[10px] text-zinc-400 mb-1">Alloc. Hours</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  placeholder="0.0"
                                  value={item.allocatedHours ?? ''}
                                  onChange={(e) => handleUpdateItem(index, 'allocatedHours', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors text-right font-mono"
                                />
                              </div>

                              {/* Allocated Sub-Total Budget */}
                              <div className="w-32">
                                <label className="block text-[10px] text-zinc-400 mb-1">Sub-Total ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={item.allocatedBudget ?? ''}
                                  onChange={(e) => handleUpdateItem(index, 'allocatedBudget', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors text-right font-mono font-medium"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...newAgr.items];
                                  newItems.splice(index, 1);
                                  setNewAgr({ ...newAgr, items: newItems });
                                }}
                                className="p-1.5 mt-4 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors"
                                title="Remove line item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex items-center justify-between">
                <div className="text-xs text-zinc-400 font-mono">
                  {newAgr.items.length} line item(s) • Total: <span className="text-emerald-400 font-bold">{formatCurrency(newAgr.items.reduce((s, it) => s + (Number(it.allocatedBudget) || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveModal}
                    disabled={!newAgr.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-blue hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 font-semibold"
                  >
                    Save Agreement
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
