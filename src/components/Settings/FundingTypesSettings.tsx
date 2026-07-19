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
    { level: 'Level 1', title: 'Basic care needs for safety and independence', amountAnnual: 10986.50, amountQuarterly: 2746.63, amountDaily: 30.10, billingCycle: 'annual' },
    { level: 'Level 2', title: 'Low-level care needs for basic assistance', amountAnnual: 19319.45, amountQuarterly: 4829.86, amountDaily: 52.93, billingCycle: 'annual' },
    { level: 'Level 3', title: 'Intermediate care needs for daily support', amountAnnual: 42055.30, amountQuarterly: 10513.83, amountDaily: 115.22, billingCycle: 'annual' },
    { level: 'Level 4', title: 'High-level care needs with complex requirements', amountAnnual: 63758.20, amountQuarterly: 15939.55, amountDaily: 174.68, billingCycle: 'annual' },
  ]);

  const [sahLevels, setSahLevels] = useState([
    { level: 'Class 1', title: 'Entry-level support for basic independence', amountQuarterly: 2682.75, amountAnnual: 10731.00, amountDaily: 29.40, billingCycle: 'quarterly' },
    { level: 'Class 2', title: 'Low-level support for varied needs', amountQuarterly: 4008.61, amountAnnual: 16034.45, amountDaily: 43.93, billingCycle: 'quarterly' },
    { level: 'Class 3', title: 'Moderate support for maintaining independence', amountQuarterly: 5491.43, amountAnnual: 21965.70, amountDaily: 60.18, billingCycle: 'quarterly' },
    { level: 'Class 4', title: 'Moderate to intermediate care requirements', amountQuarterly: 7424.10, amountAnnual: 29696.40, amountDaily: 81.36, billingCycle: 'quarterly' },
    { level: 'Class 5', title: 'Intermediate care for progressing support', amountQuarterly: 9924.35, amountAnnual: 39697.40, amountDaily: 108.76, billingCycle: 'quarterly' },
    { level: 'Class 6', title: 'High support needs including complex care', amountQuarterly: 12028.58, amountAnnual: 48114.30, amountDaily: 131.82, billingCycle: 'quarterly' },
    { level: 'Class 7', title: 'Very high support requiring comprehensive assistance', amountQuarterly: 14537.04, amountAnnual: 58148.15, amountDaily: 159.31, billingCycle: 'quarterly' },
    { level: 'Class 8', title: 'Maximum support for complex, continuous needs', amountQuarterly: 19526.59, amountAnnual: 78106.35, amountDaily: 213.99, billingCycle: 'quarterly' },
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
          setHcpLevels(data.hcpFundingLevels.map((lvl: any) => {
             const amountAnnual = lvl.amountAnnual !== undefined ? lvl.amountAnnual : (lvl.amount || 0);
             const amountQuarterly = lvl.amountQuarterly !== undefined ? lvl.amountQuarterly : (amountAnnual / 4);
             const amountDaily = lvl.amountDaily !== undefined ? lvl.amountDaily : Number((amountAnnual / 365).toFixed(2));
             return {
                ...lvl,
                amountAnnual,
                amountQuarterly,
                amountDaily
             };
          }));
        }
        if (data.sahFundingLevels) {
          setSahLevels(data.sahFundingLevels.map((lvl: any) => {
             const amountQuarterly = lvl.amountQuarterly !== undefined ? lvl.amountQuarterly : (lvl.amount || 0);
             const amountAnnual = lvl.amountAnnual !== undefined ? lvl.amountAnnual : (amountQuarterly * 4);
             const amountDaily = lvl.amountDaily !== undefined ? lvl.amountDaily : Number((amountAnnual / 365).toFixed(2));
             return {
                ...lvl,
                amountAnnual,
                amountQuarterly,
                amountDaily
             };
          }));
        } else {
           // Default SaH values for 2026
           const defaultSah = [
             { level: 'Class 1', title: 'Entry-level support for basic independence', amountQuarterly: 2682.75, amountAnnual: 10731.00, amountDaily: 29.40, billingCycle: 'quarterly' },
             { level: 'Class 2', title: 'Low-level support for varied needs', amountQuarterly: 4008.61, amountAnnual: 16034.45, amountDaily: 43.93, billingCycle: 'quarterly' },
             { level: 'Class 3', title: 'Moderate support for maintaining independence', amountQuarterly: 5491.43, amountAnnual: 21965.70, amountDaily: 60.18, billingCycle: 'quarterly' },
             { level: 'Class 4', title: 'Moderate to intermediate care requirements', amountQuarterly: 7424.10, amountAnnual: 29696.40, amountDaily: 81.36, billingCycle: 'quarterly' },
             { level: 'Class 5', title: 'Intermediate care for progressing support', amountQuarterly: 9924.35, amountAnnual: 39697.40, amountDaily: 108.76, billingCycle: 'quarterly' },
             { level: 'Class 6', title: 'High support needs including complex care', amountQuarterly: 12028.58, amountAnnual: 48114.30, amountDaily: 131.82, billingCycle: 'quarterly' },
             { level: 'Class 7', title: 'Very high support requiring comprehensive assistance', amountQuarterly: 14537.04, amountAnnual: 58148.15, amountDaily: 159.31, billingCycle: 'quarterly' },
             { level: 'Class 8', title: 'Maximum support for complex, continuous needs', amountQuarterly: 19526.59, amountAnnual: 78106.35, amountDaily: 213.99, billingCycle: 'quarterly' },
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

  const handleHcpDailyChange = (index: number, valueStr: string) => {
    const val = Number(valueStr) || 0;
    const newLevels = [...hcpLevels];
    newLevels[index] = {
      ...newLevels[index],
      amountDaily: val,
      amountAnnual: Number((val * 365).toFixed(2)),
      amountQuarterly: Number(((val * 365) / 4).toFixed(2))
    };
    setHcpLevels(newLevels);
  };

  const handleSahDailyChange = (index: number, valueStr: string) => {
    const val = Number(valueStr) || 0;
    const newLevels = [...sahLevels];
    newLevels[index] = {
      ...newLevels[index],
      amountDaily: val,
      amountAnnual: Number((val * 365).toFixed(2)),
      amountQuarterly: Number(((val * 365) / 4).toFixed(2))
    };
    setSahLevels(newLevels);
  };

  return (
    <div className="flex flex-col h-full bg-brand-navy overflow-hidden">
      <div className="p-3 border-b border-border-subtle flex justify-between items-center bg-brand-bg">
        <div>
          <h3 className="text-sm font-medium text-[#E6EDF3] mb-0.5">Funding Types & Levels</h3>
          <p className="text-xs text-[#8B949E]">Configure default funding levels and amounts for HCP and Support at Home (SaH).</p>
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

      <div className="flex-1 overflow-auto p-3">
        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-sm">
            {successMsg}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center p-3 text-[#8B949E]">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading funding settings...
          </div>
        ) : (
          <form id="fundingTypesForm" onSubmit={handleSave} className="space-y-3 max-w-6xl font-sans">
            {activeTab === 'HCP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-2">Level</div>
                  <div className="col-span-7">Description</div>
                  <div className="col-span-3 text-right">Daily Funding Rate ($)</div>
                </div>
                {hcpLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] font-semibold focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateHcp(idx, 'level', e.target.value)}
                        placeholder="e.g. Level 1"
                      />
                    </div>
                    <div className="col-span-7">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateHcp(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        className="w-full text-right bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-1.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountDaily !== undefined ? lvl.amountDaily : Number((lvl.amountAnnual / 365).toFixed(2))}
                        onChange={(e) => handleHcpDailyChange(idx, e.target.value)}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4 font-sans leading-relaxed">
                   These default properties indicate typical daily Government subsidy levels as of 2026. Custom amounts can still be overridden on individual client profiles.
                </div>
              </div>
            )}
            
            {activeTab === 'SAH' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-2">Class Level</div>
                  <div className="col-span-7">Description</div>
                  <div className="col-span-3 text-right">Daily Funding Rate ($)</div>
                </div>
                {sahLevels.map((lvl, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-2">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] font-semibold focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.level}
                        onChange={(e) => updateSah(idx, 'level', e.target.value)}
                        placeholder="e.g. Class 1"
                      />
                    </div>
                    <div className="col-span-7">
                      <input
                        type="text"
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-brand-teal transition-colors"
                        value={lvl.title}
                        onChange={(e) => updateSah(idx, 'title', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="col-span-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        className="w-full text-right bg-brand-navy border border-border-subtle rounded-md pl-6 pr-3 py-1.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountDaily !== undefined ? lvl.amountDaily : Number((lvl.amountAnnual / 365).toFixed(2))}
                        onChange={(e) => handleSahDailyChange(idx, e.target.value)}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4 font-sans leading-relaxed">
                   These properties define default daily budget expectations for the new Support at Home (SaH) model starting July 2025/2026.
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="p-3 border-t border-border-subtle bg-brand-navy flex justify-end">
        <button
          type="submit"
          form="fundingTypesForm"
          disabled={saving || loading}
          className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-sm font-medium rounded-md transition-all shadow-sm disabled:opacity-50"
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
