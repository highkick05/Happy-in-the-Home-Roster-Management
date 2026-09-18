import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

// Helper to compare weekday, Saturday, Sunday, and Public Holidays hours values
const isBlockHoursEqual = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  return (
    Number(b1.weekday_hours || 0) === Number(b2.weekday_hours || 0) &&
    Number(b1.saturday_hours || 0) === Number(b2.saturday_hours || 0) &&
    Number(b1.sunday_hours || 0) === Number(b2.sunday_hours || 0) &&
    Number(b1.publicholiday_hours || 0) === Number(b2.publicholiday_hours || 0)
  );
};

// Check if block has any scheduled hours (avoids matching empty 0-hour blocks)
const hasAnyHours = (b: any) => {
  if (!b) return false;
  return (
    Number(b.weekday_hours || 0) > 0 ||
    Number(b.saturday_hours || 0) > 0 ||
    Number(b.sunday_hours || 0) > 0 ||
    Number(b.publicholiday_hours || 0) > 0
  );
};

// Determines if two blocks represent consecutive weeks
const areConsecutiveWeeks = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  if (b1.week_of_month != null && b2.week_of_month != null) {
    return Math.abs(Number(b2.week_of_month) - Number(b1.week_of_month)) === 1;
  }
  if (b1.start_date && b2.start_date) {
    const d1 = new Date(b1.start_date + 'T12:00:00Z').getTime();
    const d2 = new Date(b2.start_date + 'T12:00:00Z').getTime();
    const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    return diffDays >= 5 && diffDays <= 9;
  }
  return true;
};

// Compute highlight information for blocks in a service group
const getBlockHighlightGroups = (blocks: any[]) => {
  const highlightInfo: { 
    isHighlighted: boolean; 
    groupId: number | null; 
    isFirstInGroup: boolean; 
    isLastInGroup: boolean;
  }[] = blocks.map(() => ({
    isHighlighted: false,
    groupId: null,
    isFirstInGroup: false,
    isLastInGroup: false
  }));

  let currentGroupId = 0;
  let inGroup = false;

  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    const isMatch = 
      hasAnyHours(current) && 
      hasAnyHours(next) && 
      areConsecutiveWeeks(current, next) && 
      isBlockHoursEqual(current, next);

    if (isMatch) {
      if (!inGroup) {
        currentGroupId++;
        inGroup = true;
        highlightInfo[i].isHighlighted = true;
        highlightInfo[i].groupId = currentGroupId;
        highlightInfo[i].isFirstInGroup = true;
      }
      highlightInfo[i + 1].isHighlighted = true;
      highlightInfo[i + 1].groupId = currentGroupId;
    } else {
      if (inGroup) {
        highlightInfo[i].isLastInGroup = true;
        inGroup = false;
      }
    }
  }

  if (inGroup && blocks.length > 0) {
    highlightInfo[blocks.length - 1].isLastInGroup = true;
  }

  return highlightInfo;
};

