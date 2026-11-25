import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, RefreshCw } from 'lucide-react';

export default function FundingTypesSettings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'FEES' | 'HCP' | 'SAH'>('FEES');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Default Home Care Fees (applied globally / new client defaults)
  const [defaultManagementFee, setDefaultManagementFee] = useState<number>(10);
  const [defaultCareCoordinationFee, setDefaultCareCoordinationFee] = useState<number>(20);
  const [defaultCareManagementFee, setDefaultCareManagementFee] = useState<number>(10);

  const [hcpLevels, setHcpLevels] = useState([
    { level: 'Level 1', title: 'Basic care needs for safety and independence', amountAnnual: 11294.22, amountQuarterly: 2823.56, amountDaily: Number((11294.22 / 365).toFixed(4)), billingCycle: 'annual' },
    { level: 'Level 2', title: 'Low-level care needs for basic assistance', amountAnnual: 19860.56, amountQuarterly: 4965.14, amountDaily: Number((19860.56 / 365).toFixed(4)), billingCycle: 'annual' },
    { level: 'Level 3', title: 'Intermediate care needs for daily support', amountAnnual: 43233.21, amountQuarterly: 10808.30, amountDaily: Number((43233.21 / 365).toFixed(4)), billingCycle: 'annual' },
    { level: 'Level 4', title: 'High-level care needs with complex requirements', amountAnnual: 65543.98, amountQuarterly: 16386.00, amountDaily: Number((65543.98 / 365).toFixed(4)), billingCycle: 'annual' },
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
        if (data.defaultManagementFee !== undefined && data.defaultManagementFee !== null) {
          setDefaultManagementFee(Number(data.defaultManagementFee));
        }
        if (data.defaultCareCoordinationFee !== undefined && data.defaultCareCoordinationFee !== null) {
          setDefaultCareCoordinationFee(Number(data.defaultCareCoordinationFee));
        }
        if (data.defaultCareManagementFee !== undefined && data.defaultCareManagementFee !== null) {
          setDefaultCareManagementFee(Number(data.defaultCareManagementFee));
        }
        if (data.hcpFundingLevels) {
          setHcpLevels(data.hcpFundingLevels.map((lvl: any) => {
             const amountAnnual = lvl.amountAnnual !== undefined ? Number(lvl.amountAnnual) : (Number(lvl.amount) || 0);
             const amountQuarterly = lvl.amountQuarterly !== undefined ? Number(lvl.amountQuarterly) : Number((amountAnnual / 4).toFixed(2));
             const amountDaily = Number((amountAnnual / 365).toFixed(4));
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
             const amountQuarterly = lvl.amountQuarterly !== undefined ? Number(lvl.amountQuarterly) : (Number(lvl.amount) || 0);
             const amountAnnual = lvl.amountAnnual !== undefined ? Number(lvl.amountAnnual) : Number((amountQuarterly * 4).toFixed(2));
             const amountDaily = Number((amountAnnual / 365).toFixed(4));
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
          sahFundingLevels: sahLevels,
          defaultManagementFee: Number(defaultManagementFee),
          defaultCareCoordinationFee: Number(defaultCareCoordinationFee),
          defaultCareManagementFee: Number(defaultCareManagementFee)
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

  const handleHcpAnnualChange = (index: number, valueStr: string) => {
    const val = Number(valueStr) || 0;
    const newLevels = [...hcpLevels];
    newLevels[index] = {
      ...newLevels[index],
      amountAnnual: val,
      amountQuarterly: Number((val / 4).toFixed(2)),
      amountDaily: Number((val / 365).toFixed(4))
    };
    setHcpLevels(newLevels);
  };

  const handleSahAnnualChange = (index: number, valueStr: string) => {
    const val = Number(valueStr) || 0;
    const newLevels = [...sahLevels];
    newLevels[index] = {
      ...newLevels[index],
      amountAnnual: val,
      amountQuarterly: Number((val / 4).toFixed(2)),
      amountDaily: Number((val / 365).toFixed(4))
    };
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
            activeTab === 'FEES' ? 'border-brand-teal text-brand-teal bg-white/[0.02]' : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.02]'
          }`}
          onClick={() => setActiveTab('FEES')}
        >
          Fee Rates &amp; Percentages
        </button>
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
          <form id="fundingTypesForm" onSubmit={handleSave} className="space-y-4 max-w-6xl font-sans">
            {activeTab === 'FEES' && (
              <div className="space-y-6 max-w-5xl">
                <div className="bg-[#121214] border border-border-subtle rounded-xl p-6 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-[#E6EDF3] flex items-center gap-2">
                      <span>Home Care Package &amp; Service Loading Fees</span>
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
                        System Defaults
                      </span>
                    </h4>
                    <p className="text-xs text-[#8B949E] mt-1 leading-relaxed">
                      Configure the baseline Service Loading Fee, Care Coordination, and Care Management percentages applied across Home Care packages (HCP &amp; Support at Home).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                    {/* Default Service Loading Fee (%) */}
                    <div className="bg-black/30 border border-white/[0.08] rounded-lg p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-semibold text-[#E6EDF3]">Default Service Loading Fee</label>
                          <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded font-mono font-medium whitespace-nowrap">Applied to Grand Total</span>
                        </div>
                        <p className="text-[11px] text-[#8B949E] mb-4 leading-normal">
                          Service loading fee percentage applied to services in the System Ledger Preview (e.g. 10%). Together with Care Coordination, this works out the Grand Total Amount charged to the client&apos;s funding.
                        </p>
                      </div>
                      <div className="relative mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={defaultManagementFee}
                          onChange={(e) => setDefaultManagementFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-navy border border-border-subtle rounded-md pl-4 pr-10 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-brand-teal font-mono transition-colors"
                          placeholder="10.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm font-medium">%</span>
                      </div>
                    </div>

                    {/* Default Care Coordination Fee (%) */}
                    <div className="bg-black/30 border border-white/[0.08] rounded-lg p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-semibold text-[#E6EDF3]">Default Care Coordinator Rate</label>
                          <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded font-mono font-medium whitespace-nowrap">New Client Default</span>
                        </div>
                        <p className="text-[11px] text-[#8B949E] mb-4 leading-normal">
                          The baseline Care Coordinator rate used when Home Care client accounts are set up to start with (default: 20%). Can be customized individually per client on their profile.
                        </p>
                      </div>
                      <div className="relative mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={defaultCareCoordinationFee}
                          onChange={(e) => setDefaultCareCoordinationFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-navy border border-border-subtle rounded-md pl-4 pr-10 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-brand-teal font-mono transition-colors"
                          placeholder="20.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm font-medium">%</span>
                      </div>
                    </div>

                    {/* Care Management Fee (%) */}
                    <div className="bg-black/30 border border-amber-500/20 rounded-lg p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-semibold text-[#E6EDF3]">Care Management Fee</label>
                          <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-medium whitespace-nowrap">Off Top of Subsidy</span>
                        </div>
                        <p className="text-[11px] text-[#8B949E] mb-4 leading-normal">
                          Deducted off the top of every Home Care client&apos;s quarterly funding subsidy (HCP &amp; Support at Home) before it hits their Total Allocation (ON) balance, and credited to HITH&apos;s pooled Care Management account.
                        </p>
                      </div>
                      <div className="relative mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={defaultCareManagementFee}
                          onChange={(e) => setDefaultCareManagementFee(parseFloat(e.target.value) || 0)}
                          className="w-full bg-brand-navy border border-border-subtle rounded-md pl-4 pr-10 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-brand-teal font-mono transition-colors"
                          placeholder="10.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Calculation Formula Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-brand-navy/60 border border-white/[0.06] rounded-lg p-4 text-xs text-[#8B949E] space-y-2">
                      <div className="text-zinc-300 font-medium flex items-center gap-1.5">
                        <span>1. Quarterly Subsidy &amp; Pooled Care Management Formula:</span>
                      </div>
                      <div className="font-mono text-[11px] bg-black/40 border border-white/[0.04] p-3 rounded text-zinc-300 leading-relaxed">
                        <div>1. Gross Quarterly Subsidy = Quarter Days × Daily Funding Rate</div>
                        <div>2. Care Management Fee (Pooled) = Gross Subsidy × <span className="text-amber-400 font-bold">{defaultCareManagementFee}%</span></div>
                        <div className="pt-1 text-[#E6EDF3] font-semibold border-t border-white/[0.06] mt-1">
                          3. Net Client Ongoing Allocation (ON) = Gross Subsidy − Care Management Fee
                        </div>
                      </div>
                    </div>

                    <div className="bg-brand-navy/60 border border-white/[0.06] rounded-lg p-4 text-xs text-[#8B949E] space-y-2">
                      <div className="text-zinc-300 font-medium flex items-center gap-1.5">
                        <span>2. Service Grand Total Amount Calculation Formula:</span>
                      </div>
                      <div className="font-mono text-[11px] bg-black/40 border border-white/[0.04] p-3 rounded text-zinc-300 leading-relaxed">
                        <div>1. Service Base Amount</div>
                        <div>2. Care Coordination Fee = Base Amount × <span className="text-brand-teal font-bold">{defaultCareCoordinationFee}%</span></div>
                        <div>3. Subtotal w/ Care Coord = Base Amount + Care Coordination Fee</div>
                        <div>4. Service Loading Fee = Subtotal × <span className="text-emerald-400 font-bold">{defaultManagementFee}%</span></div>
                        <div className="pt-1 text-[#E6EDF3] font-semibold border-t border-white/[0.06] mt-1">
                          5. Grand Total Amount = Subtotal + Service Loading Fee
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'HCP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-2">Level</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-3 text-right">Annual Subsidy ($ Source of Truth)</div>
                  <div className="col-span-2 text-right">Daily Rate (Annual ÷ 365)</div>
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
                    <div className="col-span-5">
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
                        className="w-full text-right bg-brand-navy border border-brand-teal/40 rounded-md pl-6 pr-3 py-1.5 text-xs text-[#E6EDF3] font-semibold focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual !== undefined ? lvl.amountAnnual : Number((lvl.amountDaily * 365).toFixed(2))}
                        onChange={(e) => handleHcpAnnualChange(idx, e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        className="w-full text-right bg-brand-navy/60 border border-border-subtle rounded-md pl-6 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual !== undefined ? Number((lvl.amountAnnual / 365).toFixed(4)) : lvl.amountDaily}
                        onChange={(e) => handleHcpDailyChange(idx, e.target.value)}
                        step="0.0001"
                        title="Full floating-point precision (Annual / 365) is used for quarterly budget calculations"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4 font-sans leading-relaxed">
                   Annual Subsidy is stored as the source of truth ($65,543.98 for HCP 4, $43,233.21 for HCP 3, $19,860.56 for HCP 2, $11,294.22 for HCP 1). Quarterly calculations use full floating-point precision <code className="text-brand-teal">(Annual ÷ 365) × Days in Quarter</code> to match Trilogy Care to $0.00.
                </div>
              </div>
            )}
            
            {activeTab === 'SAH' && (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border-subtle text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  <div className="col-span-2">Class Level</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-3 text-right">Annual Subsidy ($ Source of Truth)</div>
                  <div className="col-span-2 text-right">Daily Rate (Annual ÷ 365)</div>
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
                    <div className="col-span-5">
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
                        className="w-full text-right bg-brand-navy border border-brand-teal/40 rounded-md pl-6 pr-3 py-1.5 text-xs text-[#E6EDF3] font-semibold focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual !== undefined ? lvl.amountAnnual : Number((lvl.amountDaily * 365).toFixed(2))}
                        onChange={(e) => handleSahAnnualChange(idx, e.target.value)}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        className="w-full text-right bg-brand-navy/60 border border-border-subtle rounded-md pl-6 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-brand-teal transition-colors font-mono"
                        value={lvl.amountAnnual !== undefined ? Number((lvl.amountAnnual / 365).toFixed(4)) : lvl.amountDaily}
                        onChange={(e) => handleSahDailyChange(idx, e.target.value)}
                        step="0.0001"
                        title="Full floating-point precision (Annual / 365) is used for quarterly budget calculations"
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-[#8B949E] mt-4 font-sans leading-relaxed">
                   Annual Subsidy is stored as the source of truth for Support at Home (SaH) classifications. Quarterly calculations use full floating-point precision <code className="text-brand-teal">(Annual ÷ 365) × Days in Quarter</code>.
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
