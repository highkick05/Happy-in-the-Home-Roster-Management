import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileDown, Plus, Save, X, Database, CheckSquare, ExternalLink } from 'lucide-react';
import DatabaseSettings from './DatabaseSettings';
import TestingChecklist from './TestingChecklist';
import FundingTypesSettings from './FundingTypesSettings';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export default function SettingsView() {
  const { token, user, updateSettings } = useAuth();
  const [activeTab, setActiveTab] = useLocalStorage<'GENERAL' | 'BILLING' | 'NDIS' | 'HOME_CARE' | 'BRANDING' | 'FUNDING_TYPES' | 'DATABASE' | 'TESTING'>('settings_active_tab', 'GENERAL');
  const [services, setServices] = useState<any[]>([]);
  const [savingCategoryIds, setSavingCategoryIds] = useState<Set<string>>(new Set());
  const [savedCategoryIds, setSavedCategoryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [settings, setSettings] = useState({
    businessName: '',
    abn: '',
    businessAddress: '',
    contactEmail: '',
    contactPhone: '',
    timezone: 'Australia/Perth',
    invoicePrefix: 'INV-',
    ndisInvoicePrefix: 'INV-',
    hcInvoicePrefix: 'HC-',
    
    bankName: 'National Australia Bank',
    bankAccountName: 'Happy in the Home',
    bankBsb: '086-554',
    bankAcc: '506627847',
    invoicingFrequency: 'Weekly',
    invoicingStartDay: 'Monday',
    payrunFrequency: 'Fortnightly',
    payrunStartDay: 'Monday',
    paymentDueDays: 7,
    max_early_clockin_minutes: 180,
    ndisRegion: 'NSW',
    state: 'WA',
    websiteLogo: '',
    letterheadLogo: '',
    pwaIcon192: '',
    pwaIcon512: ''
  });
  const [successMsg, setSuccessMsg] = useState('');

  const REGIONS = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'Remote', 'Very Remote'];
  const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [region, setRegion] = useState('NSW');
  const [homeCareSubTab, setHomeCareSubTab] = useState<'FUNDING' | 'PRICING'>('FUNDING');
  const authSettings = useAuth().settings;
  
  useEffect(() => {
    if (authSettings?.ndisRegion && authSettings.ndisRegion !== region) {
      setRegion(authSettings.ndisRegion);
    }
  }, [authSettings?.ndisRegion]);

  const handleRegionChange = async (newRegion: string) => {
    setRegion(newRegion);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ...settings, ndisRegion: newRegion })
      });
      updateSettings({ ...authSettings, ndisRegion: newRegion });
    } catch(e) {
      console.error('Failed to save region', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'GENERAL' || activeTab === 'BILLING' || activeTab === 'BRANDING') fetchSettings();
    if (activeTab === 'NDIS' || activeTab === 'HOME_CARE') fetchServices(activeTab);
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralLoading(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('Settings saved successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
        if (data.settings) {
          setSettings(data.settings);
          updateSettings(data.settings);
        } else {
          updateSettings(settings); // Fallback
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneralLoading(false);
    }
  };

  const fetchServices = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setServices(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (id: string, category: string) => {
    // Optimistic UI update
    setServices(prev => prev.map(s => s.id === id ? { ...s, service_category: category } : s));
    setSavingCategoryIds(prev => new Set([...prev, id]));
    
    try {
      const res = await fetch(`/api/settings/services/${id}/category`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ service_category: category })
      });

      if (res.ok) {
        setSavingCategoryIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setSavedCategoryIds(prev => new Set([...prev, id]));
        setTimeout(() => {
          setSavedCategoryIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 2000);
      } else {
        // Revert on error - assuming we want to re-fetch if it fails, or just let them try again.
        console.error('Failed to update category');
        fetchServices(activeTab === 'NDIS' ? 'NDIS' : 'HOME_CARE');
        setSavingCategoryIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (e) {
      console.error(e);
      setSavingCategoryIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchServices(activeTab === 'NDIS' ? 'NDIS' : 'HOME_CARE');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (user?.role !== 'ADMIN') {
      alert("Only admins can import pricing.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', activeTab);
    if (activeTab === 'NDIS') {
      formData.append('region', region);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/services/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully imported ${data.imported} services and updated ${data.updated} services.`);
        fetchServices(activeTab);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'websiteLogo' | 'letterheadLogo' | 'pwaIcon192' | 'pwaIcon512') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (user?.role !== 'ADMIN') {
      alert("Only admins can update branding.");
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('key', key);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSettings({ ...settings, [key]: data.path });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    }
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-6 md:mb-0">System Settings</h2>
      </div>

      <div className="flex space-x-1 bg-brand-navy border border-border-subtle p-1 rounded-lg w-fit max-w-full overflow-x-auto overflow-y-hidden shadow-sm hidden-scrollbar">
        <button
          onClick={() => setActiveTab('GENERAL')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'GENERAL' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('BILLING')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'BILLING' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Billing & Finance
        </button>
        <button
          onClick={() => setActiveTab('NDIS')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'NDIS' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          NDIS Pricing
        </button>
        <button
          onClick={() => setActiveTab('HOME_CARE')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'HOME_CARE' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Home Care
        </button>
        <button
          onClick={() => setActiveTab('BRANDING')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'BRANDING' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Branding
        </button>
        {user?.role === 'ADMIN' && (
          <>
            <button
              onClick={() => setActiveTab('TESTING')}
              className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center gap-2 ${activeTab === 'TESTING' ? 'bg-brand-bg text-brand-teal shadow-sm' : 'text-[#8B949E] hover:text-brand-teal'}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Testing Checklist
            </button>
            <button
              onClick={() => setActiveTab('DATABASE')}
              className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center gap-2 ${activeTab === 'DATABASE' ? 'bg-brand-bg text-brand-teal shadow-sm' : 'text-[#8B949E] hover:text-brand-teal'}`}
            >
              <Database className="w-3.5 h-3.5" />
              Database
            </button>
          </>
        )}
      </div>

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto flex flex-col shadow-sm">
        {activeTab === 'DATABASE' && <DatabaseSettings />}
        {activeTab === 'TESTING' && <TestingChecklist />}
        {activeTab === 'GENERAL' && (
          <div className="p-8 max-w-4xl">
            <div className="mb-8">
              <h3 className="text-lg font-medium text-[#E6EDF3] mb-4">General Settings</h3>
              <p className="text-sm text-[#8B949E] mt-1">Configure business details, global preferences, and timezone.</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {successMsg && <div className="p-3 bg-brand-green/20 text-brand-green border border-brand-green/50 rounded-md text-sm">{successMsg}</div>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Business Name</label>
                  <input type="text" value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">ABN</label>
                  <input type="text" value={settings.abn} onChange={e => setSettings({...settings, abn: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Business Address</label>
                  <input type="text" value={settings.businessAddress} onChange={e => setSettings({...settings, businessAddress: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Contact Email</label>
                  <input type="email" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Contact Phone</label>
                  <input type="text" value={settings.contactPhone} onChange={e => setSettings({...settings, contactPhone: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                
                <div className="col-span-2 border-t border-border-subtle pt-6 mt-2">
                  <h4 className="text-md font-medium text-[#E6EDF3] mb-4">Localization & System</h4>
                </div>
                
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Timezone</label>
                  <select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    <optgroup label="Australia">
                      <option value="Australia/Perth">Australia/Perth (AWST)</option>
                      <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
                      <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                      <option value="Australia/Darwin">Australia/Darwin (ACST)</option>
                      <option value="Australia/Hobart">Australia/Hobart (AEST)</option>
                      <option value="Australia/Melbourne">Australia/Melbourne (AEST)</option>
                      <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-1.5">State / Territory</label>
                  <select value={settings.state} onChange={e => setSettings({...settings, state: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    {STATES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <p className="text-[10px] text-[#8B949E] italic mt-1">Powered by date-holidays library for Australian compliance.</p>
                </div>
              </div>

              <div className="col-span-2 border-t border-border-subtle pt-6 mt-6">
                 <h4 className="text-md font-medium text-[#E6EDF3] mb-4">Kiosk & Monitoring Display</h4>
                 <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 relative">
                    <p className="text-sm text-[#8B949E] mb-4">Use these URLs to configure standalone, wall-mounted monitoring displays in Kiosk mode. It dynamically auto-refreshes every 30 seconds.</p>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[12px] font-medium text-[#8B949E]">Auto-Detect (Recommended)</label>
                        <div className="flex items-center gap-3">
                           <input readOnly value={`${window.location.origin}/kiosk/wallboard`} className="flex-1 bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none" />
                           <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/kiosk/wallboard`)} className="px-4 py-2 bg-[#2D333B] border border-border-subtle text-[#E6EDF3] rounded-md hover:bg-white/[0.04] transition-colors text-[13px]">Copy Link</button>
                           <a href="/kiosk/wallboard" target="_blank" rel="noopener noreferrer" className="p-2 bg-[#2D333B] border border-border-subtle text-[#E6EDF3] rounded-md hover:bg-white/[0.04] transition-colors">
                              <ExternalLink className="w-4 h-4" />
                           </a>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[12px] font-medium text-[#8B949E]">Force Landscape</label>
                          <div className="flex items-center gap-3">
                             <input readOnly value={`${window.location.origin}/kiosk/wallboard?mode=landscape`} className="flex-1 bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[12px] text-[#E6EDF3] outline-none" />
                             <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/kiosk/wallboard?mode=landscape`)} className="px-3 py-2 bg-[#2D333B] border border-border-subtle text-[#E6EDF3] rounded-md hover:bg-white/[0.04] transition-colors text-[12px]">Copy</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[12px] font-medium text-[#8B949E]">Force Portrait</label>
                          <div className="flex items-center gap-3">
                             <input readOnly value={`${window.location.origin}/kiosk/wallboard?mode=portrait`} className="flex-1 bg-brand-bg border border-border-subtle rounded-md px-3 py-2 text-[12px] text-[#E6EDF3] outline-none" />
                             <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/kiosk/wallboard?mode=portrait`)} className="px-3 py-2 bg-[#2D333B] border border-border-subtle text-[#E6EDF3] rounded-md hover:bg-white/[0.04] transition-colors text-[12px]">Copy</button>
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="col-span-2 border-t border-border-subtle pt-6 mt-6">
                 <h4 className="text-md font-medium text-[#E6EDF3] mb-4">Shift & Clock-in Settings</h4>
                 <div className="flex flex-col gap-2 p-4 border border-border-subtle bg-brand-navy rounded-xl shadow-sm">
                   <label className="text-sm font-medium text-slate-400">Maximum Early Clock-In Window (Minutes)</label>
                   <input 
                     type="number" 
                     name="max_early_clockin_minutes"
                     value={settings.max_early_clockin_minutes !== undefined ? settings.max_early_clockin_minutes : 180}
                     onChange={e => setSettings({...settings, max_early_clockin_minutes: parseInt(e.target.value)})}
                     className="w-full md:w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-white"
                     placeholder="e.g., 180"
                   />
                   <p className="text-xs text-slate-500">Controls how many minutes before a shift starts that a support worker can tap 'Start Shift'. Default is 3 hours.</p>
                 </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'BILLING' && (
          <div className="p-8 max-w-4xl">
            <div className="mb-8">
              <h3 className="text-lg font-medium text-[#E6EDF3] mb-4">Billing & Finance</h3>
              <p className="text-sm text-[#8B949E] mt-1">Configure business bank details and invoicing cycles.</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {successMsg && <div className="p-3 bg-brand-green/20 text-brand-green border border-brand-green/50 rounded-md text-sm">{successMsg}</div>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 border-b border-border-subtle pb-4 mb-2">
                  <h4 className="text-md font-medium text-[#E6EDF3]">Business Bank Account</h4>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Bank Name</label>
                  <input type="text" value={settings.bankName} onChange={e => setSettings({...settings, bankName: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Account Name</label>
                  <input type="text" value={settings.bankAccountName} onChange={e => setSettings({...settings, bankAccountName: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">BSB</label>
                  <input type="text" value={settings.bankBsb} onChange={e => setSettings({...settings, bankBsb: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Account Number</label>
                  <input type="text" value={settings.bankAcc} onChange={e => setSettings({...settings, bankAcc: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                
                <div className="col-span-2 border-b border-border-subtle pb-4 mt-6 mb-2">
                  <h4 className="text-md font-medium text-[#E6EDF3]">Invoice Prefixes</h4>
                </div>
                
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">NDIS Invoice Prefix</label>
                  <input type="text" value={settings.ndisInvoicePrefix} onChange={e => setSettings({...settings, ndisInvoicePrefix: e.target.value})} placeholder="e.g. INV-" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Home Care Invoice Prefix</label>
                  <input type="text" value={settings.hcInvoicePrefix} onChange={e => setSettings({...settings, hcInvoicePrefix: e.target.value})} placeholder="e.g. HC-" className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>

                <div className="col-span-2 border-b border-border-subtle pb-4 mt-6 mb-2">
                  <h4 className="text-md font-medium text-[#E6EDF3]">Billing Cycles</h4>
                </div>
                
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Invoicing Cycle Frequency</label>
                  <select value={settings.invoicingFrequency} onChange={e => setSettings({...settings, invoicingFrequency: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Invoicing Cycle Start Weekday</label>
                  <select value={settings.invoicingStartDay} onChange={e => setSettings({...settings, invoicingStartDay: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Payrun Cycle Frequency</label>
                  <select value={settings.payrunFrequency} onChange={e => setSettings({...settings, payrunFrequency: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Payrun Cycle Start Weekday</label>
                  <select value={settings.payrunStartDay} onChange={e => setSettings({...settings, payrunStartDay: e.target.value})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]">
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[#8B949E] mb-2">Payment Due By (Days)</label>
                  <input type="number" min="0" value={settings.paymentDueDays} onChange={e => setSettings({...settings, paymentDueDays: parseInt(e.target.value) || 0})} className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors placeholder-[#8B949E]" />
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'BRANDING' && (
          <div className="p-8 max-w-4xl">
            <div className="mb-8">
              <h3 className="text-lg font-medium text-[#E6EDF3] mb-4">Branding</h3>
              <p className="text-sm text-[#8B949E] mt-1">Upload your logos for the application interface and generated invoices.</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-8">
              {successMsg && <div className="p-3 bg-brand-green/20 text-brand-green border border-brand-green/50 rounded-md text-sm">{successMsg}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Website Logo */}
                <div className="bg-brand-navy border-t border-border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden ring-1 ring-border-subtle/50">
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-[#E6EDF3]">Website Logo</h4>
                    <p className="text-xs text-[#8B949E] mt-1">Used in the sidebar navigation and login screen. (Recommended size: 200px x 60px)</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-subtle rounded-lg bg-brand-bg hover:bg-brand-navy transition-colors relative group">
                    {settings.websiteLogo ? (
                      <div className="relative w-full h-24 flex items-center justify-center">
                        <img src={settings.websiteLogo} alt="Website Logo" className="max-h-full max-w-full object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, websiteLogo: ''})} className="p-2 text-[#8B949E] hover:text-[#E6EDF3] transition-colors rounded-md hover:bg-white/[0.04]">
                          <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
                        <p className="text-sm text-[#8B949E]">Click to upload image</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'websiteLogo')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>

                {/* Letterhead Logo */}
                <div className="bg-brand-navy border-t border-border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden ring-1 ring-border-subtle/50">
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-[#E6EDF3]">Invoice Letterhead</h4>
                    <p className="text-xs text-[#8B949E] mt-1">Used at the top of PDF invoices. (Recommended size: 600px x 150px)</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-subtle rounded-lg bg-brand-bg hover:bg-brand-navy transition-colors relative group">
                    {settings.letterheadLogo ? (
                      <div className="relative w-full h-24 flex items-center justify-center">
                        <img src={settings.letterheadLogo} alt="Letterhead Logo" className="max-h-full max-w-full object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, letterheadLogo: ''})} className="p-2 text-[#8B949E] hover:text-[#E6EDF3] transition-colors rounded-md hover:bg-white/[0.04]">
                          <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
                        <p className="text-sm text-[#8B949E]">Click to upload image</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleImageUpload(e, 'letterheadLogo')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>
                {/* PWA Icon 192 */}
                <div className="bg-brand-navy border-t border-border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden ring-1 ring-border-subtle/50">
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-[#E6EDF3]">App Icon (192x192)</h4>
                    <p className="text-xs text-[#8B949E] mt-1">Used for iPhone / Android home screen icons. (Must be square, ideally 192x192 PNG)</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-subtle rounded-lg bg-brand-bg hover:bg-brand-navy transition-colors relative group">
                    {settings.pwaIcon192 ? (
                      <div className="relative w-full h-24 flex items-center justify-center">
                        <img src={settings.pwaIcon192} alt="App Icon 192" className="max-h-full max-w-full object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, pwaIcon192: ''})} className="p-2 text-[#8B949E] hover:text-[#E6EDF3] transition-colors rounded-md hover:bg-white/[0.04]">
                          <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
                        <p className="text-sm text-[#8B949E]">Click to upload image</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/png,image/jpeg" 
                      onChange={(e) => handleImageUpload(e, 'pwaIcon192')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>

                {/* PWA Icon 512 */}
                <div className="bg-brand-navy border-t border-border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden ring-1 ring-border-subtle/50">
                  <div className="mb-4">
                    <h4 className="text-md font-medium text-[#E6EDF3]">App Icon (High-Res 512x512)</h4>
                    <p className="text-xs text-[#8B949E] mt-1">Used for high resolution screens and splash screens. (Must be square, ideally 512x512 PNG)</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-subtle rounded-lg bg-brand-bg hover:bg-brand-navy transition-colors relative group">
                    {settings.pwaIcon512 ? (
                      <div className="relative w-full h-24 flex items-center justify-center">
                        <img src={settings.pwaIcon512} alt="App Icon 512" className="max-h-full max-w-full object-contain" />
                        <button type="button" onClick={() => setSettings({...settings, pwaIcon512: ''})} className="p-2 text-[#8B949E] hover:text-[#E6EDF3] transition-colors rounded-md hover:bg-white/[0.04]">
                          <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-[#8B949E] mx-auto mb-2" />
                        <p className="text-sm text-[#8B949E]">Click to upload image</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/png,image/jpeg" 
                      onChange={(e) => handleImageUpload(e, 'pwaIcon512')} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-subtle">
                <button type="submit" disabled={generalLoading || user?.role !== 'ADMIN'} className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50 shadow-sm">
                  <Save className="w-4 h-4 mr-2" />
                  {generalLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'NDIS' && (
          <div className="flex flex-col h-full bg-brand-navy">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg relative shrink-0">
              <div>
                <h3 className="text-lg font-medium text-[#E6EDF3] mb-1 font-sans">NDIS Line Items</h3>
                <p className="text-sm text-[#8B949E]">Import NDIS rates from an Excel (.xlsx) file.</p>
              </div>
              <div className="flex space-x-2 items-center">
                <select
                  value={region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[13px] text-[#E6EDF3] outline-none focus:ring-1 focus:ring-brand-teal transition-colors"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto shadow-sm whitespace-nowrap shrink-0 animate-fade-in"
                  disabled={loading || user?.role !== 'ADMIN'}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Pricing
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-[#8B949E]">Loading services...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10">
                      <th className="px-4 py-4 font-semibold">NDIS Code</th>
                      <th className="px-4 py-4 font-semibold">Service Name</th>
                      <th className="px-4 py-4 font-semibold">Reg. Grp Num</th>
                      <th className="px-4 py-4 font-semibold">Reg. Grp Name</th>
                      <th className="px-4 py-4 font-semibold">Unit</th>
                      <th className="px-4 py-4 font-semibold text-right">Rate ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-sm">
                    {services.map(s => (
                      <tr key={s.id} className="hover:bg-brand-bg/50 transition-colors">
                        <td className="px-4 py-4 font-mono text-xs text-[#E6EDF3]">{s.code}</td>
                        <td className="px-4 py-4 text-[#E6EDF3]">
                          <div>{s.name}</div>
                          {s.description && <div className="text-xs text-[#8B949E] mt-1">{s.description}</div>}
                        </td>
                        <td className="px-4 py-4 text-[#8B949E]">{s.reg_group_number || '-'}</td>
                        <td className="px-4 py-4 text-[#8B949E]">{s.reg_group_name || '-'}</td>
                        <td className="px-4 py-4 text-[#8B949E]">{s.unit || '-'}</td>
                        <td className="px-4 py-4 text-right font-medium text-[#E6EDF3]">
                          {(() => {
                            let displayRate = Number(s.rate);
                            if (s.rates_json) {
                              try {
                                const rates = JSON.parse(s.rates_json);
                                if (rates[region] !== undefined) {
                                  displayRate = Number(rates[region]);
                                }
                              } catch(e) {}
                            }
                            return `$${displayRate.toFixed(2)}`;
                          })()}
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="p-3 bg-brand-bg rounded-full border border-border-subtle">
                              <FileDown className="w-6 h-6 text-[#8B949E]" />
                            </div>
                            <div className="text-[#8B949E]">No services found</div>
                            <div className="text-xs text-zinc-500">Import an XLSX file containing 'code', 'name', and 'rate' columns.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'HOME_CARE' && (
          <div className="flex flex-col h-full bg-brand-navy">
            {/* Sub-tab selection */}
            <div className="flex border-b border-border-subtle bg-brand-bg px-4 sticky top-0 z-20 shrink-0">
              <button
                className={`px-6 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] ${
                  homeCareSubTab === 'FUNDING' 
                    ? 'border-brand-teal text-[#E6EDF3] font-semibold' 
                    : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
                onClick={() => setHomeCareSubTab('FUNDING')}
              >
                Home Care Funding
              </button>
              <button
                className={`px-6 py-3.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] ${
                  homeCareSubTab === 'PRICING' 
                    ? 'border-brand-teal text-[#E6EDF3] font-semibold' 
                    : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
                }`}
                onClick={() => setHomeCareSubTab('PRICING')}
              >
                Home Care Pricing
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {homeCareSubTab === 'FUNDING' && (
                <div className="flex-1 overflow-auto min-h-0">
                  <FundingTypesSettings />
                </div>
              )}

              {homeCareSubTab === 'PRICING' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg relative shrink-0">
                    <div>
                      <h3 className="text-lg font-medium text-[#E6EDF3] mb-1 font-sans">Home Care Line Items</h3>
                      <p className="text-sm text-[#8B949E]">Import Home Care rates from an Excel (.xlsx) file.</p>
                    </div>
                    <div className="flex space-x-2 items-center">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-colors w-full justify-center md:w-auto shadow-sm whitespace-nowrap shrink-0"
                        disabled={loading || user?.role !== 'ADMIN'}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Import Pricing
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {loading ? (
                      <div className="p-8 text-center text-[#8B949E]">Loading services...</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10">
                            <th className="px-4 py-4 font-semibold">Serv. ID</th>
                            <th className="px-4 py-4 font-semibold">Service Name</th>
                            <th className="px-4 py-4 font-semibold w-48">Category</th>
                            <th className="px-4 py-4 font-semibold">Unit</th>
                            <th className="px-4 py-4 font-semibold text-right">Weekday</th>
                            <th className="px-4 py-4 font-semibold text-right">Non-Standard</th>
                            <th className="px-4 py-4 font-semibold text-right">Saturday</th>
                            <th className="px-4 py-4 font-semibold text-right">Sunday</th>
                            <th className="px-4 py-4 font-semibold text-right">Pub. Holiday</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle text-sm">
                          {services.map(s => (
                            <tr key={s.id} className={`hover:bg-brand-bg/50 transition-colors ${savedCategoryIds.has(s.id) ? 'bg-brand-green/5' : ''}`}>
                              <td className={`px-4 py-4 font-mono text-xs text-[#E6EDF3] border-l-2 ${savedCategoryIds.has(s.id) ? 'border-brand-green' : 'border-transparent'} transition-colors duration-300`}>{s.code}</td>
                              <td className="px-4 py-4 text-[#E6EDF3]">
                                <div>{s.name}</div>
                                {s.description && <div className="text-xs text-[#8B949E] mt-1">{s.description}</div>}
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={s.service_category || ''}
                                  onChange={(e) => handleCategoryChange(s.id, e.target.value)}
                                  className="w-full bg-brand-navy text-[#E6EDF3] border border-border-subtle rounded text-xs px-2 py-1.5 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 outline-none transition-colors"
                                  disabled={savingCategoryIds.has(s.id)}
                                >
                                  <option value="">Select Category</option>
                                  <option value="Clinical">Clinical</option>
                                  <option value="Independence">Independence</option>
                                  <option value="Everyday Living">Everyday Living</option>
                                </select>
                              </td>
                              <td className="px-4 py-4 text-[#8B949E]">{s.unit || '-'}</td>
                              <td className="px-4 py-4 text-right text-[#E6EDF3]">
                                {(() => {
                                  try {
                                    const rates = JSON.parse(s.rates_json);
                                    return rates['Weekday'] !== undefined ? `$${Number(rates['Weekday']).toFixed(2)}` : '-';
                                  } catch(e) { return '-'; }
                                })()}
                              </td>
                              <td className="px-4 py-4 text-right text-[#E6EDF3]">
                                {(() => {
                                  try {
                                    const rates = JSON.parse(s.rates_json);
                                    return rates['Weekday (Non-Standard)'] !== undefined ? `$${Number(rates['Weekday (Non-Standard)']).toFixed(2)}` : '-';
                                  } catch(e) { return '-'; }
                                })()}
                              </td>
                              <td className="px-4 py-4 text-right text-[#E6EDF3]">
                                {(() => {
                                  try {
                                    const rates = JSON.parse(s.rates_json);
                                    return rates['Saturday'] !== undefined ? `$${Number(rates['Saturday']).toFixed(2)}` : '-';
                                  } catch(e) { return '-'; }
                                })()}
                              </td>
                              <td className="px-4 py-4 text-right text-[#E6EDF3]">
                                {(() => {
                                  try {
                                    const rates = JSON.parse(s.rates_json);
                                    return rates['Sunday'] !== undefined ? `$${Number(rates['Sunday']).toFixed(2)}` : '-';
                                  } catch(e) { return '-'; }
                                })()}
                              </td>
                              <td className="px-4 py-4 text-right text-[#E6EDF3]">
                                {(() => {
                                  try {
                                    const rates = JSON.parse(s.rates_json);
                                    return rates['Public Holiday'] !== undefined ? `$${Number(rates['Public Holiday']).toFixed(2)}` : '-';
                                  } catch(e) { return '-'; }
                                })()}
                              </td>
                            </tr>
                          ))}
                          {services.length === 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-12 text-center">
                                <div className="flex flex-col items-center justify-center space-y-3">
                                  <div className="p-3 bg-brand-bg rounded-full border border-border-subtle">
                                    <FileDown className="w-6 h-6 text-[#8B949E]" />
                                  </div>
                                  <div className="text-[#8B949E]">No services found</div>
                                  <div className="text-xs text-zinc-500">Import an XLSX file containing 'code', 'name', and 'rate' columns.</div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