export default function TrilogyPlanningView() {
  const { token } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(() => {
    return localStorage.getItem('trilogyPlanningSelectedClient') || '';
  });
  const [selectedQuarterIndex, setSelectedQuarterIndex] = useState<number>(1); // Default to Q1 or current
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (selectedClient) {
      localStorage.setItem('trilogyPlanningSelectedClient', selectedClient);
    } else {
      localStorage.removeItem('trilogyPlanningSelectedClient');
    }
  }, [selectedClient]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      // Fix for funding_type matching
      const hcClients = data.filter((c: any) => c.funding_type === 'Home Care' || c.funding_type === 'HCP' || c.funding_type === 'HOME_CARE');
      setClients(hcClients);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Generate Quarters based on selected client
  const quarters = useMemo(() => {
    const now = new Date();
    // Determine Financial Year start year (FY starts 30 Jun)
    const isPastJun30 = now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() >= 30);
    const fyStartYear = isPastJun30 ? now.getFullYear() : now.getFullYear() - 1;

    const baseQuarters = [
      { id: 1, label: "Quarter 1", start: new Date(fyStartYear, 5, 30), end: new Date(fyStartYear, 8, 30) },
      { id: 2, label: "Quarter 2", start: new Date(fyStartYear, 8, 30), end: new Date(fyStartYear, 11, 31) },
      { id: 3, label: "Quarter 3", start: new Date(fyStartYear, 11, 31), end: new Date(fyStartYear + 1, 2, 31) },
      { id: 4, label: "Quarter 4", start: new Date(fyStartYear + 1, 2, 31), end: new Date(fyStartYear + 1, 5, 30) }
    ];

    const client = clients.find(c => c.id.toString() === selectedClient);
    
    return baseQuarters.map(q => {
      let qStart = q.start;
      // Bridging quarter logic
      if (client && client.joined_date) {
        const joined = new Date(client.joined_date);
        if (!isNaN(joined.getTime()) && joined >= q.start && joined < q.end) {
          qStart = joined;
        }
      }

      const isCurrent = now >= q.start && now < q.end;
      const displayLabel = `${q.label}: ${format(qStart, 'd MMM')} - ${format(q.end, 'd MMM yyyy')}`;
      
      return {
        ...q,
        actualStart: qStart,
        displayLabel,
        isCurrent
      };
    });
  }, [clients, selectedClient]);

  // Set default quarter on load
  useEffect(() => {
    if (quarters.length > 0) {
      const current = quarters.findIndex(q => q.isCurrent);
      if (current !== -1) {
        setSelectedQuarterIndex(current);
      }
    }
  }, [quarters]);
  
  const fetchSummary = useCallback(async (clientId: string, quarterIndex: number) => {
    if (!clientId) {
      setResults([]);
      return;
    }
    
    const activeQuarter = quarters[quarterIndex];
    if (!activeQuarter) return;

    // Convert dates to YYYY-MM-DD for API
    const startDate = activeQuarter.actualStart.toISOString().split('T')[0];
    const endDate = activeQuarter.end.toISOString().split('T')[0];
    
    setIsLoading(true);
    try {
      const client = clients.find(c => c.id.toString() === clientId);
      const clientName = client ? `${client.first_name} ${client.last_name}` : '';
      
      const res = await fetch(`/api/reports/trilogy-summary?client_name=${encodeURIComponent(clientName)}&start_date=${startDate}&end_date=${endDate}&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [quarters, clients, token]);

  useEffect(() => {
    fetchSummary(selectedClient, selectedQuarterIndex);
  }, [selectedClient, selectedQuarterIndex, fetchSummary]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchClients(),
      fetchSummary(selectedClient, selectedQuarterIndex)
    ]);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E6EDF3] mb-1.5 tracking-tight">Trilogy Planning Summary</h1>
          <p className="text-[#8B949E] text-xs">Extract completed shifts and group them into fixed date blocks for Trilogy Care portal input.</p>
        </div>
        <button
          id="refresh-trilogy-summary-btn"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 bg-brand-teal text-[#0D1117] hover:bg-brand-teal-hover active:scale-[0.98] transition-all text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Refresh Trilogy planning data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1 w-full md:max-w-md">
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">Home Care Client</label>
            <select 
              id="trilogy-client-select"
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.15]"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 w-full md:max-w-md">
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">Budget Quarter</label>
            <select 
              id="trilogy-quarter-select"
              value={selectedQuarterIndex} 
              onChange={e => setSelectedQuarterIndex(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.15]"
            >
              {quarters.map((q, idx) => (
                <option key={idx} value={idx}>
                  {q.displayLabel} {q.isCurrent ? ' (Current quarter)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-8">
          {results.map((monthGroup, mIdx) => (
            <div key={mIdx} className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-wide uppercase">{monthGroup.month}</h2>
              {monthGroup.services.map((serviceGroup: any, idx: number) => {
                const highlightInfo = getBlockHighlightGroups(serviceGroup.blocks || []);
                const hasHighlights = highlightInfo.some(h => h.isHighlighted);

                return (
                  <div key={idx} className="bg-[#151515] border border-white/[0.05] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-black/40 border-b border-white/[0.05] flex items-center justify-between">
                      <h3 className="text-xs font-semibold tracking-wide text-[#E6EDF3]">{serviceGroup.service_name}</h3>
                      {hasHighlights && (
                        <span className="text-[10px] font-medium text-brand-teal flex items-center gap-1.5 bg-brand-teal/10 px-2 py-0.5 rounded border border-brand-teal/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                          Identical consecutive weeks highlighted
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.05] bg-black/20">
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Week</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Dates</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Base Rate</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Weekday Hrs</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sat Hrs</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sun Hrs</th>
                            <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">PH Hrs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {serviceGroup.blocks.map((block: any, bIdx: number) => {
                            const info = highlightInfo[bIdx];
                            const isHighlighted = info?.isHighlighted;
                            const isEvenGroup = info?.groupId ? info.groupId % 2 === 0 : false;

                            return (
                              <tr 
                                key={bIdx} 
                                className={`transition-colors ${
                                  isHighlighted 
                                    ? (isEvenGroup 
                                        ? 'bg-sky-500/[0.08] hover:bg-sky-500/[0.14]' 
                                        : 'bg-brand-teal/[0.09] hover:bg-brand-teal/[0.15]') 
                                    : 'hover:bg-white/[0.02]'
                                }`}
                              >
                                <td className={`px-4 py-2 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors ${
                                  isHighlighted 
                                    ? (isEvenGroup ? 'border-l-2 border-sky-400 pl-3.5' : 'border-l-2 border-brand-teal pl-3.5') 
                                    : ''
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <span className={isHighlighted ? (isEvenGroup ? 'text-sky-300 font-bold' : 'text-brand-teal font-bold') : 'text-brand-teal'}>
                                      {block.week_of_month ? `Week ${block.week_of_month}` : '-'}
                                    </span>
                                    {isHighlighted && (
                                      <span 
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                          isEvenGroup 
                                            ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30' 
                                            : 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'
                                        }`}
                                        title="Consecutive week with identical weekday, Sat, Sun, and PH hours"
                                      >
                                        Matching
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs font-semibold tracking-wide text-[#E6EDF3] whitespace-nowrap">
                                  {block.start_date ? format(new Date(block.start_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                                  <span className="mx-1.5 text-zinc-500/80">to</span>
                                  {block.end_date ? format(new Date(block.end_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                                </td>
                                <td className="px-4 py-2 text-xs font-semibold tracking-wide text-[#8B949E] text-right">
                                  ${block.rate?.toFixed(2)}
                                </td>
                                <td className={`px-4 py-2 text-xs font-semibold tracking-wide text-right ${
                                  isHighlighted 
                                    ? (isEvenGroup ? 'text-sky-300 font-bold' : 'text-brand-teal font-bold') 
                                    : 'text-brand-teal'
                                }`}>
                                  {block.weekday_hours > 0 ? `${block.weekday_hours} hrs` : '-'}
                                </td>
                                <td className={`px-4 py-2 text-xs font-semibold tracking-wide text-right ${
                                  isHighlighted 
                                    ? (isEvenGroup ? 'text-sky-300 font-bold' : 'text-brand-teal font-bold') 
                                    : 'text-brand-teal'
                                }`}>
                                  {block.saturday_hours > 0 ? `${block.saturday_hours} hrs` : '-'}
                                </td>
                                <td className={`px-4 py-2 text-xs font-semibold tracking-wide text-right ${
                                  isHighlighted 
                                    ? (isEvenGroup ? 'text-sky-300 font-bold' : 'text-brand-teal font-bold') 
                                    : 'text-brand-teal'
                                }`}>
                                  {block.sunday_hours > 0 ? `${block.sunday_hours} hrs` : '-'}
                                </td>
                                <td className={`px-4 py-2 text-xs font-semibold tracking-wide text-right ${
                                  isHighlighted 
                                    ? (isEvenGroup ? 'text-sky-300 font-bold' : 'text-brand-teal font-bold') 
                                    : 'text-brand-teal'
                                }`}>
                                  {block.publicholiday_hours > 0 ? `${block.publicholiday_hours} hrs` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-8 text-center shadow-sm">
          <p className="text-[#8B949E] text-xs font-semibold tracking-wide">
            {isLoading ? 'Loading data...' : 'No data generated. Ensure the selected client has COMPLETED (or charged CANCELLED) shifts in this quarter.'}
          </p>
        </div>
      )}
    </div>
  );
}
