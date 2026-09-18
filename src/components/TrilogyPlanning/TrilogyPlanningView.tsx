import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, BookOpen, CheckCircle2, Calendar, ArrowRight, Layers, FileText, Copy, Check } from 'lucide-react';
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

// Determines if two blocks represent consecutive calendar weeks
const areConsecutiveWeeks = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  if (b1.start_date && b2.start_date) {
    const d1 = new Date(b1.start_date + 'T12:00:00Z').getTime();
    const d2 = new Date(b2.start_date + 'T12:00:00Z').getTime();
    const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    return diffDays >= 5 && diffDays <= 9;
  }
  if (b1.week_of_month != null && b2.week_of_month != null) {
    return Math.abs(Number(b2.week_of_month) - Number(b1.week_of_month)) === 1;
  }
  return false;
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

interface ConsecutiveSummaryRow {
  service_name: string;
  month?: string;
  start_date: string;
  end_date: string;
  week_count: number;
  rate: number;
  weekday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
  publicholiday_hours: number;
}

interface NonConsecutiveBlockRow {
  service_name: string;
  month?: string;
  week_of_month?: string | number;
  start_date: string;
  end_date: string;
  rate: number;
  weekday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
  publicholiday_hours: number;
}

// Extract all consecutive matching week sequences across the quarter
const getQuarterConsecutiveSummaries = (monthResults: any[]): ConsecutiveSummaryRow[] => {
  const summaries: ConsecutiveSummaryRow[] = [];

  // Iterate each month and its services
  for (const monthGroup of monthResults) {
    for (const service of monthGroup.services || []) {
      const blocks = service.blocks || [];
      if (blocks.length < 2) continue;

      let seq: any[] = [];

      for (let i = 0; i < blocks.length - 1; i++) {
        const cur = blocks[i];
        const next = blocks[i + 1];

        const isMatch =
          hasAnyHours(cur) &&
          hasAnyHours(next) &&
          areConsecutiveWeeks(cur, next) &&
          isBlockHoursEqual(cur, next);

        if (isMatch) {
          if (seq.length === 0) {
            seq.push(cur);
          }
          seq.push(next);
        } else {
          if (seq.length >= 2) {
            const first = seq[0];
            const last = seq[seq.length - 1];
            summaries.push({
              service_name: service.service_name,
              month: monthGroup.month,
              start_date: first.start_date,
              end_date: last.end_date,
              week_count: seq.length,
              rate: first.rate,
              weekday_hours: Number(first.weekday_hours || 0),
              saturday_hours: Number(first.saturday_hours || 0),
              sunday_hours: Number(first.sunday_hours || 0),
              publicholiday_hours: Number(first.publicholiday_hours || 0)
            });
            seq = [];
          }
        }
      }

      if (seq.length >= 2) {
        const first = seq[0];
        const last = seq[seq.length - 1];
        summaries.push({
          service_name: service.service_name,
          month: monthGroup.month,
          start_date: first.start_date,
          end_date: last.end_date,
          week_count: seq.length,
          rate: first.rate,
          weekday_hours: Number(first.weekday_hours || 0),
          saturday_hours: Number(first.saturday_hours || 0),
          sunday_hours: Number(first.sunday_hours || 0),
          publicholiday_hours: Number(first.publicholiday_hours || 0)
        });
      }
    }
  }

  return summaries;
};

