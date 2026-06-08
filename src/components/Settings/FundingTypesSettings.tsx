import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, RefreshCw } from 'lucide-react';

export default function FundingTypesSettings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'HCP' | 'SAH'>('HCP');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [hcpLevels, setHcpLevels] = useState([
    { level: 'Level 1', title: 'Basic care needs', amount: 10588.65, billingCycle: 'annual' },
    { level: 'Level 2', title: 'Low care needs', amount: 18622.75, billingCycle: 'annual' },
    { level: 'Level 3', title: 'Intermediate care needs', amount: 40529.60, billingCycle: 'annual' },
    { level: 'Level 4', title: 'High care needs', amount: 61440.45, billingCycle: 'annual' },
  ]);

  const [sahLevels, setSahLevels] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      level: `Class ${i + 1}`,
      title: 'Support at Home Class',
      amount: 0,
      billingCycle: 'quarterly',
    }))
  );

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hcpFundingLevels) {
          setHcpLevels(data.hcpFundingLevels);
        }
        if (data.sahFundingLevels) {
          setSahLevels(data.sahFundingLevels);
        } else {
           // Default SaH values for 2026 (placeholder estimates)
           const defaultSah = [
             { level: 'Class 1', title: 'Quarterly budget', amount: 1200, billingCycle: 'quarterly' },
             { level: 'Class 2', title: 'Quarterly budget', amount: 2500, billingCycle: 'quarterly' },
             { level: 'Class 3', title: 'Quarterly budget', amount: 4000, billingCycle: 'quarterly' },
             { level: 'Class 4', title: 'Quarterly budget', amount: 6500, billingCycle: 'quarterly' },
             { level: 'Class 5', title: 'Quarterly budget', amount: 9000, billingCycle: 'quarterly' },
             { level: 'Class 6', title: 'Quarterly budget', amount: 12000, billingCycle: 'quarterly' },
             { level: 'Class 7', title: 'Quarterly budget', amount: 16000, billingCycle: 'quarterly' },
             { level: 'Class 8', title: 'Quarterly budget', amount: 19500, billingCycle: 'quarterly' },
           ];
           setSahLevels(defaultSah);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          hcpFundingLevels: hcpLevels,
          sahFundingLevels: sahLevels
        })
      });
      if (res.ok) {
        setSuccessMsg('Funding types saved successfully.');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) {
      console.error('Failed to save funding types', e);
    } finally {
      setSaving(false);
    }
  };

  const updateHcp = (index: number, field: string, value: any) => {
    const newLevels = [...hcpLevels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setHcpLevels(newLevels);
  };

  const updateSah = (index: number, field: string, value: any) => {
    const newLevels = [...sahLevels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setSahLevels(newLevels);
  };

  return (
    <div className="flex flex-col h-full bg-brand-navy border border-border-subtle rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg">
        <div>
          <h3 className="text-lg font-medium text-[#E6EDF3] mb-1">Funding Types & Levels</h3>
          <p className="text-sm text-[#8B949E]">Configure default funding levels and amounts for HCP and Support at Home (SaH).</p>
        </div>
      </div>
      
      <div className="flex border-b border-border-subtle bg-brand-navy">
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'HCP' ? 'border-brand-teal text-brand-teal bg-white/[0.02]' : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.02]'
          }`}
          onClick={() => setActiveTab('HCP')}
        >
          HCP Funding Levels
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'SAH' ? 'border-brand-teal text-brand-teal bg-white/[0.02]' : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.02]'
          }`}
          onClick={() => setActiveTab('SAH')}
        >
          Support at Home (SaH)
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-sm">
            {successMsg}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center p-8 text-[#8B949E]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading funding settings...
          </div>
        ) : (
          <form id="fundingTypesForm" onSubmit={handleSave} className="space-y-6 max-w-4xl">
            {activeTab === 'HCP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-3">Level</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-4">Annual Amount ($)</div>
                </div>
                {hcpLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateHcp(idx, 'level', e.target.value)}
                        placeholder="e.g. Level 1"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateHcp(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-4 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amount}
                        onChange={(e) => updateHcp(idx, 'amount', Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4">
                   These default properties indicate typical annual Government subsidy levels as of 2026. Custom amounts can still be overridden on individual client profiles.
                </div>
              </div>
            )}
            
            {activeTab === 'SAH' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-3">Class Level</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-4">Quarterly Budget ($)</div>
                </div>
                {sahLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateSah(idx, 'level', e.target.value)}
                        placeholder="e.g. Class 1"
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateSah(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-4 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amount}
                        onChange={(e) => updateSah(idx, 'amount', Number(e.target.value))}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4">
                   These properties define default budget expectations for the new Support at Home (SaH) model starting July 2025/2026.
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="p-4 border-t border-border-subtle bg-brand-navy flex justify-end">
        <button
          type="submit"
          form="fundingTypesForm"
          disabled={saving || loading}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-sm font-medium rounded-md transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? (
             <>
               <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...
             </>
          ) : (
             <>
               <Save className="w-4 h-4 mr-2" /> Save Settings
             </>
          )}
        </button>
      </div>
    </div>
  );
}
