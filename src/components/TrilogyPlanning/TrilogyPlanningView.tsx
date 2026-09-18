import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, BookOpen, CheckCircle2, Calendar, ArrowRight, Layers, FileText, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Sparkles, SlidersHorizontal, Info } from 'lucide-react';
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

export interface TrilogyPlannedServiceEntry {
  id: string;
  service_name: string;
  rate: number;
  startDateShifts: string;       // yyyy-MM-dd
  endDateShifts: string;         // yyyy-MM-dd
  startDateQuarter: string;      // yyyy-MM-dd
  endDateQuarter: string;        // yyyy-MM-dd
  weekday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
  publicholiday_hours: number;
  total_hours: number;
  total_cost: number;
  shift_count: number;
  hasRateChange: boolean;
  rateTierIndex: number;
  totalRateTiers: number;
}

// Generate Trilogy planned services grouped by Service Name and spanned across dates (separated only if the rate changes)
const getTrilogyDateSpannedServices = (monthResults: any[], currentQuarter?: any): TrilogyPlannedServiceEntry[] => {
  if (!monthResults || monthResults.length === 0) return [];

  const serviceMap = new Map<string, any[]>();

  for (const monthGroup of monthResults) {
    for (const service of monthGroup.services || []) {
      const sName = service.service_name;
      if (!serviceMap.has(sName)) {
        serviceMap.set(sName, []);
      }
      for (const block of service.blocks || []) {
        if (hasAnyHours(block)) {
          serviceMap.get(sName)!.push({
            ...block,
            month: monthGroup.month
          });
        }
      }
    }
  }

  const entries: TrilogyPlannedServiceEntry[] = [];
  const sortedServiceNames = Array.from(serviceMap.keys()).sort();

  for (const serviceName of sortedServiceNames) {
    const blocks = serviceMap.get(serviceName) || [];
    if (blocks.length === 0) continue;

    // Sort blocks chronologically by start_date
    blocks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // Group blocks into continuous spans by rate
    const spans: Array<{
      rate: number;
      startDateShifts: string;
      endDateShifts: string;
      weekday_hours: number;
      saturday_hours: number;
      sunday_hours: number;
      publicholiday_hours: number;
      shift_count: number;
    }> = [];

    let cur: any = null;

    for (const b of blocks) {
      const rate = Number(b.rate || 0);
      if (!cur) {
        cur = {
          rate,
          startDateShifts: b.start_date,
          endDateShifts: b.end_date,
          weekday_hours: Number(b.weekday_hours || 0),
          saturday_hours: Number(b.saturday_hours || 0),
          sunday_hours: Number(b.sunday_hours || 0),
          publicholiday_hours: Number(b.publicholiday_hours || 0),
          shift_count: 1
        };
      } else if (Math.abs(cur.rate - rate) < 0.001) {
        // Same rate: extend span
        if (b.end_date > cur.endDateShifts) cur.endDateShifts = b.end_date;
        if (b.start_date < cur.startDateShifts) cur.startDateShifts = b.start_date;
        cur.weekday_hours += Number(b.weekday_hours || 0);
        cur.saturday_hours += Number(b.saturday_hours || 0);
        cur.sunday_hours += Number(b.sunday_hours || 0);
        cur.publicholiday_hours += Number(b.publicholiday_hours || 0);
        cur.shift_count += 1;
      } else {
        // Rate changed: push previous span and start new rate span
        spans.push(cur);
        cur = {
          rate,
          startDateShifts: b.start_date,
          endDateShifts: b.end_date,
          weekday_hours: Number(b.weekday_hours || 0),
          saturday_hours: Number(b.saturday_hours || 0),
          sunday_hours: Number(b.sunday_hours || 0),
          publicholiday_hours: Number(b.publicholiday_hours || 0),
          shift_count: 1
        };
      }
    }
    if (cur) {
      spans.push(cur);
    }

    const qStart = currentQuarter ? format(new Date(currentQuarter.actualStart), 'yyyy-MM-dd') : (spans[0]?.startDateShifts || '');
    const qEnd = currentQuarter ? format(new Date(currentQuarter.end), 'yyyy-MM-dd') : (spans[spans.length - 1]?.endDateShifts || '');

    spans.forEach((span, idx) => {
      const wHrs = Number(span.weekday_hours.toFixed(2));
      const satHrs = Number(span.saturday_hours.toFixed(2));
      const sunHrs = Number(span.sunday_hours.toFixed(2));
      const phHrs = Number(span.publicholiday_hours.toFixed(2));
      const totalHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));
      const totalCost = Number((totalHrs * span.rate).toFixed(2));

      let sDateQ = span.startDateShifts;
      let eDateQ = span.endDateShifts;
      if (spans.length === 1) {
        sDateQ = qStart;
        eDateQ = qEnd;
      } else {
        if (idx === 0) {
          sDateQ = qStart;
          eDateQ = span.endDateShifts;
        } else if (idx === spans.length - 1) {
          sDateQ = span.startDateShifts;
          eDateQ = qEnd;
        }
      }

      entries.push({
        id: `plan-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${span.rate}-${idx}`,
        service_name: serviceName,
        rate: span.rate,
        startDateShifts: span.startDateShifts,
        endDateShifts: span.endDateShifts,
        startDateQuarter: sDateQ,
        endDateQuarter: eDateQ,
        weekday_hours: wHrs,
        saturday_hours: satHrs,
        sunday_hours: sunHrs,
        publicholiday_hours: phHrs,
        total_hours: totalHrs,
        total_cost: totalCost,
        shift_count: span.shift_count,
        hasRateChange: spans.length > 1,
        rateTierIndex: idx + 1,
        totalRateTiers: spans.length
      });
    });
  }

  return entries;
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
  const [dateSpanMode, setDateSpanMode] = useState<'shifts' | 'quarter'>('shifts');
  const [showWeeklyBreakdown, setShowWeeklyBreakdown] = useState<boolean>(false);

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

          {/* Planned Services to Enter into Trilogy Care Portal (Date-Spanned by Service Name & Rate Tier) */}
          {(() => {
            const clientObj = clients.find(c => c.id.toString() === selectedClient);
            const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : 'the selected client';
            const currentQuarter = quarters[selectedQuarterIndex];
            const quarterLabel = currentQuarter ? currentQuarter.displayLabel : 'this budget quarter';
            const plannedEntries = getTrilogyDateSpannedServices(results, currentQuarter);
            const consecutiveSummaries = getQuarterConsecutiveSummaries(results);
            const nonConsecutiveBlocks = getQuarterNonConsecutiveBlocks(results);

            if (plannedEntries.length === 0) return null;

            const totalPlannedQuarterHours = plannedEntries.reduce((acc, curr) => acc + curr.total_hours, 0);
            const totalPlannedQuarterCost = plannedEntries.reduce((acc, curr) => acc + curr.total_cost, 0);
            const rateChangeServicesCount = plannedEntries.filter(e => e.hasRateChange).length;

            const copyAllPlannedData = () => {
              const lines = [
                `TRILOGY CARE PLANNED SERVICES — DATA TO ENTER`,
                `Client: ${clientName}`,
                `Quarter: ${quarterLabel}`,
                `Date Mode: ${dateSpanMode === 'shifts' ? 'Actual Shift Dates' : 'Full Quarter Dates'}`,
                `Total Planned Services to Enter: ${plannedEntries.length}`,
                `Total Planned Hours: ${totalPlannedQuarterHours.toFixed(2)} hrs`,
                `Total Estimated Value: $${totalPlannedQuarterCost.toFixed(2)}`,
                `--------------------------------------------------`,
                ...plannedEntries.map((e, idx) => {
                  const sDate = dateSpanMode === 'shifts'
                    ? format(new Date(e.startDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                    : format(new Date(e.startDateQuarter + 'T12:00:00Z'), 'dd/MM/yyyy');
                  const eDate = dateSpanMode === 'shifts'
                    ? format(new Date(e.endDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                    : format(new Date(e.endDateQuarter + 'T12:00:00Z'), 'dd/MM/yyyy');

                  return [
                    `[Planned Service #${idx + 1}] ${e.service_name}`,
                    `Dates: ${sDate} to ${eDate}`,
                    `Base Rate: $${e.rate.toFixed(2)} / hr`,
                    `Weekday Hours: ${e.weekday_hours}`,
                    `Saturday Hours: ${e.saturday_hours}`,
                    `Sunday Hours: ${e.sunday_hours}`,
                    `Public Holiday Hours: ${e.publicholiday_hours}`,
                    `Total Hours: ${e.total_hours} hrs`,
                    `Estimated Total: $${e.total_cost.toFixed(2)}`,
                    e.hasRateChange ? `Rate Tier: Tier ${e.rateTierIndex} of ${e.totalRateTiers} ($${e.rate.toFixed(2)})` : `Rate Tier: Constant rate across span`,
                    `--------------------------------------------------`
                  ].join('\n');
                })
              ];
              handleCopyText('copy-all-data', lines.join('\n'));
            };

            return (
              <div className="pt-6 border-t border-white/[0.08] space-y-5">
                {/* Header & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-teal" />
                      <span>Services to Add to Trilogy Care Coordinator Portal</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/30">
                        {plannedEntries.length} {plannedEntries.length === 1 ? 'Service' : 'Services'}
                      </span>
                    </h2>
                    <p className="text-[#8B949E] text-xs mt-1">
                      Data to enter into <span className="text-white font-semibold">{clientName}</span>'s budget for {quarterLabel}. Services span continuous dates and only split if the rate changes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Span Toggle */}
                    <div className="inline-flex p-0.5 bg-black/60 border border-white/[0.1] rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setDateSpanMode('shifts')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          dateSpanMode === 'shifts'
                            ? 'bg-brand-teal text-black font-bold shadow-sm'
                            : 'text-[#8B949E] hover:text-white'
                        }`}
                        title="Span from the earliest scheduled shift date to the latest scheduled shift date"
                      >
                        Actual Shift Dates
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateSpanMode('quarter')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          dateSpanMode === 'quarter'
                            ? 'bg-brand-teal text-black font-bold shadow-sm'
                            : 'text-[#8B949E] hover:text-white'
                        }`}
                        title="Align date span to the client's budget quarter start and end dates"
                      >
                        Full Quarter Dates
                      </button>
                    </div>

                    {/* Copy All Data Button */}
                    <button
                      type="button"
                      onClick={copyAllPlannedData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-teal text-black text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm cursor-pointer"
                      title="Copy all planned services data to clipboard"
                    >
                      {copiedId === 'copy-all-data' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-black" />
                          <span>Copied All!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-black" />
                          <span>Copy All Services</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Key Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#151515] border border-brand-teal/20 rounded-xl p-3.5">
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Total Services</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">{plannedEntries.length} to add</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Quarter Hours</span>
                    <span className="text-base font-bold text-brand-teal font-mono mt-0.5 block">{totalPlannedQuarterHours.toFixed(2)} hrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Estimated Value</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">${totalPlannedQuarterCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Rate Structure</span>
                    <span className="text-xs font-semibold text-[#E6EDF3] mt-1 block">
                      {rateChangeServicesCount > 0 ? (
                        <span className="text-amber-400 font-bold">Includes rate changes</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Constant rates across quarter</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Table View of Date-Spanned Planned Services */}
                <div className="bg-[#151515] border border-brand-teal/30 rounded-xl overflow-hidden shadow-md">
                  <div className="px-4 py-2.5 bg-black/50 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">
                      Planned Services List ({plannedEntries.length})
                    </span>
                    <span className="text-[11px] text-[#8B949E]">
                      Click any <Copy className="w-3 h-3 inline text-zinc-400" /> icon to copy that value for entry into Trilogy
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
                          <th className="px-3.5 py-2.5 text-right">Total Hrs</th>
                          <th className="px-3.5 py-2.5 text-right">Est. Cost</th>
                          <th className="px-3.5 py-2.5 text-center">Rate Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-xs">
                        {plannedEntries.map((entry, idx) => {
                          const sDate = dateSpanMode === 'shifts'
                            ? format(new Date(entry.startDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                            : format(new Date(entry.startDateQuarter + 'T12:00:00Z'), 'dd/MM/yyyy');
                          const eDate = dateSpanMode === 'shifts'
                            ? format(new Date(entry.endDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                            : format(new Date(entry.endDateQuarter + 'T12:00:00Z'), 'dd/MM/yyyy');

                          return (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-3.5 py-3 text-center text-[#8B949E] font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Service Name */}
                              <td className="px-3.5 py-3 font-semibold text-white">
                                <div className="flex items-center gap-1.5 group">
                                  <span className="text-[#E6EDF3]">{entry.service_name}</span>
                                  <button
                                    type="button"
                                    title="Copy Service Name"
                                    onClick={() => handleCopyText(`t-svc-${entry.id}`, entry.service_name)}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-svc-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                {entry.hasRateChange && (
                                  <span className="text-[10px] text-amber-400 font-normal block mt-0.5">
                                    Rate Tier {entry.rateTierIndex} of {entry.totalRateTiers}
                                  </span>
                                )}
                              </td>

                              {/* Start Date */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 group">
                                  <span className="font-mono text-brand-teal font-semibold">{sDate}</span>
                                  <button
                                    type="button"
                                    title="Copy Start Date"
                                    onClick={() => handleCopyText(`t-sd-${entry.id}`, sDate)}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sd-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* End Date */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 group">
                                  <span className="font-mono text-brand-teal font-semibold">{eDate}</span>
                                  <button
                                    type="button"
                                    title="Copy End Date"
                                    onClick={() => handleCopyText(`t-ed-${entry.id}`, eDate)}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-ed-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* Base Rate */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 group">
                                  <span className="text-[#E6EDF3] font-mono font-semibold">${entry.rate.toFixed(2)}</span>
                                  <button
                                    type="button"
                                    title="Copy Base Rate"
                                    onClick={() => handleCopyText(`t-rate-${entry.id}`, entry.rate.toFixed(2))}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* Weekday Hours */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 group">
                                  <span className={`font-mono font-bold ${entry.weekday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                    {entry.weekday_hours > 0 ? entry.weekday_hours : '0'}
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy Weekday Hours"
                                    onClick={() => handleCopyText(`t-wd-${entry.id}`, entry.weekday_hours.toString())}
                                    className="text-zinc-600 hover:text-brand-teal opacity-40 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-wd-${entry.id}` ? <Check className="w-2.5 h-2.5 text-brand-teal" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Saturday Hours */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 group">
                                  <span className={`font-mono font-bold ${entry.saturday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                    {entry.saturday_hours > 0 ? entry.saturday_hours : '0'}
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy Saturday Hours"
                                    onClick={() => handleCopyText(`t-sat-${entry.id}`, entry.saturday_hours.toString())}
                                    className="text-zinc-600 hover:text-brand-teal opacity-40 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sat-${entry.id}` ? <Check className="w-2.5 h-2.5 text-brand-teal" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Sunday Hours */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 group">
                                  <span className={`font-mono font-bold ${entry.sunday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                    {entry.sunday_hours > 0 ? entry.sunday_hours : '0'}
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy Sunday Hours"
                                    onClick={() => handleCopyText(`t-sun-${entry.id}`, entry.sunday_hours.toString())}
                                    className="text-zinc-600 hover:text-brand-teal opacity-40 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sun-${entry.id}` ? <Check className="w-2.5 h-2.5 text-brand-teal" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Public Holiday Hours */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 group">
                                  <span className={`font-mono font-bold ${entry.publicholiday_hours > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                    {entry.publicholiday_hours > 0 ? entry.publicholiday_hours : '0'}
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy Public Holiday Hours"
                                    onClick={() => handleCopyText(`t-ph-${entry.id}`, entry.publicholiday_hours.toString())}
                                    className="text-zinc-600 hover:text-brand-teal opacity-40 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-ph-${entry.id}` ? <Check className="w-2.5 h-2.5 text-brand-teal" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Total Hours */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <span className="font-mono font-bold text-brand-teal">
                                  {entry.total_hours} hrs
                                </span>
                              </td>

                              {/* Est Cost */}
                              <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                <span className="font-mono font-bold text-[#E6EDF3]">
                                  ${entry.total_cost.toFixed(2)}
                                </span>
                              </td>

                              {/* Rate Status */}
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                {entry.hasRateChange ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    Rate Tier {entry.rateTierIndex} of {entry.totalRateTiers}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                    Single Rate Span
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Optional Collapsible Accordion: Weekly Consecutive & Non-Consecutive Block Breakdown */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWeeklyBreakdown(!showWeeklyBreakdown)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#151515] hover:bg-[#1c1c1c] border border-white/[0.08] rounded-xl text-xs font-semibold text-[#8B949E] hover:text-white transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-teal" />
                      <span>Optional: View Weekly Consecutive & Non-Consecutive Breakdown</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400">
                        {consecutiveSummaries.length} consecutive + {nonConsecutiveBlocks.length} standalone blocks
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="text-[11px]">{showWeeklyBreakdown ? 'Hide weekly details' : 'Show weekly details'}</span>
                      {showWeeklyBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {showWeeklyBreakdown && (
                    <div className="mt-4 space-y-6 animate-fadeIn">
                      {/* Matching Consecutive Week Blocks Summary */}
                      {consecutiveSummaries.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />
                              <span>Matching Consecutive Week Blocks Summary</span>
                            </h4>
                            <span className="text-[10px] text-[#8B949E]">
                              {consecutiveSummaries.length} sequences
                            </span>
                          </div>
                          <div className="bg-[#151515] border border-brand-teal/30 rounded-xl overflow-hidden shadow-md">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/[0.08] bg-black/40 text-[10px] font-bold text-[#8B949E] uppercase">
                                    <th className="px-4 py-2.5">Service Description</th>
                                    <th className="px-4 py-2.5">Consecutive Range</th>
                                    <th className="px-4 py-2.5 text-center">Duration</th>
                                    <th className="px-4 py-2.5 text-right">Base Rate</th>
                                    <th className="px-4 py-2.5 text-right">Weekday Hrs / Wk</th>
                                    <th className="px-4 py-2.5 text-right">Sat Hrs / Wk</th>
                                    <th className="px-4 py-2.5 text-right">Sun Hrs / Wk</th>
                                    <th className="px-4 py-2.5 text-right">PH Hrs / Wk</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05] text-xs">
                                  {consecutiveSummaries.map((summary, sIdx) => (
                                    <tr key={sIdx} className="hover:bg-brand-teal/[0.04] transition-colors">
                                      <td className="px-4 py-3 font-semibold text-[#E6EDF3] border-l-2 border-brand-teal pl-3.5">
                                        <div className="flex flex-col">
                                          <span>{summary.service_name}</span>
                                          {summary.month && (
                                            <span className="text-[10px] text-[#8B949E] font-normal">{summary.month}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                                        <span className="text-brand-teal font-bold font-mono">
                                          {format(new Date(summary.start_date + 'T12:00:00Z'), 'd MMM yyyy')}
                                        </span>
                                        <span className="mx-2 text-zinc-500/80 font-normal">to</span>
                                        <span className="text-brand-teal font-bold font-mono">
                                          {format(new Date(summary.end_date + 'T12:00:00Z'), 'd MMM yyyy')}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-white text-[11px] font-medium border border-white/[0.08]">
                                          {summary.week_count} consecutive weeks
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-mono text-[#8B949E] text-right whitespace-nowrap">
                                        ${summary.rate?.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-right text-brand-teal font-bold whitespace-nowrap">
                                        {summary.weekday_hours > 0 ? `${summary.weekday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-right text-brand-teal font-bold whitespace-nowrap">
                                        {summary.saturday_hours > 0 ? `${summary.saturday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-right text-brand-teal font-bold whitespace-nowrap">
                                        {summary.sunday_hours > 0 ? `${summary.sunday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-3 font-mono text-right text-brand-teal font-bold whitespace-nowrap">
                                        {summary.publicholiday_hours > 0 ? `${summary.publicholiday_hours} hrs` : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Non-Consecutive / Standalone Week Blocks Summary */}
                      {nonConsecutiveBlocks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Non-Consecutive / Standalone Week Blocks Summary</span>
                            </h4>
                            <span className="text-[10px] text-[#8B949E]">
                              {nonConsecutiveBlocks.length} blocks
                            </span>
                          </div>
                          <div className="bg-[#151515] border border-white/[0.08] rounded-xl overflow-hidden shadow-md">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-white/[0.08] bg-black/40 text-[10px] font-bold text-[#8B949E] uppercase">
                                    <th className="px-4 py-2.5">Service Description</th>
                                    <th className="px-4 py-2.5">Week</th>
                                    <th className="px-4 py-2.5">Dates</th>
                                    <th className="px-4 py-2.5 text-right">Base Rate</th>
                                    <th className="px-4 py-2.5 text-right">Weekday Hrs</th>
                                    <th className="px-4 py-2.5 text-right">Sat Hrs</th>
                                    <th className="px-4 py-2.5 text-right">Sun Hrs</th>
                                    <th className="px-4 py-2.5 text-right">PH Hrs</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05] text-xs">
                                  {nonConsecutiveBlocks.map((block, nIdx) => (
                                    <tr key={nIdx} className="hover:bg-white/[0.02] transition-colors">
                                      <td className="px-4 py-2.5 font-semibold text-[#E6EDF3]">
                                        <div className="flex flex-col">
                                          <span>{block.service_name}</span>
                                          {block.month && (
                                            <span className="text-[10px] text-[#8B949E] font-normal">{block.month}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 font-semibold text-brand-teal whitespace-nowrap">
                                        {block.week_of_month ? `Week ${block.week_of_month}` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-[#E6EDF3] whitespace-nowrap">
                                        {block.start_date ? format(new Date(block.start_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                                        <span className="mx-1.5 text-zinc-500/80 font-normal">to</span>
                                        {block.end_date ? format(new Date(block.end_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-[#8B949E] text-right whitespace-nowrap">
                                        ${block.rate?.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-right text-brand-teal whitespace-nowrap">
                                        {block.weekday_hours > 0 ? `${block.weekday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-right text-brand-teal whitespace-nowrap">
                                        {block.saturday_hours > 0 ? `${block.saturday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-right text-brand-teal whitespace-nowrap">
                                        {block.sunday_hours > 0 ? `${block.sunday_hours} hrs` : '-'}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-right text-brand-teal whitespace-nowrap">
                                        {block.publicholiday_hours > 0 ? `${block.publicholiday_hours} hrs` : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
