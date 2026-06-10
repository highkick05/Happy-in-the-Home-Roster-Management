import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Calculator, Save, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';

export default function ClientBudgetView() {
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

  const liveSystemConsumptions = processedLedgerItems.reduce((acc: number, item: any) => acc + item.amount, 0);
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
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-[#8B949E] text-sm font-medium mb-1">Total Cycle Allocation</div>
            <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(totalAllocation)}</div>
            <div className="flex flex-col items-start gap-1 mt-2">
              <div className="text-xs text-[#8B949E] bg-white/5 rounded-md px-2 py-1 inline-block w-max">
                Based on {totalDays} Days ({formatDate(cycleStart)} - {formatDate(cycleEnd)})
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
          <div className={`bg-brand-navy border ${remainingBalance >= 0 ? 'border-brand-green/30' : 'border-red-500/30'} rounded-xl p-6 shadow-sm flex flex-col justify-center relative overflow-hidden`}>
            {remainingBalance < 0 && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full flex items-start justify-end p-2 border-b border-l border-red-500/20">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            )}
            <div className="text-[#8B949E] text-sm font-medium mb-1">Remaining Balance</div>
            <div className={`text-3xl font-bold ${remainingBalance >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
              {formatCurrency(remainingBalance)}
            </div>
            <div className="text-xs text-[#8B949E] mt-2">
              For active cycle
            </div>
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
            <div className="p-6 border-b border-border-subtle flex items-center space-x-2 text-[#E6EDF3] shrink-0">
              <Calculator className="w-5 h-5 text-brand-blue" />
              <h3 className="font-semibold text-lg">System Ledger Preview</h3>
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
                        <td className="px-4 py-3 min-w-[200px] text-[12px]">{item.service}</td>
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
    </div>
  );
}
