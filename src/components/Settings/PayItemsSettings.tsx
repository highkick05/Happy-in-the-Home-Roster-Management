import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  Search, 
  RefreshCw, 
  X, 
  CreditCard,
  Tag,
  Building2,
  HelpCircle,
  Layers,
  Sparkles,
  Link2,
  ExternalLink,
  Zap,
  CheckCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PayItem {
  id: number;
  name: string;
  category: 'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance';
  rate_type: string;
  xero_earnings_rate_id: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface XeroRateItem {
  id: string;
  name: string;
  earningsType: string;
  rateType: string;
  typeOfUnits: string;
  ratePerUnit: number;
  multiplier: number;
  accrueLeave?: boolean;
  isExemptFromTax?: boolean;
  isExemptFromSuper?: boolean;
  currentRecord?: boolean;
  suggestedCategory: 'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance';
}

export default function PayItemsSettings() {
  const { token } = useAuth();
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMappingStatus, setSelectedMappingStatus] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-line editing state for Xero Earnings Rate IDs
  const [editedXeroIds, setEditedXeroIds] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<number | null>(null);

  // Xero live integration & sync state
  const [xeroData, setXeroData] = useState<{
    connected: boolean;
    tenantName?: string;
    earningsRates: XeroRateItem[];
    lastSync?: string | null;
    error?: string;
    needsReconnect?: boolean;
  }>({
    connected: false,
    earningsRates: []
  });
  const [syncingXero, setSyncingXero] = useState(false);
  const [loadingXero, setLoadingXero] = useState(false);

  // Add Pay Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Ordinary' | 'Penalty' | 'Overtime' | 'Allowance'>('Ordinary');
  const [newItemRateType, setNewItemRateType] = useState('Hourly');
  const [newItemXeroId, setNewItemXeroId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Pay Item Modal State
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);

  const fetchPayItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/pay-items', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        const items: PayItem[] = Array.isArray(data) ? data : (data.payItems || data.pay_items || []);
        setPayItems(items);

        // Prepopulate the local edit state with current Xero IDs
        const edits: Record<number, string> = {};
        items.forEach(item => {
          edits[item.id] = item.xero_earnings_rate_id || '';
        });
        setEditedXeroIds(edits);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'Failed to load pay items');
      }
    } catch (e: any) {
      console.error('Error fetching pay items:', e);
      showNotification('error', e.message || 'Network error fetching pay items');
    } finally {
      setLoading(false);
    }
  };

  const fetchXeroPayItems = async () => {
    setLoadingXero(true);
    try {
      const res = await fetch('/api/xero/pay-items', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setXeroData({
          connected: !!data.connected,
          tenantName: data.tenantName || '',
          earningsRates: Array.isArray(data.earningsRates) ? data.earningsRates : [],
          lastSync: data.lastSync || null,
          error: data.error,
          needsReconnect: !!data.needsReconnect
        });
      }
    } catch (e: any) {
      console.warn('Error checking Xero pay items:', e);
    } finally {
      setLoadingXero(false);
    }
  };

  useEffect(() => {
    fetchPayItems();
    fetchXeroPayItems();
  }, []);

  const handleSyncFromXero = async () => {
    setSyncingXero(true);
    try {
      const res = await fetch('/api/settings/pay-items/sync-xero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Xero');
      }

      showNotification('success', data.message || `Successfully synced ${data.total || 0} pay items from Xero!`);
      await fetchPayItems();
      await fetchXeroPayItems();
    } catch (e: any) {
      showNotification('error', e.message || 'Error syncing pay items with Xero');
    } finally {
      setSyncingXero(false);
    }
  };

  const handleAutoMatchByName = async () => {
    if (!xeroData.earningsRates.length) {
      showNotification('error', 'No Xero earnings rates loaded. Click "Sync from Xero" first.');
      return;
    }

    let matchCount = 0;
    const newEdits = { ...editedXeroIds };

    for (const item of payItems) {
      const currentId = item.xero_earnings_rate_id || '';
      if (!currentId.trim()) {
        const itemNameClean = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = xeroData.earningsRates.find(xr => {
          const xrNameClean = xr.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return xrNameClean.includes(itemNameClean) || itemNameClean.includes(xrNameClean);
        });

        if (matched) {
          newEdits[item.id] = matched.id;
          matchCount++;
          try {
            await fetch(`/api/settings/pay-items/${item.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                xero_earnings_rate_id: matched.id
              })
            });
          } catch {}
        }
      }
    }

    setEditedXeroIds(newEdits);
    if (matchCount > 0) {
      showNotification('success', `Auto-matched and saved ${matchCount} pay items to Xero Earnings Rates!`);
      await fetchPayItems();
    } else {
      showNotification('error', 'No unmapped pay items could be matched by name.');
    }
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleXeroIdChange = (id: number, value: string) => {
    setEditedXeroIds(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSaveXeroId = async (item: PayItem) => {
    const rawVal = editedXeroIds[item.id];
    const newXeroId = rawVal !== undefined ? rawVal.trim() : (item.xero_earnings_rate_id || '');
    setSavingId(item.id);

    try {
      const res = await fetch(`/api/settings/pay-items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          xero_earnings_rate_id: newXeroId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update Xero ID');

      setPayItems(prev => prev.map(p => p.id === item.id ? { ...p, xero_earnings_rate_id: newXeroId } : p));
      setSavedSuccessId(item.id);
      setTimeout(() => setSavedSuccessId(null), 2500);
      showNotification('success', `Saved Xero Earnings Rate GUID for "${item.name}"`);
    } catch (e: any) {
      showNotification('error', e.message || 'Error updating Xero GUID');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreatePayItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showNotification('error', 'Pay Item Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/pay-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCategory,
          rate_type: newItemRateType.trim() || 'Hourly',
          xero_earnings_rate_id: newItemXeroId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pay item');

      showNotification('success', `Pay item "${newItemName.trim()}" created successfully!`);
      setShowAddModal(false);
      setNewItemName('');
      setNewItemCategory('Ordinary');
      setNewItemRateType('Hourly');
      setNewItemXeroId('');
      fetchPayItems();
    } catch (e: any) {
      showNotification('error', e.message || 'Error creating pay item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItemDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) {
      showNotification('error', 'Pay Item Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/settings/pay-items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: editingItem.name.trim(),
          category: editingItem.category,
          rate_type: editingItem.rate_type.trim() || 'Hourly',
          xero_earnings_rate_id: (editingItem.xero_earnings_rate_id || '').trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pay item');

      showNotification('success', `Pay item "${editingItem.name}" updated successfully!`);
      setEditingItem(null);
      fetchPayItems();
    } catch (e: any) {
      showNotification('error', e.message || 'Error updating pay item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayItem = async (item: PayItem) => {
    if (!confirm(`Are you sure you want to remove pay item "${item.name}"?\n\nThis will deactivate it from timesheet rate calculations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/pay-items/${item.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete pay item');

      showNotification('success', `Pay item "${item.name}" deactivated.`);
      fetchPayItems();
    } catch (e: any) {
      showNotification('error', e.message || 'Error deleting pay item');
    }
  };

  // Filter Pay Items
  const filteredItems = payItems.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    
    const isMapped = !!(item.xero_earnings_rate_id && item.xero_earnings_rate_id.trim());
    if (selectedMappingStatus === 'MAPPED' && !isMapped) return false;
    if (selectedMappingStatus === 'UNMAPPED' && isMapped) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchXero = (item.xero_earnings_rate_id || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchXero) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalItems = payItems.length;
  const mappedCount = payItems.filter(i => !!(i.xero_earnings_rate_id && i.xero_earnings_rate_id.trim())).length;
  const unmappedCount = totalItems - mappedCount;
  const mappingPercent = totalItems > 0 ? Math.round((mappedCount / totalItems) * 100) : 0;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Ordinary':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Penalty':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Overtime':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Allowance':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-bg border border-border-subtle p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Pay Items &amp; Xero Earnings Rate Mapping
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Payroll Sync
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                  Award Engine
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Map each roster penalty, overtime, ordinary, and allowance pay item to its corresponding Xero Earnings Rate GUID for automated payroll export.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchPayItems}
            disabled={loading}
            className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh pay items from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {unmappedCount > 0 && xeroData.earningsRates.length > 0 && (
            <button
              type="button"
              onClick={handleAutoMatchByName}
              className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Auto-match unmapped pay items to Xero earnings rates with identical or similar names"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Auto-Match Rates</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncFromXero}
            disabled={syncingXero || loading}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-brand-navy rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Fetch latest Pay Items directly from Xero and sync to portal database"
          >
            <Zap className={`w-3.5 h-3.5 ${syncingXero ? 'animate-bounce' : ''}`} />
            <span>{syncingXero ? 'Syncing with Xero...' : 'Sync from Xero'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Pay Item</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics & Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-brand-bg border border-border-subtle rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block">Total Pay Items</span>
            <span className="text-xl font-bold text-white mt-1 block">{totalItems}</span>
          </div>
          <div className="p-2 bg-brand-navy rounded-lg border border-border-subtle text-zinc-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block">Mapped to Xero</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block flex items-center gap-2">
              {mappedCount} <span className="text-xs font-normal text-zinc-400 font-sans">({mappingPercent}%)</span>
            </span>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block">Unmapped Items</span>
            <span className={`text-xl font-bold mt-1 block ${unmappedCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {unmappedCount}
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${unmappedCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-brand-navy border-border-subtle text-zinc-600'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider block">Xero Payroll API</span>
            <span className="text-xs font-semibold text-sky-400 mt-1 block flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {xeroData.connected ? (xeroData.tenantName || 'Connected') : 'Disconnected'}
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${xeroData.connected ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Xero Live Sync & Status Bar */}
      <div className={`p-4 rounded-xl border transition-all text-xs ${
        xeroData.connected 
          ? 'bg-gradient-to-r from-sky-950/40 via-brand-navy to-emerald-950/20 border-sky-500/30 shadow-sm'
          : xeroData.needsReconnect
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            : 'bg-brand-navy/70 border-border-subtle text-zinc-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-lg border shrink-0 ${
              xeroData.connected
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                : xeroData.needsReconnect
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">
                  {xeroData.connected
                    ? `Connected to Xero: ${xeroData.tenantName || 'Organisation'}`
                    : xeroData.needsReconnect
                      ? 'Xero Payroll Scope Required'
                      : 'Xero Connection Ready'}
                </span>
                {xeroData.connected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync Ready
                  </span>
                )}
                {xeroData.earningsRates.length > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                    {xeroData.earningsRates.length} Xero Rates Found
                  </span>
                )}
              </div>

              <p className="text-zinc-400 text-xs mt-1">
                {xeroData.connected ? (
                  <>
                    Export and sync your live Xero Payroll Pay Items directly into the portal database.
                    {xeroData.lastSync && (
                      <span className="text-zinc-400 ml-1.5 font-medium">
                        • Last synced: {new Date(xeroData.lastSync).toLocaleString()}
                      </span>
                    )}
                  </>
                ) : xeroData.needsReconnect ? (
                  'Your Xero account is connected for Invoicing, but requires the Payroll scope (payroll.payitems). Reconnect Xero in Settings to grant payroll permissions.'
                ) : (
                  'Connect to Xero to export your live Xero Pay Items into the portal database and keep them synchronized automatically.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {xeroData.connected ? (
              <button
                type="button"
                onClick={handleSyncFromXero}
                disabled={syncingXero}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-brand-navy rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingXero ? 'animate-spin' : ''}`} />
                <span>{syncingXero ? 'Importing from Xero...' : 'Import & Sync from Xero'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const xeroTabBtn = document.querySelector('button:has(svg.lucide-building-2), button:has(svg.lucide-building)') as HTMLButtonElement;
                  if (xeroTabBtn) xeroTabBtn.click();
                  else showNotification('error', 'Go to Settings > Xero tab to connect your account.');
                }}
                className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Go to Xero Settings</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-brand-bg border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-[#8B949E] mr-1">Category:</span>
            {['ALL', 'Ordinary', 'Penalty', 'Overtime', 'Allowance'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-brand-teal text-brand-navy shadow-sm'
                    : 'bg-brand-navy text-[#8B949E] hover:text-white border border-border-subtle'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}

            <div className="h-4 w-px bg-border-subtle mx-1 hidden sm:block" />

            {/* Status Filter */}
            <span className="text-xs font-semibold text-[#8B949E] mr-1 hidden sm:inline">Status:</span>
            <button
              type="button"
              onClick={() => setSelectedMappingStatus(selectedMappingStatus === 'MAPPED' ? 'ALL' : 'MAPPED')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                selectedMappingStatus === 'MAPPED'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-brand-navy text-[#8B949E] hover:text-white border-border-subtle'
              }`}
            >
              Mapped ({mappedCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedMappingStatus(selectedMappingStatus === 'UNMAPPED' ? 'ALL' : 'UNMAPPED')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                selectedMappingStatus === 'UNMAPPED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-brand-navy text-[#8B949E] hover:text-white border-border-subtle'
              }`}
            >
              Unmapped ({unmappedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search pay item or Xero GUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-brand-navy border border-border-subtle rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#8B949E] text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-teal" />
              <span>Loading Pay Items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="p-3 bg-brand-navy/60 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-[#8B949E] border border-border-subtle">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Pay Items Found</h3>
              <p className="text-xs text-[#8B949E] max-w-md mx-auto">
                {payItems.length === 0 
                  ? 'No pay items exist yet. Click "Add Pay Item" to create your first rate mapping.'
                  : 'No pay items match the selected category, mapping filter, or search query.'}
              </p>
              {payItems.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Pay Item</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-brand-navy/70 text-[#8B949E] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Pay Item Name</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Rate Type</th>
                  <th className="py-3 px-3 font-semibold text-center">Mapping Status</th>
                  <th className="py-3 px-4 font-semibold min-w-[320px]">Xero Earnings Rate ID (GUID)</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredItems.map((item) => {
                  const currentInputVal = editedXeroIds[item.id] !== undefined ? editedXeroIds[item.id] : (item.xero_earnings_rate_id || '');
                  const isDirty = currentInputVal !== (item.xero_earnings_rate_id || '');
                  const isMapped = !!(item.xero_earnings_rate_id && item.xero_earnings_rate_id.trim());
                  const isSavingThis = savingId === item.id;
                  const isSavedThis = savedSuccessId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-brand-navy/50 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-teal/80" />
                          <span>{item.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Rate Type */}
                      <td className="py-3 px-3 whitespace-nowrap text-zinc-300 font-medium">
                        {item.rate_type || 'Hourly'}
                      </td>

                      {/* Mapping Status Indicator Badge */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        {isMapped ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Mapped</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Unmapped</span>
                          </span>
                        )}
                      </td>

                      {/* Editable Xero Earnings Rate ID with In-line Save Button & Dropdown Picker */}
                      <td className="py-2 px-4 min-w-[340px]">
                        {(() => {
                          const matchedXero = xeroData.earningsRates.find(xr => xr.id === (item.xero_earnings_rate_id || currentInputVal));
                          return (
                            <div className="space-y-1.5">
                              {matchedXero && (
                                <div className="text-[10px] text-sky-400 font-medium flex items-center gap-1.5 bg-sky-950/30 border border-sky-500/20 px-2 py-0.5 rounded">
                                  <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                                  <span>Xero: <strong>{matchedXero.name}</strong> ({matchedXero.earningsType || matchedXero.rateType})</span>
                                </div>
                              )}

                              {xeroData.earningsRates.length > 0 && (
                                <select
                                  value={xeroData.earningsRates.some(r => r.id === currentInputVal) ? currentInputVal : ''}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleXeroIdChange(item.id, e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-[11px] bg-brand-navy border border-border-subtle rounded text-zinc-300 focus:outline-none focus:border-brand-teal"
                                >
                                  <option value="">-- Select from {xeroData.earningsRates.length} Xero Rates --</option>
                                  {xeroData.earningsRates.map(xr => (
                                    <option key={xr.id} value={xr.id}>
                                      {xr.name} ({xr.earningsType || xr.rateType})
                                    </option>
                                  ))}
                                </select>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={currentInputVal}
                                  onChange={(e) => handleXeroIdChange(item.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveXeroId(item);
                                    }
                                  }}
                                  placeholder="e.g. 7c32bf90-345f-4a11-85bc-9174dfbc029a"
                                  className={`flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-brand-navy border text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                                    isDirty 
                                      ? 'border-brand-teal ring-1 ring-brand-teal/40 bg-brand-navy/90' 
                                      : isMapped
                                        ? 'border-emerald-500/30'
                                        : 'border-border-subtle focus:border-brand-teal'
                                  }`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveXeroId(item)}
                                  disabled={isSavingThis}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 ${
                                    isSavedThis
                                      ? 'bg-emerald-500 text-brand-navy font-bold'
                                      : isDirty
                                        ? 'bg-brand-teal hover:bg-brand-teal/90 text-brand-navy shadow-md animate-pulse'
                                        : 'bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle'
                                  }`}
                                  title="Save Xero Earnings Rate GUID"
                                >
                                  {isSavingThis ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : isSavedThis ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isSavedThis ? 'Saved' : 'Save'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Pay Item Name & Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayItem(item)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                            title="Deactivate Pay Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        {filteredItems.length > 0 && (
          <div className="p-3 bg-brand-navy/60 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8B949E] gap-2">
            <span>
              Showing {filteredItems.length} of {payItems.length} pay items ({selectedCategory === 'ALL' ? 'All Categories' : selectedCategory})
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="text-emerald-400 font-semibold">{mappedCount} mapped</span>
              <span>/</span>
              <span className="text-amber-400 font-semibold">{unmappedCount} unmapped</span>
            </span>
          </div>
        )}
      </div>

      {/* Add Pay Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-navy border border-border-subtle rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Pay Item</h3>
                  <p className="text-xs text-[#8B949E]">Create an award pay item and map it to Xero.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayItem} className="p-5 space-y-4 text-xs">
              {/* Quick Auto-Fill from Xero */}
              {xeroData.earningsRates.length > 0 && (
                <div className="p-3 bg-brand-bg/80 border border-sky-500/25 rounded-lg space-y-1.5">
                  <label className="block text-sky-400 font-semibold text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Quick Auto-Fill from Xero Rate:</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const matched = xeroData.earningsRates.find(xr => xr.id === selectedId);
                      if (matched) {
                        setNewItemName(matched.name);
                        setNewItemCategory(matched.suggestedCategory);
                        setNewItemRateType(matched.typeOfUnits === 'Hours' ? 'Hourly' : (matched.typeOfUnits || 'Hourly'));
                        setNewItemXeroId(matched.id);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-brand-navy border border-border-subtle rounded text-white text-xs focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">-- Choose Xero Rate ({xeroData.earningsRates.length} available) --</option>
                    {xeroData.earningsRates.map(xr => (
                      <option key={xr.id} value={xr.id}>
                        {xr.name} ({xr.earningsType || xr.rateType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">
                  Pay Item Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Afternoon Shift Penalty, Client Transport Allowance"
                  className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8B949E] font-medium mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e: any) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Ordinary">Ordinary</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Overtime">Overtime</option>
                    <option value="Allowance">Allowance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8B949E] font-medium mb-1">
                    Rate Type
                  </label>
                  <select
                    value={newItemRateType}
                    onChange={(e) => setNewItemRateType(e.target.value)}
                    className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Hourly">Hourly</option>
                    <option value="Fixed Rate">Fixed Rate</option>
                    <option value="Per KM">Per KM</option>
                    <option value="Per Shift">Per Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1 flex items-center justify-between">
                  <span>Xero Earnings Rate ID (GUID)</span>
                  <span className="text-[10px] text-zinc-500">Optional (can map later)</span>
                </label>
                <input
                  type="text"
                  value={newItemXeroId}
                  onChange={(e) => setNewItemXeroId(e.target.value)}
                  placeholder="e.g. 7c32bf90-345f-4a11-85bc-9174dfbc029a"
                  className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-[#8B949E] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Pay Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pay Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-navy border border-border-subtle rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Pay Item</h3>
                  <p className="text-xs text-[#8B949E]">Update pay item details and mapping.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateItemDetails} className="p-5 space-y-4 text-xs">
              {/* Quick Pick from Xero */}
              {xeroData.earningsRates.length > 0 && (
                <div className="p-3 bg-brand-bg/80 border border-sky-500/25 rounded-lg space-y-1.5">
                  <label className="block text-sky-400 font-semibold text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Choose Xero Earnings Rate to Map:</span>
                  </label>
                  <select
                    value={xeroData.earningsRates.some(r => r.id === editingItem.xero_earnings_rate_id) ? editingItem.xero_earnings_rate_id : ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) return;
                      const matched = xeroData.earningsRates.find(xr => xr.id === selectedId);
                      if (matched) {
                        setEditingItem({
                          ...editingItem,
                          xero_earnings_rate_id: matched.id,
                          rate_type: matched.typeOfUnits === 'Hours' ? 'Hourly' : (matched.typeOfUnits || editingItem.rate_type)
                        });
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-brand-navy border border-border-subtle rounded text-white text-xs focus:outline-none focus:border-brand-teal"
                  >
                    <option value="">-- Select from {xeroData.earningsRates.length} Xero Rates --</option>
                    {xeroData.earningsRates.map(xr => (
                      <option key={xr.id} value={xr.id}>
                        {xr.name} ({xr.earningsType || xr.rateType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">
                  Pay Item Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8B949E] font-medium mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={(e: any) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Ordinary">Ordinary</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Overtime">Overtime</option>
                    <option value="Allowance">Allowance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8B949E] font-medium mb-1">
                    Rate Type
                  </label>
                  <select
                    value={editingItem.rate_type || 'Hourly'}
                    onChange={(e) => setEditingItem({ ...editingItem, rate_type: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  >
                    <option value="Hourly">Hourly</option>
                    <option value="Fixed Rate">Fixed Rate</option>
                    <option value="Per KM">Per KM</option>
                    <option value="Per Shift">Per Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">
                  Xero Earnings Rate ID (GUID)
                </label>
                <input
                  type="text"
                  value={editingItem.xero_earnings_rate_id || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, xero_earnings_rate_id: e.target.value })}
                  placeholder="e.g. 7c32bf90-345f-4a11-85bc-9174dfbc029a"
                  className="w-full px-3 py-2 bg-brand-bg border border-border-subtle rounded-lg text-white font-mono focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-[#8B949E] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
