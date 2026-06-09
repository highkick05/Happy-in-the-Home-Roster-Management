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
    { level: 'Level 1', title: 'Basic care needs for safety and independence', amountAnnual: 10986.50, amountQuarterly: 2746.63, billingCycle: 'annual' },
    { level: 'Level 2', title: 'Low-level care needs for basic assistance', amountAnnual: 19319.45, amountQuarterly: 4829.86, billingCycle: 'annual' },
    { level: 'Level 3', title: 'Intermediate care needs for daily support', amountAnnual: 42055.30, amountQuarterly: 10513.83, billingCycle: 'annual' },
    { level: 'Level 4', title: 'High-level care needs with complex requirements', amountAnnual: 63758.20, amountQuarterly: 15939.55, billingCycle: 'annual' },
  ]);

  const [sahLevels, setSahLevels] = useState([
    { level: 'Class 1', title: 'Entry-level support for basic independence', amountQuarterly: 2682.75, amountAnnual: 10731.00, billingCycle: 'quarterly' },
    { level: 'Class 2', title: 'Low-level support for varied needs', amountQuarterly: 4008.61, amountAnnual: 16034.45, billingCycle: 'quarterly' },
    { level: 'Class 3', title: 'Moderate support for maintaining independence', amountQuarterly: 5491.43, amountAnnual: 21965.70, billingCycle: 'quarterly' },
    { level: 'Class 4', title: 'Moderate to intermediate care requirements', amountQuarterly: 7424.10, amountAnnual: 29696.40, billingCycle: 'quarterly' },
    { level: 'Class 5', title: 'Intermediate care for progressing support', amountQuarterly: 9924.35, amountAnnual: 39697.40, billingCycle: 'quarterly' },
    { level: 'Class 6', title: 'High support needs including complex care', amountQuarterly: 12028.58, amountAnnual: 48114.30, billingCycle: 'quarterly' },
    { level: 'Class 7', title: 'Very high support requiring comprehensive assistance', amountQuarterly: 14537.04, amountAnnual: 58148.15, billingCycle: 'quarterly' },
    { level: 'Class 8', title: 'Maximum support for complex, continuous needs', amountQuarterly: 19526.59, amountAnnual: 78106.35, billingCycle: 'quarterly' },
  ]);

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
          setHcpLevels(data.hcpFundingLevels.map((lvl: any) => ({
             ...lvl,
             amountAnnual: lvl.amountAnnual !== undefined ? lvl.amountAnnual : (lvl.amount || 0),
             amountQuarterly: lvl.amountQuarterly !== undefined ? lvl.amountQuarterly : ((lvl.amount || 0) / 4)
          })));
        }
        if (data.sahFundingLevels) {
          setSahLevels(data.sahFundingLevels.map((lvl: any) => ({
             ...lvl,
             amountQuarterly: lvl.amountQuarterly !== undefined ? lvl.amountQuarterly : (lvl.amount || 0),
             amountAnnual: lvl.amountAnnual !== undefined ? lvl.amountAnnual : ((lvl.amount || 0) * 4)
          })));
        } else {
           // Default SaH values for 2026 (placeholder estimates)
           const defaultSah = [
             { level: 'Class 1', title: 'Entry-level support for basic independence', amountQuarterly: 2682.75, amountAnnual: 10731.00, billingCycle: 'quarterly' },
             { level: 'Class 2', title: 'Low-level support for varied needs', amountQuarterly: 4008.61, amountAnnual: 16034.45, billingCycle: 'quarterly' },
             { level: 'Class 3', title: 'Moderate support for maintaining independence', amountQuarterly: 5491.43, amountAnnual: 21965.70, billingCycle: 'quarterly' },
             { level: 'Class 4', title: 'Moderate to intermediate care requirements', amountQuarterly: 7424.10, amountAnnual: 29696.40, billingCycle: 'quarterly' },
             { level: 'Class 5', title: 'Intermediate care for progressing support', amountQuarterly: 9924.35, amountAnnual: 39697.40, billingCycle: 'quarterly' },
             { level: 'Class 6', title: 'High support needs including complex care', amountQuarterly: 12028.58, amountAnnual: 48114.30, billingCycle: 'quarterly' },
             { level: 'Class 7', title: 'Very high support requiring comprehensive assistance', amountQuarterly: 14537.04, amountAnnual: 58148.15, billingCycle: 'quarterly' },
             { level: 'Class 8', title: 'Maximum support for complex, continuous needs', amountQuarterly: 19526.59, amountAnnual: 78106.35, billingCycle: 'quarterly' },
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
    <div className="flex flex-col h-full bg-brand-navy overflow-hidden">
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
          <form id="fundingTypesForm" onSubmit={handleSave} className="space-y-6 max-w-6xl">
            {activeTab === 'HCP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-2">Level</div>
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2">Annual Amount ($)</div>
                  <div className="col-span-2">Quarterly Amount ($)</div>
                </div>
                {hcpLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateHcp(idx, 'level', e.target.value)}
                        placeholder="e.g. Level 1"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateHcp(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-2 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual}
                        onChange={(e) => {
                          updateHcp(idx, 'amountAnnual', Number(e.target.value));
                          updateHcp(idx, 'amountQuarterly', Number((Number(e.target.value) / 4).toFixed(2)));
                        }}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountQuarterly}
                        onChange={(e) => {
                          updateHcp(idx, 'amountQuarterly', Number(e.target.value));
                          updateHcp(idx, 'amountAnnual', Number((Number(e.target.value) * 4).toFixed(2)));
                        }}
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
                  <div className="col-span-2">Class Level</div>
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2">Annual Budget ($)</div>
                  <div className="col-span-2">Quarterly Budget ($)</div>
                </div>
                {sahLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateSah(idx, 'level', e.target.value)}
                        placeholder="e.g. Class 1"
                      />
                    </div>
                    <div className="col-span-6">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateSah(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-2 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual}
                        onChange={(e) => {
                          updateSah(idx, 'amountAnnual', Number(e.target.value));
                          updateSah(idx, 'amountQuarterly', Number((Number(e.target.value) / 4).toFixed(2)));
                        }}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                      <input
                        type="number"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountQuarterly}
                        onChange={(e) => {
                          updateSah(idx, 'amountQuarterly', Number(e.target.value));
                          updateSah(idx, 'amountAnnual', Number((Number(e.target.value) * 4).toFixed(2)));
                        }}
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
