import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Calculator, Save, AlertCircle, ChevronLeft, ChevronRight, Flame, Plus, X } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { motion } from 'motion/react';

export default function HomeCareBudgetView() {
  // Minor update to force GitHub Sync mechanism
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [client, setClient] = useState<any>(null);
  const [fundingRates, setFundingRates] = useState<any>(null);
  const [ledger, setLedger] = useState<{ total: number, items: any[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states
  const [historicalInternal, setHistoricalInternal] = useState<number>(0);
  const [spendAsOfDate, setSpendAsOfDate] = useState<string>('');
  const [startingRolloverBalance, setStartingRolloverBalance] = useState<number>(0);
  const [rolloverSpentSoFar, setRolloverSpentSoFar] = useState<number>(0);

  // States for Manual External Expense logging
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [externalDate, setExternalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [externalService, setExternalService] = useState<string>('');
  const [externalVendor, setExternalVendor] = useState<string>('');
  const [externalBaseAmount, setExternalBaseAmount] = useState<string>('');
  const [externalLoadings, setExternalLoadings] = useState<boolean>(true);
  const [masterServices, setMasterServices] = useState<any[]>([]);
  const [submittingExternal, setSubmittingExternal] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      fetch('/api/services?type=HOME_CARE', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.ok) return res.json();
          return fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        })
        .then(data => {
          setMasterServices(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error('Error fetching master services:', err));
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, ratesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      let clientData: any;
      if (clientRes.ok) {
        clientData = await clientRes.json();
        setClient(clientData);
        setHistoricalInternal(clientData.historical_internal_consumptions || 0);
        setSpendAsOfDate(clientData.spend_as_of_date || '');
        setStartingRolloverBalance(clientData.starting_rollover_balance || 0);
        setRolloverSpentSoFar(clientData.rollover_spent_so_far || 0);
      }

      if (ratesRes.ok) {
        setFundingRates(await ratesRes.json());
      }

      // Calculate Quarter and Pro-rata logic to pass to ledger API
      if (clientData) {
         const now = new Date();
         const currentYear = now.getFullYear();
         const quarters = [
           { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 2, 31) },
           { start: new Date(currentYear, 3, 1), end: new Date(currentYear, 5, 30) },
           { start: new Date(currentYear, 6, 1), end: new Date(currentYear, 8, 30) },
           { start: new Date(currentYear, 9, 1), end: new Date(currentYear, 11, 31) }
         ];
         const activeQuarter = quarters.find(q => now >= q.start && now <= q.end) || quarters[0];
         let cycleStart = activeQuarter.start;
         if (clientData.joined_date) {
           const joined = new Date(clientData.joined_date);
           if (!isNaN(joined.getTime()) && joined >= activeQuarter.start && joined <= activeQuarter.end) {
             cycleStart = joined;
           }
         }
         const sDate = cycleStart.toISOString().split('T')[0];
         const eDate = activeQuarter.end.toISOString().split('T')[0];

         const ledgerRes = await fetch(`/api/clients/${id}/budget-ledger?startDate=${sDate}&endDate=${eDate}`, { headers: { Authorization: `Bearer ${token}` } });
         if (ledgerRes.ok) {
           setLedger(await ledgerRes.json());
         }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          other_providers_spent: 0,
          historical_internal_consumptions: historicalInternal,
          spend_as_of_date: spendAsOfDate,
          cycle_start_date: activeCycle.startStr,
          cycle_end_date: activeCycle.endStr,
          starting_rollover_balance: startingRolloverBalance,
          rollover_spent_so_far: rolloverSpentSoFar
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExternalExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalDate || !externalService || !externalBaseAmount) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmittingExternal(true);
    try {
      const res = await fetch(`/api/clients/${id}/ledger/external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: externalDate,
          serviceName: externalService,
          vendorName: externalVendor,
          baseAmount: parseFloat(externalBaseAmount) || 0,
          applyLoadings: externalLoadings
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLedger(prev => ({
          total: prev.total + data.item.amount,
          items: [data.item, ...prev.items]
        }));

        setExternalService('');
        setExternalVendor('');
        setExternalBaseAmount('');
        setExternalLoadings(true);
        setIsExternalModalOpen(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit external expense.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    } finally {
      setSubmittingExternal(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E]">Loading budget details...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-red-500">Client not found.</div>
    );
  }

  // Calculate Quarter and Pro-rata logic
  const now = new Date();
  const currentYear = now.getFullYear();
  const quarters = [
    { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 2, 31) }, // Q1
    { start: new Date(currentYear, 3, 1), end: new Date(currentYear, 5, 30) }, // Q2
    { start: new Date(currentYear, 6, 1), end: new Date(currentYear, 8, 30) }, // Q3
    { start: new Date(currentYear, 9, 1), end: new Date(currentYear, 11, 31) } // Q4
  ];

  const activeQuarter = quarters.find(q => now >= q.start && now <= q.end) || quarters[0];
  
  let cycleStart = activeQuarter.start;
  const cycleEnd = activeQuarter.end;
  
  if (client.joined_date) {
    // Need to parse properly
    const joined = new Date(client.joined_date);
    if (!isNaN(joined.getTime())) {
      if (joined >= activeQuarter.start && joined <= activeQuarter.end) {
        // Bridging cycle
        cycleStart = joined;
      }
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  // Inclusive date count
  const totalDays = Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay) + 1;

  const activeCycle = {
    startStr: cycleStart.toISOString().split('T')[0],
    endStr: cycleEnd.toISOString().split('T')[0],
    totalDays
  };

  // Funding Rate calculation
  const getClientDailyRate = () => {
    if (!client || client.funding_type !== 'HOME_CARE') return 0;
    const subType = client.home_care_sub_type || 'HCP';
    const levelOrClass = client.home_care_level_or_class || 'Level 1';
    
    if (subType === 'SAH') {
      const levels = fundingRates?.sahFundingLevels || [
        { level: 'Class 1', amountDaily: 29.40 },
        { level: 'Class 2', amountDaily: 43.93 },
        { level: 'Class 3', amountDaily: 60.18 },
        { level: 'Class 4', amountDaily: 81.36 },
        { level: 'Class 5', amountDaily: 108.76 },
        { level: 'Class 6', amountDaily: 131.82 },
        { level: 'Class 7', amountDaily: 159.31 },
        { level: 'Class 8', amountDaily: 213.99 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 29.40;
    } else {
      const levels = fundingRates?.hcpFundingLevels || [
        { level: 'Level 1', amountDaily: 30.10 },
        { level: 'Level 2', amountDaily: 52.93 },
        { level: 'Level 3', amountDaily: 115.22 },
        { level: 'Level 4', amountDaily: 174.68 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 30.10;
    }
  };

  const dailyRate = getClientDailyRate();
  const grossAllocation = totalDays * dailyRate;
  
  const isHomeCare = client?.funding_type === 'Home Care' || client?.funding_type === 'HOME_CARE';
  const managementFeePercent = isHomeCare ? (client?.management_fee ?? 0) : 0;
  const careCoordPercent = isHomeCare ? (client?.care_coordination_fee ?? 20) : 0;
  
  const totalAllocation = grossAllocation; // Full amount, no cuts

  const calculateServiceConsumptionWithFees = (baseAmount: number, ccPercent: number, mfPercent: number) => {
    if (!isHomeCare) return { baseAmount, coordinationFee: 0, subtotal: baseAmount, managementFee: 0, total: baseAmount };
    const coordinationFee = baseAmount * (ccPercent / 100);
    const subtotal = baseAmount + coordinationFee;
    const managementFee = subtotal * (mfPercent / 100);
    
    return {
      baseAmount,
      coordinationFee,
      subtotal,
      managementFee,
      total: baseAmount + coordinationFee + managementFee
    };
  };

  const processedLedgerItems = ledger.items.map((item: any) => {
    if (item.source_type === 'external') {
      return {
        ...item,
        baseAmount: item.base_amount ?? item.amount,
        coordinationFee: item.care_coord_fee ?? 0,
        subtotal: (item.base_amount ?? item.amount) + (item.care_coord_fee ?? 0),
        managementFee: item.management_fee ?? 0,
        amount: item.grand_total ?? item.amount
      };
    }
    const fees = calculateServiceConsumptionWithFees(item.amount, careCoordPercent, managementFeePercent);
    return {
      ...item,
      baseAmount: fees.baseAmount,
      coordinationFee: fees.coordinationFee,
      subtotal: fees.subtotal,
      managementFee: fees.managementFee,
      amount: fees.total // Update amount to the total consumed
    };
  });

  const liveSystemConsumptions = processedLedgerItems.reduce((acc: number, item: any) => {
    let itemDateYMD = '';
    if (item.date && item.date.length === 10 && item.date[2] === '-') {
      const [d, m, y] = item.date.split('-');
      itemDateYMD = `${y}-${m}-${d}`;
    } else if (item.date) {
      itemDateYMD = item.date;
    }

    if (spendAsOfDate && itemDateYMD && itemDateYMD <= spendAsOfDate) {
      return acc;
    }
    return acc + item.amount;
  }, 0);
  const totalInternal = historicalInternal + liveSystemConsumptions;
  const totalCombinedSpent = totalInternal;
  const remainingBalance = totalAllocation - totalCombinedSpent;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(processedLedgerItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLedgerItems = processedLedgerItems.slice(startIndex, startIndex + itemsPerPage);

  // Participant Contribution calculations
  const totalClientShare = processedLedgerItems.reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);
  const independenceShare = processedLedgerItems
    .filter((item: any) => {
      const cat = item.service_category || '';
      return cat.toLowerCase() === 'independence' || cat.toLowerCase() === 'independence supports';
    })
    .reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);
  const everydayLivingShare = processedLedgerItems
    .filter((item: any) => {
      const cat = item.service_category || '';
      return cat.toLowerCase() === 'everyday living' || cat.toLowerCase() === 'everyday';
    })
    .reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);

  const billingTier = client.billing_tier || 'SAH_Full_Pensioner';
  const monthlyCap = client.historical_monthly_cap || 0;
  const progressPercent = monthlyCap > 0 ? Math.min((totalClientShare / monthlyCap) * 100, 100) : 0;
  const isCapExhausted = totalClientShare >= monthlyCap;

  const getTierBadge = (t: string) => {
    const isHybrid = t === 'Hybrid';
    const isGrandfathered = t === 'Grandfathered';
    if (isGrandfathered) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          Grandfathered
        </span>
      );
    } else if (isHybrid) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
          Hybrid
        </span>
      );
    } else {
      let label = "Support at Home";
      if (t === 'SAH_Full_Pensioner') label = "SaH: Full Pensioner";
      else if (t === 'SAH_Part_Pensioner') label = "SaH: Part Pensioner";
      else if (t === 'SAH_Self_Funded') label = "SaH: Self-Funded";
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
          {label}
        </span>
      );
    }
  };

  return (
    <div className="w-full flex flex-col h-full space-y-6">
      <div className="flex items-center space-x-4 mb-2 shrink-0">
        <button 
          onClick={() => navigate(`/clients/${id}`)}
          className="p-2 -ml-2 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight">
            Client Budget
          </h2>
          <div className="flex items-center text-sm mt-1 text-[#8B949E] space-x-2">
            <span className="font-medium text-[#E6EDF3]">{client.first_name} {client.last_name}</span>
            <span>•</span>
            <span>{client.home_care_sub_type || 'HCP'} {client.home_care_level_or_class || 'Level 1'}</span>
            <span>•</span>
            <span className="text-brand-green font-medium">{formatCurrency(dailyRate)} / day</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-6 space-y-6">
        {/* Kanban / Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-[#8B949E] text-sm font-medium mb-1">Total Cycle Allocation</div>
            <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(totalAllocation)}</div>
            <div className="flex flex-col items-start gap-1 mt-2">
              <div className="text-xs text-[#8B949E] bg-white/5 rounded-md px-2.5 py-1 w-full leading-normal">
                Based on <span className="text-white font-medium">{totalDays} Days</span>
                <span className="block text-[10px] text-zinc-400 mt-0.5 font-mono">({formatDate(cycleStart)} - {formatDate(cycleEnd)})</span>
              </div>
            </div>
          </div>
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-[#8B949E] text-sm font-medium mb-1">Total Combined Spent</div>
            <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(totalCombinedSpent)}</div>
            <div className="text-[11px] text-[#8B949E] mt-2 space-y-1">
              <div>Historical Internal: <span className="text-white">{formatCurrency(historicalInternal)}</span></div>
              <div>Live Internal: <span className="text-white">{formatCurrency(liveSystemConsumptions)}</span></div>
            </div>
          </div>
          <div className={`bg-brand-navy border ${remainingBalance >= 0 ? 'border-brand-green/30' : 'border-red-500/30 text-red-100'} rounded-xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden group`}>
            {remainingBalance < 0 && (
              <>
                <div className="absolute inset-0 z-0 pointer-events-none opacity-30 transition-opacity duration-1000 group-hover:opacity-50">
                  <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-red-600/50 via-orange-500/20 to-transparent blur-xl"></div>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 20, opacity: 0, scale: 0.8 }}
                      animate={{ 
                        y: [0, -60 - Math.random() * 40], 
                        opacity: [0, 0.7, 0],
                        scale: [0.8, 1.5, 0.5],
                        x: [0, (Math.random() - 0.5) * 30]
                      }}
                      transition={{ 
                        duration: 1.5 + Math.random() * 2, 
                        repeat: Infinity, 
                        ease: "easeIn",
                        delay: Math.random() * 2
                      }}
                      className="absolute -bottom-4 text-orange-500/80 mix-blend-screen"
                      style={{ left: `${5 + Math.random() * 85}%` }}
                    >
                      <Flame className="w-10 h-10" fill="currentColor" />
                    </motion.div>
                  ))}
                  <motion.div
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-red-900/20 mix-blend-overlay"
                  />
                </div>
                <div className="absolute z-10 top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full flex items-start justify-end p-2 border-b border-l border-red-500/30">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              </>
            )}
            <div className="relative z-10 text-[#8B949E] text-sm font-medium mb-1">Remaining Balance</div>
            <div className={`relative z-10 text-3xl font-bold ${remainingBalance >= 0 ? 'text-brand-green' : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]'}`}>
              {formatCurrency(remainingBalance)}
            </div>
            <div className={`relative z-10 text-xs mt-2 ${remainingBalance >= 0 ? 'text-[#8B949E]' : 'text-red-200/80'}`}>
              For active cycle
            </div>
          </div>

          {/* Participant Contribution Card */}
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-[#8B949E] text-sm font-medium">Participant Contribution</span>
              {getTierBadge(billingTier)}
            </div>
            
            <div className="text-3xl font-bold text-[#E6EDF3] mb-3">
              {formatCurrency(totalClientShare)}
            </div>
            
            <div className="space-y-2 mt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8B949E]">Clinical Care</span>
                <span className="text-zinc-500 font-mono">[0% Co-pay] $0.00</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8B949E]">Independence Supports</span>
                <span className="text-[#E6EDF3] font-mono">{formatCurrency(independenceShare)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8B949E]">Everyday Living</span>
                <span className="text-[#E6EDF3] font-mono">{formatCurrency(everydayLivingShare)}</span>
              </div>
            </div>

            {billingTier === 'Hybrid' && (
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="flex justify-between items-center text-[10px] text-[#8B949E] mb-1 font-sans">
                  <span>Cap Progress</span>
                  <span className="font-semibold text-white">{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCapExhausted && monthlyCap > 0 ? 'bg-orange-500' : 'bg-brand-blue'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#8B949E] mt-1.5 leading-tight">
                  {formatCurrency(totalClientShare)} / {formatCurrency(monthlyCap)} Cap Safety Net Active
                </div>
              </div>
            )}

            {billingTier === 'Grandfathered' && (
              <div className="mt-4 pt-3 border-t border-white/[0.04] text-[10px] text-emerald-400 font-sans italic">
                Grandfathered Relief Active: 100% Package Funded
              </div>
            )}
          </div>

          {/* Unspent Funds Pool Card */}
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col relative justify-center">
            <div className="text-[#8B949E] text-sm font-medium mb-3 flex items-center gap-1.5">
               <Calculator className="w-4 h-4 text-emerald-400" />
               Unspent Funds Pool
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#8B949E] mb-1">Starting Rollover Balance ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-[#8B949E] text-[12px]">$</span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={startingRolloverBalance}
                    onChange={(e) => setStartingRolloverBalance(parseFloat(e.target.value) || 0)}
                    disabled={user?.role !== 'ADMIN'}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md pl-6 pr-2 py-1.5 text-[13px] text-white outline-none focus:border-brand-blue transition-colors disabled:opacity-50" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8B949E] mb-1">Spent From Pool So Far ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-[#8B949E] text-[12px]">$</span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={rolloverSpentSoFar}
                    onChange={(e) => setRolloverSpentSoFar(parseFloat(e.target.value) || 0)}
                    disabled={user?.role !== 'ADMIN'}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md pl-6 pr-2 py-1.5 text-[13px] text-white outline-none focus:border-brand-blue transition-colors disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.04]">
              <div className="text-[11px] text-[#8B949E] mb-1">Actual Unspent Amount Remaining</div>
              <div className="text-lg font-bold text-emerald-400">
                {formatCurrency(startingRolloverBalance - rolloverSpentSoFar)}
              </div>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-3 w-full py-1.5 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue-300 border border-brand-blue/30 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Pool'}</span>
              </button>
            )}
          </div>

          {/* Historical Adjustments Card */}
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 shadow-sm flex flex-col relative justify-center">
            <div className="text-[#8B949E] text-sm font-medium mb-3 flex items-center gap-1.5">
               <Calculator className="w-4 h-4 text-purple-400" />
               Historical Adjustments
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#8B949E] mb-1">Pre-System Spend ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <span className="text-[#8B949E] text-[12px]">$</span>
                  </div>
                  <input 
                    type="number"
                    step="0.01"
                    value={historicalInternal}
                    onChange={(e) => setHistoricalInternal(parseFloat(e.target.value) || 0)}
                    disabled={user?.role !== 'ADMIN'}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md pl-6 pr-2 py-1.5 text-[13px] text-white outline-none focus:border-brand-blue transition-colors disabled:opacity-50" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8B949E] mb-1">Spend As Of Date</label>
                {user?.role === 'ADMIN' ? (
                  <CustomDatePicker
                    position="bottom"
                    align="right"
                    value={spendAsOfDate}
                    onChange={(e) => setSpendAsOfDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2 py-1.5 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                  />
                ) : (
                  <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2 py-1.5 text-[13px] text-[#E6EDF3] opacity-50">
                    {spendAsOfDate || 'N/A'}
                  </div>
                )}
              </div>
            </div>
            {user?.role === 'ADMIN' && (
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="mt-3 w-full py-1.5 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue-300 border border-brand-blue/30 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Adjustments'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Full Width Ledger Column */}
        <div className="w-full">
          <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between text-[#E6EDF3] shrink-0">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-brand-blue" />
                <h3 className="font-semibold text-lg">System Ledger Preview</h3>
              </div>
              <button 
                onClick={() => {
                  setExternalDate(new Date().toISOString().split('T')[0]);
                  setIsExternalModalOpen(true);
                }}
                className="bg-zinc-800 border border-zinc-700 text-xs font-medium px-3 h-8 rounded hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Log External Expense</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#121214] text-[11px] font-medium text-[#8B949E] sticky top-0 z-10 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-b border-border-subtle w-[10%]">Date</th>
                    <th className="px-4 py-3 border-b border-border-subtle w-[30%]">Service Item</th>
                    <th className="px-4 py-3 border-b border-border-subtle text-right">Service Amt</th>
                    {isHomeCare && <th className="px-4 py-3 border-b border-border-subtle text-right w-max">Care Coord ({careCoordPercent}%)</th>}
                    {isHomeCare && <th className="px-4 py-3 border-b border-border-subtle text-right w-max">Total w/ Care Coord ({careCoordPercent}%)</th>}
                    {isHomeCare && <th className="px-4 py-3 border-b border-border-subtle text-right w-max">Mgmt ({managementFeePercent}%)</th>}
                    <th className="px-4 py-3 border-b border-border-subtle text-right w-max">{isHomeCare ? 'Grand Total Amount' : 'Total Amount'}</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {processedLedgerItems.length === 0 ? (
                    <tr>
                      <td colSpan={isHomeCare ? 7 : 4} className="px-6 py-12 text-center text-[#8B949E]">
                        <p className="mb-2 italic">No live consumptions for this cycle yet.</p>
                        <p className="text-xs">Once shift-tracking goes live, items will automatically populate here.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLedgerItems.map((item, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] text-[#E6EDF3]">
                        <td className="px-4 py-3 whitespace-nowrap">{item.date}</td>
                        <td className="px-4 py-3 min-w-[200px] text-[12px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.service}</span>
                            {item.source_type === 'external' && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/80 font-medium">
                                [Ext - {item.vendor_name || 'Generic'}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.baseAmount)}</td>
                        {isHomeCare && <td className="px-4 py-3 text-right text-[#8B949E]">{formatCurrency(item.coordinationFee)}</td>}
                        {isHomeCare && <td className="px-4 py-3 text-right text-[#8B949E]">{formatCurrency(item.subtotal)}</td>}
                        {isHomeCare && <td className="px-4 py-3 text-right text-[#8B949E]">{formatCurrency(item.managementFee)}</td>}
                        <td className="px-4 py-3 text-right font-medium text-brand-blue">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {processedLedgerItems.length > itemsPerPage && (
              <div className="p-4 border-t border-border-subtle bg-black/20 flex items-center justify-between shrink-0">
                <div className="text-xs text-[#8B949E]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, processedLedgerItems.length)} of {processedLedgerItems.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-[#E6EDF3]">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log External Expense Modal */}
      {isExternalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#E6EDF3]">Log External/Brokerage Expense</h4>
              <button 
                onClick={() => setIsExternalModalOpen(false)}
                className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded-sm hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddExternalExpense} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Date of Expense *</label>
                <input
                  type="date"
                  required
                  value={externalDate}
                  onChange={(e) => setExternalDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Service Selection *</label>
                <select
                  required
                  value={externalService}
                  onChange={(e) => setExternalService(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select Service Item</option>
                  {masterServices.map(srv => (
                    <option key={srv.id} value={srv.name}>{srv.name} {srv.code ? `(${srv.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">External Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g., Cabcharge, Lite n' Easy"
                  value={externalVendor}
                  onChange={(e) => setExternalVendor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Total Invoice Base Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.00"
                  placeholder="0.00"
                  value={externalBaseAmount}
                  onChange={(e) => setExternalBaseAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {isHomeCare && (
                <div className="pt-1.5 pb-0.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="apply-loadings-toggle"
                      checked={externalLoadings}
                      onChange={(e) => setExternalLoadings(e.target.checked)}
                      className="mt-0.5 text-indigo-500 bg-zinc-950 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                    />
                    <div className="leading-none">
                      <label htmlFor="apply-loadings-toggle" className="text-xs font-medium text-zinc-300 cursor-pointer select-none">
                        Apply Platform Loadings
                      </label>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                        Apply Care Coordination ({careCoordPercent}%) and Management ({managementFeePercent}%) fees to this invoice amount.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExternalModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExternal}
                  className="px-3 py-1.5 rounded text-xs bg-emerald-700 hover:bg-emerald-600 font-medium text-white transition-colors disabled:opacity-50"
                >
                  {submittingExternal ? 'Logging...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
