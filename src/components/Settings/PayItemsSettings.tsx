import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  Award,
  Zap,
  Info,
  Plus
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

export interface PayCategoryRule {
  id?: number;
  rule_key: string;
  xero_earnings_rate_id: string;
  pay_item_name: string;
  multiplier: number;
}

export interface PayCategoryItem {
  id: number;
  name: string;
  xero_earnings_rate_id?: string;
  employment_type?: string;
  description?: string;
  staff_count: number;
  assigned_staff?: { id: number; name: string; avatar_url?: string }[];
  pay_rules: Record<string, PayCategoryRule>;
}

export const PAY_RULE_CATEGORIES = [
  { 
    key: 'weekday', 
    label: 'Ordinary Weekday Shifts', 
    multiplierBadge: 'Weekday', 
    description: 'Standard hourly pay rate for Monday to Friday rostered care hours',
    colorTheme: 'emerald'
  },
  { 
    key: 'saturday', 
    label: 'Saturday Shift Rate', 
    multiplierBadge: 'Saturday', 
    description: 'Rostered Saturday care shift pay item from Xero',
    colorTheme: 'amber'
  },
  { 
    key: 'sunday', 
    label: 'Sunday Shift Rate', 
    multiplierBadge: 'Sunday', 
    description: 'Rostered Sunday care shift pay item from Xero',
    colorTheme: 'orange'
  },
  { 
    key: 'public_holiday', 
    label: 'Public Holiday Rate', 
    multiplierBadge: 'Public Holiday', 
    description: 'Official public holiday rostered care shift pay item from Xero',
    colorTheme: 'rose'
  },
  { 
    key: 'night_shift', 
    label: 'Active Night Shift Loading', 
    multiplierBadge: 'Night Loading', 
    description: 'Shift loading pay item for active overnight shifts',
    colorTheme: 'indigo'
  },
  { 
    key: 'sleepover', 
    label: 'Sleepover Allowance', 
    multiplierBadge: 'Sleepover', 
    description: 'Designated flat allowance for inactive sleepover care shifts',
    colorTheme: 'purple'
  },
  { 
    key: 'ndis_travel', 
    label: 'NDIS Travel Allowance', 
    multiplierBadge: 'Per Km', 
    description: 'Per kilometre staff travel reimbursement for NDIS client shifts',
    colorTheme: 'teal'
  },
  { 
    key: 'home_care_travel', 
    label: 'Home Care Travel Allowance', 
    multiplierBadge: 'Travel Time', 
    description: 'Decimal fraction of an hour (time) travel allowance for Home Care shifts',
    colorTheme: 'sky'
  },
];