// Extract all service week blocks that were NOT part of consecutive matching sequences
const getQuarterNonConsecutiveBlocks = (monthResults: any[]): NonConsecutiveBlockRow[] => {
  const nonConsecutiveBlocks: NonConsecutiveBlockRow[] = [];

  for (const monthGroup of monthResults) {
    for (const service of monthGroup.services || []) {
      const blocks = service.blocks || [];
      const highlightInfo = getBlockHighlightGroups(blocks);

      blocks.forEach((block: any, idx: number) => {
        // If not highlighted (not part of a consecutive matching sequence) and has hours
        if (!highlightInfo[idx]?.isHighlighted && hasAnyHours(block)) {
          nonConsecutiveBlocks.push({
            service_name: service.service_name,
            month: monthGroup.month,
            week_of_month: block.week_of_month,
            start_date: block.start_date,
            end_date: block.end_date,
            rate: block.rate,
            weekday_hours: Number(block.weekday_hours || 0),
            saturday_hours: Number(block.saturday_hours || 0),
            sunday_hours: Number(block.sunday_hours || 0),
            publicholiday_hours: Number(block.publicholiday_hours || 0)
          });
        }
      });
    }
  }

  return nonConsecutiveBlocks;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };
  
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

          {/* Consecutive Matching Week Blocks Summary at the bottom of each budget quarter */}
          {(() => {
            const consecutiveSummaries = getQuarterConsecutiveSummaries(results);
            if (consecutiveSummaries.length === 0) return null;

            return (
              <div className="pt-4 border-t border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                      <span>Matching Consecutive Week Blocks Summary</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/30 normal-case tracking-normal">
                        {consecutiveSummaries.length} {consecutiveSummaries.length === 1 ? 'block sequence' : 'block sequences'} found
                      </span>
                    </h2>
                    <p className="text-[#8B949E] text-xs mt-0.5">
                      Combined date ranges from the start of the consecutive week blocks to the last date of the ending consecutive week blocks for Trilogy Care portal entry.
                    </p>
                  </div>
                </div>

                <div className="bg-[#151515] border border-brand-teal/30 rounded-xl overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-black/40">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Service Description</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Consecutive Range</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-center">Duration</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Base Rate</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Weekday Hrs / Wk</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sat Hrs / Wk</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sun Hrs / Wk</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">PH Hrs / Wk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {consecutiveSummaries.map((summary, sIdx) => (
                          <tr key={sIdx} className="hover:bg-brand-teal/[0.04] transition-colors">
                            <td className="px-4 py-3 text-xs font-semibold tracking-wide text-[#E6EDF3] border-l-2 border-brand-teal pl-3.5">
                              <div className="flex flex-col">
                                <span>{summary.service_name}</span>
                                {summary.month && (
                                  <span className="text-[10px] text-[#8B949E] font-normal">{summary.month}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold tracking-wide text-white whitespace-nowrap">
                              <span className="text-brand-teal font-bold">
                                {format(new Date(summary.start_date + 'T12:00:00Z'), 'd MMM yyyy')}
                              </span>
                              <span className="mx-2 text-zinc-500/80 font-normal">to</span>
                              <span className="text-brand-teal font-bold">
                                {format(new Date(summary.end_date + 'T12:00:00Z'), 'd MMM yyyy')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold tracking-wide text-center whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-white text-[11px] font-medium border border-white/[0.08]">
                                {summary.week_count} consecutive weeks
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold tracking-wide text-[#8B949E] text-right whitespace-nowrap">
                              ${summary.rate?.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {summary.weekday_hours > 0 ? `${summary.weekday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {summary.saturday_hours > 0 ? `${summary.saturday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {summary.sunday_hours > 0 ? `${summary.sunday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {summary.publicholiday_hours > 0 ? `${summary.publicholiday_hours} hrs` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Non-Consecutive / Standalone Service Week Blocks Summary underneath */}
          {(() => {
            const nonConsecutiveBlocks = getQuarterNonConsecutiveBlocks(results);
            if (nonConsecutiveBlocks.length === 0) return null;

            return (
              <div className="pt-4 border-t border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                      <span>Non-Consecutive Week Blocks Summary</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.08] text-[#E6EDF3] border border-white/[0.12] normal-case tracking-normal">
                        {nonConsecutiveBlocks.length} {nonConsecutiveBlocks.length === 1 ? 'block' : 'blocks'}
                      </span>
                    </h2>
                    <p className="text-[#8B949E] text-xs mt-0.5">
                      Individual service week blocks that were not part of a consecutive matching sequence.
                    </p>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden shadow-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-black/40">
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Service Description</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Week</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Dates</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Base Rate</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Weekday Hrs</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sat Hrs</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Sun Hrs</th>
                          <th className="px-4 py-2.5 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">PH Hrs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {nonConsecutiveBlocks.map((block, nIdx) => (
                          <tr key={nIdx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-[#E6EDF3]">
                              <div className="flex flex-col">
                                <span>{block.service_name}</span>
                                {block.month && (
                                  <span className="text-[10px] text-[#8B949E] font-normal">{block.month}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-brand-teal whitespace-nowrap">
                              {block.week_of_month ? `Week ${block.week_of_month}` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-[#E6EDF3] whitespace-nowrap">
                              {block.start_date ? format(new Date(block.start_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                              <span className="mx-1.5 text-zinc-500/80">to</span>
                              {block.end_date ? format(new Date(block.end_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-[#8B949E] text-right whitespace-nowrap">
                              ${block.rate?.toFixed(2)}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {block.weekday_hours > 0 ? `${block.weekday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {block.saturday_hours > 0 ? `${block.saturday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {block.sunday_hours > 0 ? `${block.sunday_hours} hrs` : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-semibold tracking-wide text-right text-brand-teal whitespace-nowrap">
                              {block.publicholiday_hours > 0 ? `${block.publicholiday_hours} hrs` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Direct Data to Enter into Trilogy Care Portal */}
          {(() => {
            const clientObj = clients.find(c => c.id.toString() === selectedClient);
            const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : 'the selected client';
            const currentQuarter = quarters[selectedQuarterIndex];
            const quarterLabel = currentQuarter ? currentQuarter.displayLabel : 'this budget quarter';
            const consecutiveSummaries = getQuarterConsecutiveSummaries(results);
            const nonConsecutiveBlocks = getQuarterNonConsecutiveBlocks(results);

            // Construct list of entries to enter into Trilogy
            const plannedEntries: Array<{
              id: string;
              type: 'Consecutive Multi-Week' | 'Single Week';
              service_name: string;
              startDateStr: string;
              endDateStr: string;
              startDateRaw: string;
              endDateRaw: string;
              rate: number;
              weekday_hours: number;
              saturday_hours: number;
              sunday_hours: number;
              publicholiday_hours: number;
              total_hours_per_week: number;
              weeksCount: number;
              total_quarter_hours: number;
              total_quarter_cost: number;
              note?: string;
            }> = [];

            // Add consecutive summaries
            consecutiveSummaries.forEach((c, idx) => {
              const startFormatted = format(new Date(c.start_date + 'T12:00:00Z'), 'dd/MM/yyyy');
              const endFormatted = format(new Date(c.end_date + 'T12:00:00Z'), 'dd/MM/yyyy');
              const weeklyHours = c.weekday_hours + c.saturday_hours + c.sunday_hours + c.publicholiday_hours;
              const totalQHours = weeklyHours * c.week_count;
              const totalCost = totalQHours * (c.rate || 0);

              plannedEntries.push({
                id: `entry-consec-${idx}`,
                type: 'Consecutive Multi-Week',
                service_name: c.service_name,
                startDateStr: startFormatted,
                endDateStr: endFormatted,
                startDateRaw: c.start_date,
                endDateRaw: c.end_date,
                rate: c.rate || 0,
                weekday_hours: c.weekday_hours,
                saturday_hours: c.saturday_hours,
                sunday_hours: c.sunday_hours,
                publicholiday_hours: c.publicholiday_hours,
                total_hours_per_week: weeklyHours,
                weeksCount: c.week_count,
                total_quarter_hours: totalQHours,
                total_quarter_cost: totalCost,
                note: `${c.week_count} consecutive weeks with identical weekly hours`
              });
            });

            // Add non-consecutive blocks
            nonConsecutiveBlocks.forEach((b, idx) => {
              const startFormatted = b.start_date ? format(new Date(b.start_date + 'T12:00:00Z'), 'dd/MM/yyyy') : '-';
              const endFormatted = b.end_date ? format(new Date(b.end_date + 'T12:00:00Z'), 'dd/MM/yyyy') : '-';
              const weeklyHours = b.weekday_hours + b.saturday_hours + b.sunday_hours + b.publicholiday_hours;
              const totalCost = weeklyHours * (b.rate || 0);

              plannedEntries.push({
                id: `entry-nonconsec-${idx}`,
                type: 'Single Week',
                service_name: b.service_name,
                startDateStr: startFormatted,
                endDateStr: endFormatted,
                startDateRaw: b.start_date,
                endDateRaw: b.end_date,
                rate: b.rate || 0,
                weekday_hours: b.weekday_hours,
                saturday_hours: b.saturday_hours,
                sunday_hours: b.sunday_hours,
                publicholiday_hours: b.publicholiday_hours,
                total_hours_per_week: weeklyHours,
                weeksCount: 1,
                total_quarter_hours: weeklyHours,
                total_quarter_cost: totalCost,
                note: b.week_of_month ? `Week ${b.week_of_month} (${b.month || ''})` : undefined
              });
            });

            const copyAllPlannedData = () => {
              const lines = [
                `TRILOGY CARE PLANNED SERVICES DATA TO ENTER`,
                `Client: ${clientName}`,
                `Quarter: ${quarterLabel}`,
                `Total Planned Entries: ${plannedEntries.length}`,
                `--------------------------------------------------`,
                ...plannedEntries.map((e, idx) => {
                  return [
                    `[Entry #${idx + 1}] (${e.type})`,
                    `Service: ${e.service_name}`,
                    `Dates: ${e.startDateStr} to ${e.endDateStr}`,
                    `Base Rate: $${e.rate.toFixed(2)}`,
                    `Weekday Hours: ${e.weekday_hours}`,
                    `Saturday Hours: ${e.saturday_hours}`,
                    `Sunday Hours: ${e.sunday_hours}`,
                    `Public Holiday Hours: ${e.publicholiday_hours}`,
                    `Weekly Total: ${e.total_hours_per_week} hrs/wk${e.weeksCount > 1 ? ` (${e.weeksCount} weeks = ${e.total_quarter_hours} hrs)` : ''}`,
                    `Estimated Total: $${e.total_quarter_cost.toFixed(2)}`,
                    `--------------------------------------------------`
                  ].join('\n');
                })
              ];
              handleCopyText('copy-all-data', lines.join('\n'));
            };

            if (plannedEntries.length === 0) return null;

            return (
              <div className="pt-6 border-t border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-teal" />
                      <span>Trilogy Care Planned Services — Data to Enter</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/30">
                        {plannedEntries.length} {plannedEntries.length === 1 ? 'Planned Service Entry' : 'Planned Service Entries'}
                      </span>
                    </h2>
                    <p className="text-[#8B949E] text-xs mt-0.5">
                      Exact fields and values ready to enter directly into the Trilogy Care Coordinator portal for <span className="text-white font-semibold">{clientName}</span> ({quarterLabel}).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyAllPlannedData}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-teal text-black text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm cursor-pointer"
                    >
                      {copiedId === 'copy-all-data' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-black" />
                          <span>Copied All Data!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-black" />
                          <span>Copy All Entries</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Table View of Exact Portal Data to Enter */}
                <div className="bg-[#151515] border border-brand-teal/25 rounded-xl overflow-hidden shadow-md">
                  <div className="px-4 py-3 bg-black/40 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">
                      Portal Line Items ({plannedEntries.length})
                    </span>
                    <span className="text-[11px] text-[#8B949E]">
                      Click any <Copy className="w-3 h-3 inline text-zinc-400" /> icon to copy the specific field value
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-black/60 text-[#8B949E] text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-3.5 py-2.5 w-10 text-center">#</th>
                          <th className="px-3.5 py-2.5">Service Description</th>
                          <th className="px-3.5 py-2.5">Start Date</th>
                          <th className="px-3.5 py-2.5">End Date</th>
                          <th className="px-3.5 py-2.5 text-right">Base Rate</th>
                          <th className="px-3.5 py-2.5 text-right">Weekday Hrs</th>
                          <th className="px-3.5 py-2.5 text-right">Sat Hrs</th>
                          <th className="px-3.5 py-2.5 text-right">Sun Hrs</th>
                          <th className="px-3.5 py-2.5 text-right">PH Hrs</th>
                          <th className="px-3.5 py-2.5 text-right">Weekly Total</th>
                          <th className="px-3.5 py-2.5 text-center">Type / Span</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-xs">
                        {plannedEntries.map((entry, idx) => (
                          <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-3.5 py-3 text-center text-[#8B949E] font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Service Description with Copy */}
                            <td className="px-3.5 py-3 font-semibold text-white">
                              <div className="flex items-center gap-1.5 group">
                                <span className="text-[#E6EDF3]">{entry.service_name}</span>
                                <button
                                  type="button"
                                  title="Copy Service Name"
                                  onClick={() => handleCopyText(`svc-${entry.id}`, entry.service_name)}
                                  className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                >
                                  {copiedId === `svc-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              {entry.note && (
                                <span className="text-[10px] text-zinc-500 block mt-0.5 font-normal">
                                  {entry.note}
                                </span>
                              )}
                            </td>

                            {/* Start Date */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-mono text-brand-teal font-semibold">{entry.startDateStr}</span>
                                <button
                                  type="button"
                                  title="Copy Start Date"
                                  onClick={() => handleCopyText(`sd-${entry.id}`, entry.startDateStr)}
                                  className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                >
                                  {copiedId === `sd-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* End Date */}
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-mono text-brand-teal font-semibold">{entry.endDateStr}</span>
                                <button
                                  type="button"
                                  title="Copy End Date"
                                  onClick={() => handleCopyText(`ed-${entry.id}`, entry.endDateStr)}
                                  className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                >
                                  {copiedId === `ed-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* Base Rate */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 group">
                                <span className="text-[#E6EDF3] font-mono">${entry.rate.toFixed(2)}</span>
                                <button
                                  type="button"
                                  title="Copy Rate"
                                  onClick={() => handleCopyText(`rate-${entry.id}`, entry.rate.toFixed(2))}
                                  className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5"
                                >
                                  {copiedId === `rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* Weekday Hours */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold ${entry.weekday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                {entry.weekday_hours > 0 ? entry.weekday_hours : '0'}
                              </span>
                            </td>

                            {/* Saturday Hours */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold ${entry.saturday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                {entry.saturday_hours > 0 ? entry.saturday_hours : '0'}
                              </span>
                            </td>

                            {/* Sunday Hours */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold ${entry.sunday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                {entry.sunday_hours > 0 ? entry.sunday_hours : '0'}
                              </span>
                            </td>

                            {/* PH Hours */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <span className={`font-mono font-bold ${entry.publicholiday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                {entry.publicholiday_hours > 0 ? entry.publicholiday_hours : '0'}
                              </span>
                            </td>

                            {/* Weekly Total */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-brand-teal">
                                {entry.total_hours_per_week} hrs
                              </span>
                            </td>

                            {/* Type / Span */}
                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              {entry.type === 'Consecutive Multi-Week' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-teal/15 text-brand-teal text-[10px] font-bold border border-brand-teal/30">
                                  {entry.weeksCount} Wks Recurring
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.08] text-[#8B949E] text-[10px] font-medium border border-white/[0.1]">
                                  Single Week
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Individual Entry Detail Cards for Quick Field-by-Field Entry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plannedEntries.map((entry, idx) => (
                    <div
                      key={`card-${entry.id}`}
                      className="bg-[#151515] border border-white/[0.08] hover:border-brand-teal/40 rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              Entry #{idx + 1}
                            </span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${entry.type === 'Consecutive Multi-Week' ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30' : 'bg-white/[0.08] text-[#8B949E] border border-white/[0.1]'}`}>
                            {entry.type === 'Consecutive Multi-Week' ? `${entry.weeksCount} Wks Multi-Span` : 'Single Week'}
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                          {/* Service Description */}
                          <div className="flex items-start justify-between gap-2 p-2 rounded bg-black/40 border border-white/[0.04]">
                            <span className="text-[#8B949E] text-[11px] shrink-0">Service Name:</span>
                            <div className="flex items-center gap-1.5 text-right font-semibold text-white">
                              <span>{entry.service_name}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`c-svc-${entry.id}`, entry.service_name)}
                                className="text-zinc-500 hover:text-brand-teal p-0.5"
                                title="Copy"
                              >
                                {copiedId === `c-svc-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {/* Date Span */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                              <span className="text-[#8B949E] text-[10px] block uppercase font-bold">Start Date:</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono text-brand-teal font-bold">{entry.startDateStr}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(`c-sd-${entry.id}`, entry.startDateStr)}
                                  className="text-zinc-500 hover:text-brand-teal p-0.5"
                                  title="Copy"
                                >
                                  {copiedId === `c-sd-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="p-2 rounded bg-black/40 border border-white/[0.04]">
                              <span className="text-[#8B949E] text-[10px] block uppercase font-bold">End Date:</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono text-brand-teal font-bold">{entry.endDateStr}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(`c-ed-${entry.id}`, entry.endDateStr)}
                                  className="text-zinc-500 hover:text-brand-teal p-0.5"
                                  title="Copy"
                                >
                                  {copiedId === `c-ed-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Base Rate */}
                          <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/[0.04]">
                            <span className="text-[#8B949E] text-[11px]">Base Rate:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                              <span>${entry.rate.toFixed(2)} / hr</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`c-rate-${entry.id}`, entry.rate.toFixed(2))}
                                className="text-zinc-500 hover:text-brand-teal p-0.5"
                                title="Copy"
                              >
                                {copiedId === `c-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          {/* Hours Breakdown Box */}
                          <div className="p-2.5 rounded bg-black/60 border border-brand-teal/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal block mb-1.5">
                              Weekly Recurring Hours to Enter:
                            </span>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              <div className="bg-white/[0.03] p-1.5 rounded">
                                <span className="text-[9px] text-[#8B949E] block uppercase">Weekday</span>
                                <span className="font-mono font-bold text-white text-xs">{entry.weekday_hours}</span>
                              </div>
                              <div className="bg-white/[0.03] p-1.5 rounded">
                                <span className="text-[9px] text-[#8B949E] block uppercase">Saturday</span>
                                <span className="font-mono font-bold text-white text-xs">{entry.saturday_hours}</span>
                              </div>
                              <div className="bg-white/[0.03] p-1.5 rounded">
                                <span className="text-[9px] text-[#8B949E] block uppercase">Sunday</span>
                                <span className="font-mono font-bold text-white text-xs">{entry.sunday_hours}</span>
                              </div>
                              <div className="bg-white/[0.03] p-1.5 rounded">
                                <span className="text-[9px] text-[#8B949E] block uppercase">Pub Hol</span>
                                <span className="font-mono font-bold text-white text-xs">{entry.publicholiday_hours}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Summary */}
                      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#8B949E]">
                        <span>Weekly Total: <strong className="text-white">{entry.total_hours_per_week} hrs/wk</strong></span>
                        <span>Estimated Value: <strong className="text-brand-teal">${entry.total_quarter_cost.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
