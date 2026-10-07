import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Briefcase,
  Users,
  Award,
  Info
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

export interface PositionPayRule {
  id?: number;
  category_key: string;
  xero_earnings_rate_id: string;
  pay_item_name: string;
  multiplier: number;
}

export interface PositionItem {
  id: number;
  name: string;
  employment_type?: string;
  description?: string;
  staff_count: number;
  assigned_staff?: { id: number; name: string; avatar_url?: string }[];
  pay_rules: Record<string, PositionPayRule>;
}

export const PAY_RULE_CATEGORIES = [
  { 
    key: 'weekday', 
    label: 'Ordinary Time Earnings (Weekday)', 
    multiplierBadge: '1.0x Base', 
    description: 'Standard hourly pay rate for Monday to Friday rostered care hours',
    colorTheme: 'emerald'
  },
  { 
    key: 'saturday', 
    label: 'Saturday Penalty (150%)', 
    multiplierBadge: '1.5x Penalty', 
    description: '150% penalty rate for all Saturday shifts under SCHADS Award',
    colorTheme: 'amber'
  },
  { 
    key: 'sunday', 
    label: 'Sunday Penalty (200%)', 
    multiplierBadge: '2.0x Penalty', 
    description: '200% penalty rate for Sunday rostered shifts',
    colorTheme: 'orange'
  },
  { 
    key: 'public_holiday', 
    label: 'Public Holiday (250%)', 
    multiplierBadge: '2.5x Penalty', 
    description: '250% penalty rate for official public holiday shifts',
    colorTheme: 'rose'
  },
  { 
    key: 'night_shift', 
    label: 'Active Night Shift Loading', 
    multiplierBadge: '1.15x Night', 
    description: 'Shift loading for active overnight shifts spanning past 8:00 PM',
    colorTheme: 'indigo'
  },
  { 
    key: 'sleepover', 
    label: 'Sleepover Allowance', 
    multiplierBadge: 'Flat / Night', 
    description: 'Designated flat allowance for inactive sleepover care shifts',
    colorTheme: 'purple'
  },
  { 
    key: 'ndis_travel', 
    label: 'NDIS Travel Allowance', 
    multiplierBadge: 'Per Km', 
    description: 'Per kilometre staff travel reimbursement for NDIS client shifts ($0.99/km)',
    colorTheme: 'teal'
  },
  { 
    key: 'home_care_travel', 
    label: 'Home Care Travel Allowance', 
    multiplierBadge: 'Per Km / Hr', 
    description: 'Reimbursement rate for Home Care Package (HCP) staff travel and transport',
    colorTheme: 'sky'
  },
];