export default function PayItemsSettings() {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'CATEGORIES' | 'XERO_CATALOG'>('CATEGORIES');

  // Pay Categories State (Pulled from Xero)
  const [payCategories, setPayCategories] = useState<PayCategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);
  const [savedRuleKey, setSavedRuleKey] = useState<string | null>(null);
  const [autoMappingCatId, setAutoMappingCatId] = useState<number | null>(null);
  const [editingCat, setEditingCat] = useState<PayCategoryItem | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', employment_type: 'Casual', description: '' });

  // Raw Pay Items State
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const fetchPayCategories = async () => {
    setLoadingCategories(true);
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch('/api/pay-categories', {
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setPayCategories(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'Failed to load pay categories');
      }
    } catch (e: any) {
      console.error('Error fetching pay categories:', e);
      showNotification('error', e.message || 'Error fetching pay categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchPayItems = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch('/api/settings/pay-items', {
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        const items: PayItem[] = Array.isArray(data) ? data : (data.payItems || data.pay_items || []);
        setPayItems(items);
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
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch('/api/xero/pay-items', {
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
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
    }
  };

  useEffect(() => {
    fetchPayCategories();
    fetchPayItems();
    fetchXeroPayItems();
  }, []);

  const handleSyncFromXero = async () => {
    setSyncingXero(true);
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch('/api/settings/pay-items/sync-xero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync with Xero');
      }

      showNotification('success', data.message || `Successfully synced ${data.total || 0} pay items from Xero!`);
      await Promise.all([fetchPayItems(), fetchXeroPayItems(), fetchPayCategories()]);
    } catch (e: any) {
      showNotification('error', e.message || 'Error syncing pay items with Xero');
    } finally {
      setSyncingXero(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch('/api/pay-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          name: newCat.name.trim(),
          employment_type: newCat.employment_type || 'Casual',
          description: newCat.description || ''
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create pay category');
      }
      showNotification('success', `Created pay category "${newCat.name}"`);
      setIsAddingCat(false);
      setNewCat({ name: '', employment_type: 'Casual', description: '' });
      await fetchPayCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to create pay category');
    }
  };

  const handleUpdateCategoryDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.name.trim()) return;
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`/api/pay-categories/${editingCat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          name: editingCat.name.trim(),
          employment_type: editingCat.employment_type || 'Casual',
          description: editingCat.description || ''
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update pay category');
      }
      showNotification('success', `Updated pay category "${editingCat.name}"`);
      setEditingCat(null);
      await fetchPayCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update pay category');
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`Are you sure you want to delete Pay Category "${catName}"? Any staff assigned to this category will need to have a new category assigned.`)) {
      return;
    }
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`/api/pay-categories/${catId}`, {
        method: 'DELETE',
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete pay category');
      }
      showNotification('success', `Deleted pay category "${catName}"`);
      await fetchPayCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete pay category');
    }
  };

  const handleDeletePayItem = async (itemId: number, itemName: string) => {
    if (!confirm(`Are you sure you want to remove pay item "${itemName}" from your portal?`)) {
      return;
    }
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`/api/settings/pay-items/${itemId}`, {
        method: 'DELETE',
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete pay item');
      }
      showNotification('success', `Removed pay item "${itemName}" from portal`);
      await Promise.all([fetchPayItems(), fetchPayCategories()]);
    } catch (e: any) {
      showNotification('error', e.message || 'Error deleting pay item');
    }
  };

  const handleAutoMapCategory = async (catId: number, catName: string) => {
    setAutoMappingCatId(catId);
    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`/api/pay-categories/${catId}/auto-match`, {
        method: 'POST',
        headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-map pay items');
      }
      showNotification('success', `Auto-matched matching Xero pay rates for "${catName}"`);
      if (data.pay_rules) {
        setPayCategories(prev => prev.map(c => {
          if (c.id === catId) {
            return {
              ...c,
              pay_rules: {
                ...c.pay_rules,
                ...data.pay_rules
              }
            };
          }
          return c;
        }));
      }
      await fetchPayCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to auto-map pay category');
    } finally {
      setAutoMappingCatId(null);
    }
  };

  // Immediate, reliable atomic saving when user selects another pay item from the dropdown
  const handleUpdateCategoryPayRule = async (catId: number, ruleKey: string, xeroEarningsRateId: string) => {
    const key = `${catId}-${ruleKey}`;
    setSavingRuleKey(key);

    const cleanXeroId = (xeroEarningsRateId || '').trim();
    const selectedPayItem = availablePayItems.find(p => p.xero_earnings_rate_id === cleanXeroId) || payItems.find(p => p.xero_earnings_rate_id === cleanXeroId);
    const rateName = selectedPayItem ? selectedPayItem.name : '';

    // Update local state immediately with zero delay
    setPayCategories(prev => prev.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          pay_rules: {
            ...c.pay_rules,
            [ruleKey]: {
              rule_key: ruleKey,
              xero_earnings_rate_id: cleanXeroId,
              pay_item_name: rateName,
              multiplier: 1.0
            }
          }
        };
      }
      return c;
    }));

    try {
      const authToken = token || localStorage.getItem('token') || '';
      const res = await fetch(`/api/pay-categories/${catId}/rule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          rule_key: ruleKey,
          xero_earnings_rate_id: cleanXeroId,
          pay_item_name: rateName
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save pay rule setting');
      }

      setSavedRuleKey(key);
      setTimeout(() => {
        setSavedRuleKey(prev => (prev === key ? null : prev));
      }, 2500);
    } catch (err: any) {
      console.error('Failed to save pay category rule:', err);
      showNotification('error', err.message || 'Failed to save pay rule');
      await fetchPayCategories();
    } finally {
      setSavingRuleKey(null);
    }
  };

  // Source of truth for pay items: live Xero rates when connected, otherwise clean synced pay items
  const availablePayItems = useMemo(() => {
    // 1. If we have live Xero earnings rates from the Xero API, that is the single source of truth (only active items)
    if (xeroData.earningsRates && xeroData.earningsRates.length > 0) {
      return xeroData.earningsRates
        .filter(r => r.id && r.currentRecord !== false)
        .map(r => ({
          id: r.id,
          name: r.name,
          category: r.suggestedCategory || 'Ordinary',
          xero_earnings_rate_id: r.id
        }));
    }
    // 2. Otherwise use payItems from database with valid xero_earnings_rate_id and is_active = 1
    return payItems.filter(pi => 
      pi.is_active !== 0 &&
      pi.xero_earnings_rate_id && 
      pi.xero_earnings_rate_id.trim() !== ''
    );
  }, [xeroData.earningsRates, payItems]);

  // Catalog of strictly active pay items: never display inactive pay items in the portal
  const activePayItemsList = useMemo(() => {
    if (xeroData.connected && xeroData.earningsRates && xeroData.earningsRates.length > 0) {
      const activeXeroMap = new Map(
        xeroData.earningsRates.filter(r => r.currentRecord !== false).map(r => [r.id, r])
      );
      return payItems.filter(item => 
        item.is_active !== 0 && 
        item.xero_earnings_rate_id && 
        activeXeroMap.has(item.xero_earnings_rate_id)
      );
    }
    return payItems.filter(item => 
      item.is_active !== 0 && 
      item.xero_earnings_rate_id && 
      item.xero_earnings_rate_id.trim() !== ''
    );
  }, [payItems, xeroData.connected, xeroData.earningsRates]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    let result = payCategories;
    if (categorySearch.trim()) {
      const q = categorySearch.toLowerCase().trim();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.employment_type || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [payCategories, categorySearch]);

  // Filter raw catalog
  const filteredRawItems = useMemo(() => {
    let result = activePayItemsList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.xero_earnings_rate_id || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== 'ALL') {
      result = result.filter(item => item.category === selectedCategory);
    }
    return result;
  }, [activePayItemsList, searchQuery, selectedCategory]);

  const fullyMappedCount = useMemo(() => {
    return payCategories.filter(c => {
      const r = c.pay_rules || {};
      return r.weekday?.xero_earnings_rate_id && r.saturday?.xero_earnings_rate_id && r.sunday?.xero_earnings_rate_id;
    }).length;
  }, [payCategories]);

  const totalAssignedStaffCount = useMemo(() => {
    return payCategories.reduce((acc, c) => acc + (c.staff_count || 0), 0);
  }, [payCategories]);

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
                Award Pay Categories Architecture
              </h2>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                Xero Payroll Rates Engine
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                Xero Connected
              </span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Map and manage your actual pay items directly synchronized from Xero. Configure your Ordinary rates, weekend/holiday penalty rates, and NDIS &amp; Home Care travel allowances using real Xero items.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchPayCategories();
              fetchPayItems();
              fetchXeroPayItems();
            }}
            disabled={loadingCategories || loading}
            className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh pay categories and pay items"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingCategories || loading) ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleSyncFromXero}
            disabled={syncingXero || loading}
            className="px-3.5 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Pull and update Pay Categories & Earnings Rates directly from Xero Payroll"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingXero ? 'animate-spin' : ''}`} />
            <span>{syncingXero ? 'Pulling from Xero...' : 'Pull Rates from Xero'}</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#8B949E]">Pay Categories</div>
            <div className="text-2xl font-bold text-white mt-1">{payCategories.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Pulled from Xero</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.03] text-zinc-400 border border-white/[0.05]">
            <Award className="w-5 h-5 text-brand-teal" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#8B949E]">Fully Mapped Roles</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {fullyMappedCount} <span className="text-xs text-zinc-500 font-normal">/ {payCategories.length}</span>
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Ordinary &amp; penalty ready</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#8B949E]">Staff Assigned</div>
            <div className="text-2xl font-bold text-purple-300 mt-1">{totalAssignedStaffCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Inheriting pay categories</div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-brand-bg border border-border-subtle p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#8B949E]">Active Xero Pay Items</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{activePayItemsList.length}</div>
            <div className="text-[10px] text-sky-500/80 mt-0.5">Active synced earnings rates</div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-border-subtle gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('CATEGORIES')}
          className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'CATEGORIES'
              ? 'border-brand-teal text-brand-teal bg-brand-teal/5'
              : 'border-transparent text-[#8B949E] hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Pay Categories &amp; Rules ({payCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('XERO_CATALOG')}
          className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'XERO_CATALOG'
              ? 'border-brand-teal text-brand-teal bg-brand-teal/5'
              : 'border-transparent text-[#8B949E] hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Synced Xero Pay Items Catalog ({activePayItemsList.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: PAY CATEGORIES & AWARD RULES ARCHITECTURE     */}
      {/* ======================================================== */}
      {activeSubTab === 'CATEGORIES' && (
        <div className="space-y-6">
          {/* Search bar & info banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search pay categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full bg-[#121214] border border-border-subtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCat(true)}
                className="px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pay Category</span>
              </button>

              <button
                type="button"
                onClick={handleSyncFromXero}
                disabled={syncingXero}
                className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingXero ? 'animate-spin' : ''}`} />
                <span>Pull Rates from Xero</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#8B949E]">
              <Info className="w-4 h-4 text-brand-teal shrink-0" />
              <span>When you change a dropdown, it saves instantly to the payroll engine.</span>
            </div>
          </div>

          {/* Categories Grid / Cards */}
          {loadingCategories ? (
            <div className="py-16 text-center text-[#8B949E]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-teal" />
              <p className="text-xs">Loading Pay Categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-border-subtle rounded-xl bg-brand-bg/40 p-8">
              <Award className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Pay Categories Found</h3>
              <p className="text-xs text-[#8B949E] max-w-md mx-auto mb-4">
                Click <strong>"Pull Rates from Xero"</strong> to automatically import your organization's earnings rates and multiplier categories from Xero.
              </p>
              <button
                type="button"
                onClick={handleSyncFromXero}
                disabled={syncingXero}
                className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingXero ? 'animate-spin' : ''}`} />
                <span>Pull Rates from Xero</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((cat) => {
                const rules = cat.pay_rules || {};
                const mappedRulesCount = PAY_RULE_CATEGORIES.filter(c => rules[c.key]?.xero_earnings_rate_id).length;

                return (
                  <div 
                    key={cat.id}
                    className="bg-brand-bg border border-border-subtle rounded-xl overflow-hidden shadow-sm hover:border-white/10 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b border-border-subtle/80 bg-[#141416] flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            {cat.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                            {cat.employment_type || 'Casual'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                            mappedRulesCount >= 4 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}>
                            {mappedRulesCount >= 4 ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{mappedRulesCount}/{PAY_RULE_CATEGORIES.length} Pay Rules Mapped</span>
                          </span>
                        </div>

                        {/* Staff count / preview */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-[#8B949E]">
                          <Award className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                          <span>
                            <strong>{cat.staff_count || 0} Staff Members Assigned</strong>
                            {cat.assigned_staff && cat.assigned_staff.length > 0 && (
                              <span className="ml-1 text-zinc-400">
                                ({cat.assigned_staff.slice(0, 3).map(s => s.name).join(', ')}{cat.assigned_staff.length > 3 ? ` +${cat.assigned_staff.length - 3} more` : ''})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAutoMapCategory(cat.id, cat.name)}
                          disabled={autoMappingCatId === cat.id}
                          className="px-2.5 py-1 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/30 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Auto-scan Xero pay items with matching names or multipliers"
                        >
                          <Zap className={`w-3 h-3 ${autoMappingCatId === cat.id ? 'animate-spin' : ''}`} />
                          <span>{autoMappingCatId === cat.id ? 'Matching...' : 'Auto-Match from Xero'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingCat(cat)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
                          title="Edit category notes"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                          title="Delete pay category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body - 8 Rule Slots Grid */}
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PAY_RULE_CATEGORIES.map((ruleCategory) => {
                        const rule = rules[ruleCategory.key];
                        const activeMatchedItem = rule?.xero_earnings_rate_id ? availablePayItems.find(p => p.xero_earnings_rate_id === rule.xero_earnings_rate_id) : null;
                        const isMapped = !!activeMatchedItem;
                        const isInactiveMapping = !!(rule?.xero_earnings_rate_id && !activeMatchedItem);
                        const isSaving = savingRuleKey === `${cat.id}-${ruleCategory.key}`;
                        const isSaved = savedRuleKey === `${cat.id}-${ruleCategory.key}`;

                        return (
                          <div 
                            key={ruleCategory.key}
                            className={`p-3 rounded-lg border flex flex-col justify-between transition-colors ${
                              isMapped 
                                ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]' 
                                : isInactiveMapping
                                ? 'bg-rose-500/[0.04] border-rose-500/30'
                                : 'bg-red-500/[0.02] border-red-500/20'
                            }`}
                          >
                            <div className="space-y-1 mb-2.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[11px] font-semibold text-zinc-200 truncate">
                                  {ruleCategory.label}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider font-mono bg-zinc-800 text-zinc-400 shrink-0">
                                  {ruleCategory.multiplierBadge}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-tight line-clamp-1">
                                {ruleCategory.description}
                              </p>
                            </div>

                            {/* Dropdown Selector */}
                            <div className="space-y-1">
                              <select
                                value={activeMatchedItem ? rule.xero_earnings_rate_id : ''}
                                onChange={(e) => handleUpdateCategoryPayRule(cat.id, ruleCategory.key, e.target.value)}
                                disabled={isSaving}
                                className={`w-full text-[11px] rounded-md px-2 py-1.5 outline-none transition-colors cursor-pointer truncate ${
                                  isMapped
                                    ? 'bg-[#121214] border border-white/10 text-white focus:border-brand-teal'
                                    : isInactiveMapping
                                    ? 'bg-[#181112] border border-rose-500/40 text-rose-300 focus:border-rose-400'
                                    : 'bg-[#161314] border border-amber-500/30 text-amber-300 focus:border-amber-400'
                                }`}
                              >
                                <option value="">-- Select Active Xero Pay Item --</option>
                                {availablePayItems.map(pi => (
                                  <option key={pi.id} value={pi.xero_earnings_rate_id}>
                                    {pi.name} ({pi.category})
                                  </option>
                                ))}
                              </select>

                              {/* Status Indicators: Saving spinner / Saved checkmark / Mapped / Unmapped */}
                              {isSaving ? (
                                <div className="text-[10px] text-sky-400 flex items-center gap-1 pt-0.5">
                                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400 shrink-0" />
                                  <span>Saving setting...</span>
                                </div>
                              ) : isSaved ? (
                                <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 pt-0.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Saved to Xero rules ✓</span>
                                </div>
                              ) : isMapped ? (
                                <div className="flex items-center justify-between text-[10px] text-emerald-400 pt-0.5">
                                  <span className="flex items-center gap-1 truncate">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">
                                      {activeMatchedItem.name}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCategoryPayRule(cat.id, ruleCategory.key, '')}
                                    className="text-[9px] text-zinc-500 hover:text-rose-400 underline ml-1 shrink-0 cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </div>
                              ) : isInactiveMapping ? (
                                <div className="flex items-center justify-between text-[10px] text-rose-400 pt-0.5">
                                  <span className="flex items-center gap-1 truncate" title="This earnings rate was marked inactive in Xero">
                                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span className="truncate">Inactive in Xero (Select active rate)</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCategoryPayRule(cat.id, ruleCategory.key, '')}
                                    className="text-[9px] text-zinc-500 hover:text-rose-400 underline ml-1 shrink-0 cursor-pointer"
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
                <thead className="bg-[#141416] border-b border-border-subtle text-[10px] uppercase tracking-wider text-[#8B949E]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Pay Item Name</th>
                    <th className="px-4 py-3 font-semibold">Classification</th>
                    <th className="px-4 py-3 font-semibold">Rate Type</th>
                    <th className="px-4 py-3 font-semibold">Xero Earnings Rate ID</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredRawItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#8B949E]">
                        No pay items found. Click "Pull Rates from Xero" to import your rates.
                      </td>
                    </tr>
                  ) : (
                    filteredRawItems.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                          <span>{item.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.category === 'Ordinary' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                            item.category === 'Penalty' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
                            item.category === 'Allowance' ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30' :
                            'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                          {item.rate_type || 'Hourly'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-400 select-all">
                          {item.xero_earnings_rate_id || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePayItem(item.id, item.name)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                            title="Remove pay item from portal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CATEGORY DETAILS */}
      {editingCat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#151518]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-teal" />
                <h2 className="text-base font-bold text-white">Edit Pay Category</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingCat(null)} 
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategoryDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCat.name}
                  onChange={(e) => setEditingCat(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={editingCat.employment_type || 'Casual'}
                  onChange={(e) => setEditingCat(prev => prev ? ({ ...prev, employment_type: e.target.value }) : null)}
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
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingCat.description || ''}
                  onChange={(e) => setEditingCat(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingCat.name.trim()}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddingCat && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Pay Category</h3>
                  <p className="text-[11px] text-[#8B949E]">Define a position/level award rate structure</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingCat(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ordinary Hours, Support Worker Level 2"
                  value={newCat.name}
                  onChange={(e) => setNewCat(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  value={newCat.employment_type}
                  onChange={(e) => setNewCat(prev => ({ ...prev, employment_type: e.target.value }))}
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
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Base award category for standard care workers..."
                  value={newCat.description}
                  onChange={(e) => setNewCat(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#18181c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-teal transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCat(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCat.name.trim()}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