export default function PayItemsSettings() {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'POSITIONS' | 'XERO_CATALOG'>('POSITIONS');

  // Positions State
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [positionSearch, setPositionSearch] = useState('');
  const [savingPosId, setSavingPosId] = useState<number | null>(null);
  const [autoMappingPosId, setAutoMappingPosId] = useState<number | null>(null);

  // Position Modals
  const [isAddPosModalOpen, setIsAddPosModalOpen] = useState(false);
  const [newPosData, setNewPosData] = useState({
    name: '',
    employment_type: 'Casual',
    description: '',
    autoMapOnCreate: true
  });
  const [editingPos, setEditingPos] = useState<PositionItem | null>(null);

  // Raw Pay Items State
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMappingStatus, setSelectedMappingStatus] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-line editing state for Xero Earnings Rate IDs in raw catalog
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

  // Edit Pay Item Modal State
  const [editingItem, setEditingItem] = useState<PayItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const res = await fetch('/api/positions', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'Failed to load positions');
      }
    } catch (e: any) {
      console.error('Error fetching positions:', e);
      showNotification('error', e.message || 'Error fetching positions');
    } finally {
      setLoadingPositions(false);
    }
  };

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
    fetchPositions();
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
      await Promise.all([fetchPayItems(), fetchXeroPayItems(), fetchPositions()]);
    } catch (e: any) {
      showNotification('error', e.message || 'Error syncing pay items with Xero');
    } finally {
      setSyncingXero(false);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosData.name.trim()) return;
    try {
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newPosData.name.trim(),
          employment_type: newPosData.employment_type,
          description: newPosData.description.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create position');
      }

      if (newPosData.autoMapOnCreate && data.id) {
        await fetch(`/api/admin/positions/${data.id}/auto-map`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        }).catch(() => {});
      }

      showNotification('success', `Created classification "${newPosData.name.trim()}"`);
      setIsAddPosModalOpen(false);
      setNewPosData({ name: '', employment_type: 'Casual', description: '', autoMapOnCreate: true });
      await fetchPositions();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create position');
    }
  };

  const handleUpdatePositionDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPos || !editingPos.name.trim()) return;
    try {
      const res = await fetch(`/api/admin/positions/${editingPos.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: editingPos.name.trim(),
          employment_type: editingPos.employment_type || 'Casual',
          description: editingPos.description || ''
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update position');
      }
      showNotification('success', `Updated classification "${editingPos.name}"`);
      setEditingPos(null);
      await fetchPositions();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update position');
    }
  };

  const handleDeletePosition = async (posId: number, posName: string) => {
    if (!confirm(`Are you sure you want to delete "${posName}"? Any staff assigned to this role will need their position reassigned.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/positions/${posId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete position');
      }
      showNotification('success', `Deleted position "${posName}"`);
      await fetchPositions();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete position');
    }
  };

  const handleAutoMapPosition = async (posId: number, posName: string) => {
    setAutoMappingPosId(posId);
    try {
      const res = await fetch(`/api/admin/positions/${posId}/auto-map`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-map pay items');
      }
      showNotification('success', `Auto-mapped matching Xero pay rates for "${posName}"`);
      await fetchPositions();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to auto-map position');
    } finally {
      setAutoMappingPosId(null);
    }
  };

  const handleUpdatePositionPayRule = async (posId: number, categoryKey: string, xeroEarningsRateId: string) => {
    setSavingPosId(posId);
    const selectedPayItem = payItems.find(p => p.xero_earnings_rate_id === xeroEarningsRateId);
    const rateName = selectedPayItem ? selectedPayItem.name : '';

    // Update local state immediately
    setPositions(prev => prev.map(p => {
      if (p.id === posId) {
        return {
          ...p,
          pay_rules: {
            ...p.pay_rules,
            [categoryKey]: {
              category_key: categoryKey,
              xero_earnings_rate_id: xeroEarningsRateId,
              pay_item_name: rateName,
              multiplier: 1.0
            }
          }
        };
      }
      return p;
    }));

    try {
      const currentPos = positions.find(p => p.id === posId);
      const updatedRules = {
        ...(currentPos?.pay_rules || {}),
        [categoryKey]: {
          xero_earnings_rate_id: xeroEarningsRateId,
          pay_item_name: rateName,
          multiplier: 1.0
        }
      };

      const res = await fetch(`/api/admin/positions/${posId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: currentPos?.name || '',
          pay_rules: updatedRules
        })
      });
      if (!res.ok) {
        fetchPositions();
      }
    } catch (err) {
      console.error('Failed to save position pay rule:', err);
      fetchPositions();
    } finally {
      setSavingPosId(null);
    }
  };

  // Filter positions
  const filteredPositions = useMemo(() => {
    return positions.filter(pos => {
      if (!positionSearch.trim()) return true;
      const q = positionSearch.toLowerCase();
      return (
        pos.name.toLowerCase().includes(q) ||
        (pos.employment_type && pos.employment_type.toLowerCase().includes(q)) ||
        (pos.description && pos.description.toLowerCase().includes(q))
      );
    });
  }, [positions, positionSearch]);

  // Overall metrics
  const totalPositionsCount = positions.length;
  const fullyMappedPositionsCount = positions.filter(p => {
    const rules = p.pay_rules || {};
    return !!(rules.weekday?.xero_earnings_rate_id && rules.saturday?.xero_earnings_rate_id && rules.sunday?.xero_earnings_rate_id && rules.public_holiday?.xero_earnings_rate_id);
  }).length;
  const totalStaffAssignedCount = positions.reduce((acc, curr) => acc + (curr.staff_count || 0), 0);
  const totalSyncedPayItems = payItems.filter(p => !!p.xero_earnings_rate_id).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {statusMessage && (
        <div 
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-bg border border-border-subtle p-5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Award Pay Rates &amp; Positions Architecture
              </h2>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                SCHADS Award Engine
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                Xero Connected
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Three-Layer Role Architecture: manage defined job classifications, map each role to its Xero pay items, and let staff inherit award rules automatically.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchPositions();
              fetchPayItems();
              fetchXeroPayItems();
            }}
            disabled={loadingPositions || loading}
            className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh positions and pay items"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingPositions || loading) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSyncFromXero}
            disabled={syncingXero || loading}
            className="px-3.5 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Sync latest Earnings Rates from Xero Payroll"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingXero ? 'animate-spin' : ''}`} />
            <span>{syncingXero ? 'Syncing with Xero...' : 'Pull Rates from Xero'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPosModalOpen(true)}
            className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Position</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <span className="font-medium">Total Positions</span>
            <Briefcase className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {totalPositionsCount}
          </div>
          <p className="text-[11px] text-zinc-500">Defined classifications</p>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <span className="font-medium">Fully Mapped Roles</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {fullyMappedPositionsCount} <span className="text-xs text-zinc-500 font-normal">/ {totalPositionsCount}</span>
          </div>
          <p className="text-[11px] text-zinc-500">Ordinary &amp; penalty ready</p>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <span className="font-medium">Staff Assigned</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {totalStaffAssignedCount}
          </div>
          <p className="text-[11px] text-zinc-500">Inheriting award pay rates</p>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8B949E]">
            <span className="font-medium">Xero Pay Items</span>
            <CreditCard className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 tracking-tight">
            {totalSyncedPayItems}
          </div>
          <p className="text-[11px] text-zinc-500">Synced payroll earnings rates</p>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('POSITIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'POSITIONS'
              ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/30 shadow-sm'
              : 'text-[#8B949E] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Positions Catalog &amp; Pay Rules ({positions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('XERO_CATALOG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'XERO_CATALOG'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
              : 'text-[#8B949E] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Synced Xero Pay Items Catalog ({payItems.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: POSITIONS CATALOG & POSITION PAY RULES        */}
      {/* ======================================================== */}
      {activeSubTab === 'POSITIONS' && (
        <div className="space-y-6">
          {/* Controls & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-bg/60 border border-border-subtle p-3 rounded-xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search job classifications or employment types..."
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                className="w-full bg-[#121214] border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
              />
              {positionSearch && (
                <button
                  type="button"
                  onClick={() => setPositionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-[#8B949E]">
              <Info className="w-3.5 h-3.5 text-brand-teal" />
              <span>Workers in Staff directory inherit their position's mapped rates automatically.</span>
            </div>
          </div>

          {/* Positions List */}
          {loadingPositions ? (
            <div className="flex flex-col items-center justify-center p-12 text-[#8B949E] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-teal" />
              <span className="text-xs">Loading Positions Catalog...</span>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="p-12 text-center bg-brand-bg border border-border-subtle rounded-xl space-y-3">
              <Briefcase className="w-10 h-10 mx-auto text-zinc-600" />
              <h3 className="text-sm font-semibold text-white">No Positions Found</h3>
              <p className="text-xs text-[#8B949E] max-w-md mx-auto">
                {positionSearch ? 'No positions match your search term.' : 'Create your first job classification (e.g. Support Worker – Level 2.1) to begin mapping Xero award pay rates.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAddPosModalOpen(true)}
                className="px-4 py-2 bg-brand-teal text-brand-navy font-bold rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Position</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPositions.map((pos) => {
                const rules = pos.pay_rules || {};
                const mappedCount = PAY_RULE_CATEGORIES.filter(cat => !!rules[cat.key]?.xero_earnings_rate_id).length;
                const isFullyMapped = mappedCount >= 4;

                return (
                  <div
                    key={pos.id}
                    className="bg-brand-bg border border-border-subtle rounded-xl overflow-hidden shadow-sm transition-all hover:border-zinc-700"
                  >
                    {/* Position Card Header */}
                    <div className="p-4 bg-white/[0.02] border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-base font-bold text-white tracking-wide">
                            {pos.name}
                          </h3>
                          {pos.employment_type && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30">
                              {pos.employment_type}
                            </span>
                          )}
                          <span 
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                              isFullyMapped 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isFullyMapped ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{mappedCount}/{PAY_RULE_CATEGORIES.length} Pay Rules Mapped</span>
                          </span>
                        </div>

                        {pos.description && (
                          <p className="text-xs text-[#8B949E] line-clamp-1">
                            {pos.description}
                          </p>
                        )}

                        {/* Assigned Staff Preview */}
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 flex-wrap">
                          <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="font-semibold text-zinc-300">
                            {pos.staff_count} {pos.staff_count === 1 ? 'Staff Member' : 'Staff Members'} Assigned:
                          </span>
                          {pos.assigned_staff && pos.assigned_staff.length > 0 ? (
                            <span className="text-zinc-400">
                              {pos.assigned_staff.slice(0, 5).map(s => s.name).join(', ')}
                              {pos.assigned_staff.length > 5 ? ` +${pos.assigned_staff.length - 5} more` : ''}
                            </span>
                          ) : (
                            <span className="text-zinc-500 italic">None assigned in /staff yet</span>
                          )}
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAutoMapPosition(pos.id, pos.name)}
                          disabled={autoMappingPosId === pos.id || payItems.length === 0}
                          className="px-2.5 py-1.5 bg-brand-navy hover:bg-zinc-800 text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Automatically scan synced Xero pay items and map matching ordinary, penalty, and allowance rates"
                        >
                          <Zap className={`w-3.5 h-3.5 ${autoMappingPosId === pos.id ? 'animate-spin' : ''}`} />
                          <span>{autoMappingPosId === pos.id ? 'Auto-Matching...' : 'Auto-Match from Xero'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPos(pos)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                          title="Edit Position Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePosition(pos.id, pos.name)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                          title="Delete Position"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Position Pay Rules Matrix */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-black/20">
                      {PAY_RULE_CATEGORIES.map(cat => {
                        const rule = rules[cat.key];
                        const isMapped = !!(rule && rule.xero_earnings_rate_id);

                        return (
                          <div 
                            key={cat.key}
                            className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                              isMapped 
                                ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]' 
                                : 'bg-red-500/[0.02] border-red-500/20'
                            }`}
                          >
                            <div className="space-y-1 mb-2.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-semibold text-zinc-200 truncate">
                                  {cat.label}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider font-mono bg-zinc-800 text-zinc-400 shrink-0">
                                  {cat.multiplierBadge}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-tight line-clamp-1">
                                {cat.description}
                              </p>
                            </div>

                            {/* Dropdown Selector */}
                            <div className="space-y-1">
                              <select
                                value={rule?.xero_earnings_rate_id || ''}
                                onChange={(e) => handleUpdatePositionPayRule(pos.id, cat.key, e.target.value)}
                                disabled={savingPosId === pos.id}
                                className={`w-full text-[11px] rounded-md px-2 py-1.5 outline-none transition-colors cursor-pointer truncate ${
                                  isMapped
                                    ? 'bg-[#121214] border border-white/10 text-white focus:border-brand-teal'
                                    : 'bg-[#161314] border border-amber-500/30 text-amber-300 focus:border-amber-400'
                                }`}
                              >
                                <option value="">-- Select Xero Pay Item --</option>
                                {payItems.map(pi => (
                                  <option key={pi.id} value={pi.xero_earnings_rate_id}>
                                    {pi.name} ({pi.category})
                                  </option>
                                ))}
                              </select>

                              {isMapped ? (
                                <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-0.5">
                                  <span className="flex items-center gap-1 truncate">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">{rule.pay_item_name || 'Mapped'}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePositionPayRule(pos.id, cat.key, '')}
                                    className="text-[9px] text-zinc-500 hover:text-rose-400 underline ml-1 shrink-0"
                                  >
                                    Clear
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-400/90 flex items-center gap-1 pt-0.5">
                                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Not mapped to Xero</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: SYNCED XERO PAY ITEMS CATALOG                 */}
      {/* ======================================================== */}
      {activeSubTab === 'XERO_CATALOG' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-bg/60 border border-border-subtle p-4 rounded-xl">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Xero pay items or rate GUIDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121214] border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#8B949E]">Category:</span>
              {(['ALL', 'Ordinary', 'Penalty', 'Overtime', 'Allowance'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'
                      : 'text-[#8B949E] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pay Items Table */}
          <div className="bg-brand-bg border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E6EDF3]">
                <thead className="bg-brand-navy/60 text-[#8B949E] border-b border-border-subtle text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Pay Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Rate Type</th>
                    <th className="py-3 px-4">Xero Earnings Rate ID (GUID)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {payItems
                    .filter(pi => {
                      if (selectedCategory !== 'ALL' && pi.category !== selectedCategory) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        return (
                          pi.name.toLowerCase().includes(q) ||
                          pi.xero_earnings_rate_id?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            item.category === 'Ordinary' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            item.category === 'Penalty' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            item.category === 'Overtime' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                            'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {item.rate_type || 'Hourly'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300">
                          {item.xero_earnings_rate_id || <span className="text-zinc-600 italic">Not set</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.xero_earnings_rate_id ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Unlinked</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {payItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 space-y-2">
                        <CreditCard className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                        <p className="text-sm font-medium text-white">No Pay Items in Portal Database</p>
                        <p className="text-xs text-zinc-400">Click "Pull Rates from Xero" above to import your organization's pay items.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW POSITION CLASSIFICATION                   */}
      {/* ======================================================== */}
      {isAddPosModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#151518]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-teal" />
                <h2 className="text-base font-bold text-white">Create Job Classification</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddPosModalOpen(false)} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePosition} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Classification Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Support Worker – Level 2.1 (Casual) or Domestic Cleaner"
                  value={newPosData.name}
                  onChange={(e) => setNewPosData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={newPosData.employment_type}
                  onChange={(e) => setNewPosData(prev => ({ ...prev, employment_type: e.target.value }))}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                >
                  <option value="Casual">Casual</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description / Award Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of this role's duties, SCHADS award level, or specific rate rules..."
                  value={newPosData.description}
                  onChange={(e) => setNewPosData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPosData.autoMapOnCreate}
                    onChange={(e) => setNewPosData(prev => ({ ...prev, autoMapOnCreate: e.target.checked }))}
                    className="rounded bg-black/40 border-white/10 text-brand-teal focus:ring-brand-teal"
                  />
                  <span>Automatically scan and map matching Xero pay rates on creation</span>
                </label>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPosModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPosData.name.trim()}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Create Classification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT POSITION DETAILS                             */}
      {/* ======================================================== */}
      {editingPos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#151518]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-teal" />
                <h2 className="text-base font-bold text-white">Edit Classification Details</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingPos(null)} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePositionDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Classification Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingPos.name}
                  onChange={(e) => setEditingPos(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={editingPos.employment_type || 'Casual'}
                  onChange={(e) => setEditingPos(prev => prev ? ({ ...prev, employment_type: e.target.value }) : null)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                >
                  <option value="Casual">Casual</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingPos.description || ''}
                  onChange={(e) => setEditingPos(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPos(null)}
                  className="px-4 py-2 bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingPos.name.trim()}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
