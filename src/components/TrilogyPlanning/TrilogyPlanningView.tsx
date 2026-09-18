import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, BookOpen, CheckCircle2, Calendar, ArrowRight, Layers, FileText, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Sparkles, SlidersHorizontal, Info, Filter } from 'lucide-react';
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

// Calculate the Monday date string (yyyy-MM-dd) for any given date
const getMondayDateStr = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return format(monday, 'yyyy-MM-dd');
};

// Calculate the Sunday date string (yyyy-MM-dd) for any given date
const getSundayDateStr = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const diff = d.getUTCDate() + (day === 0 ? 0 : 7 - day);
  const sunday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return format(sunday, 'yyyy-MM-dd');
};

// Determines if two blocks represent consecutive calendar weeks
const areConsecutiveWeeks = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  if (b1.start_date && b2.start_date) {
    const mon1 = new Date(getMondayDateStr(b1.start_date) + 'T12:00:00Z').getTime();
    const mon2 = new Date(getMondayDateStr(b2.start_date) + 'T12:00:00Z').getTime();
    const diffDays = Math.round((mon2 - mon1) / (1000 * 60 * 60 * 24));
    return diffDays === 7;
  }
  if (b1.week_of_month != null && b2.week_of_month != null) {
    return Number(b2.week_of_month) - Number(b1.week_of_month) === 1;
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

export interface TrilogyPortalPlannedService {
  id: string;
  service_name: string;
  type: 'consecutive' | 'standalone';
  typeLabel: string;
  week_count: number;
  startDateShifts: string;       // yyyy-MM-dd (earliest shift date)
  endDateShifts: string;         // yyyy-MM-dd (latest shift date)
  startDateWeek: string;         // yyyy-MM-dd (Monday of first week)
  endDateWeek: string;           // yyyy-MM-dd (Sunday of last week)
  rate: number;
  weekday_hours: number;         // weekly hours to enter into Trilogy
  saturday_hours: number;        // weekly hours to enter into Trilogy
  sunday_hours: number;          // weekly hours to enter into Trilogy
  publicholiday_hours: number;   // weekly hours to enter into Trilogy
  weekly_hours: number;          // sum of weekly hours
  total_hours: number;           // week_count * weekly_hours
  total_cost: number;            // total_hours * rate
  monthLabel?: string;
}

// Generate exact planned services for Trilogy portal:
// Sequences of consecutive matching weeks are combined into exact multi-week spans,
// while individual/varying weeks are maintained as standalone 1-week planned services.
// Every scheduled shift fits between a start date and end date with zero bulk-add distortions.
const getTrilogyAccuratePlannedServices = (monthResults: any[]): TrilogyPortalPlannedService[] => {
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

  const allEntries: TrilogyPortalPlannedService[] = [];
  const sortedServiceNames = Array.from(serviceMap.keys()).sort();

  for (const serviceName of sortedServiceNames) {
    const blocks = serviceMap.get(serviceName) || [];
    if (blocks.length === 0) continue;

    // Sort chronologically by start_date
    blocks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    let i = 0;
    while (i < blocks.length) {
      const cur = blocks[i];
      const seq = [cur];
      let j = i + 1;

      while (j < blocks.length) {
        const prev = seq[seq.length - 1];
        const candidate = blocks[j];

        const isMatch =
          areConsecutiveWeeks(prev, candidate) &&
          Math.abs(Number(prev.rate || 0) - Number(candidate.rate || 0)) < 0.001 &&
          isBlockHoursEqual(prev, candidate);

        if (isMatch) {
          seq.push(candidate);
          j++;
        } else {
          break;
        }
      }

      if (seq.length >= 2) {
        // Multi-week consecutive span of identical hours and rate
        const first = seq[0];
        const last = seq[seq.length - 1];
        const wHrs = Number(first.weekday_hours || 0);
        const satHrs = Number(first.saturday_hours || 0);
        const sunHrs = Number(first.sunday_hours || 0);
        const phHrs = Number(first.publicholiday_hours || 0);
        const weeklyHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));
        const totalHrs = Number((weeklyHrs * seq.length).toFixed(2));
        const rate = Number(first.rate || 0);

        allEntries.push({
          id: `consec-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${first.start_date}-${seq.length}`,
          service_name: serviceName,
          type: 'consecutive',
          typeLabel: `${seq.length} Weeks (Consecutive)`,
          week_count: seq.length,
          startDateShifts: first.start_date,
          endDateShifts: last.end_date,
          startDateWeek: getMondayDateStr(first.start_date),
          endDateWeek: getSundayDateStr(last.end_date),
          rate,
          weekday_hours: wHrs,
          saturday_hours: satHrs,
          sunday_hours: sunHrs,
          publicholiday_hours: phHrs,
          weekly_hours: weeklyHrs,
          total_hours: totalHrs,
          total_cost: Number((totalHrs * rate).toFixed(2)),
          monthLabel: first.month
        });
        i = j;
      } else {
        // Standalone 1-week planned service
        const b = cur;
        const wHrs = Number(b.weekday_hours || 0);
        const satHrs = Number(b.saturday_hours || 0);
        const sunHrs = Number(b.sunday_hours || 0);
        const phHrs = Number(b.publicholiday_hours || 0);
        const weeklyHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));
        const rate = Number(b.rate || 0);

        allEntries.push({
          id: `standalone-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${b.start_date}`,
          service_name: serviceName,
          type: 'standalone',
          typeLabel: '1 Week (Standalone)',
          week_count: 1,
          startDateShifts: b.start_date,
          endDateShifts: b.end_date,
          startDateWeek: getMondayDateStr(b.start_date),
          endDateWeek: getSundayDateStr(b.end_date),
          rate,
          weekday_hours: wHrs,
          saturday_hours: satHrs,
          sunday_hours: sunHrs,
          publicholiday_hours: phHrs,
          weekly_hours: weeklyHrs,
          total_hours: weeklyHrs,
          total_cost: Number((weeklyHrs * rate).toFixed(2)),
          monthLabel: b.month
        });
        i++;
      }
    }
  }

  // Sort entries chronologically by startDateShifts
  allEntries.sort((a, b) => {
    const tA = new Date(a.startDateShifts).getTime();
    const tB = new Date(b.startDateShifts).getTime();
    if (tA !== tB) return tA - tB;
    return a.service_name.localeCompare(b.service_name);
  });

  return allEntries;
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
  const [dateSpanMode, setDateSpanMode] = useState<'shifts' | 'week'>('shifts');
  const [typeFilter, setTypeFilter] = useState<'all' | 'consecutive' | 'standalone'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

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

          {/* Planned Services to Enter into Trilogy Care Portal */}
          {(() => {
            const clientObj = clients.find(c => c.id.toString() === selectedClient);
            const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : 'the selected client';
            const currentQuarter = quarters[selectedQuarterIndex];
            const quarterLabel = currentQuarter ? currentQuarter.displayLabel : 'this budget quarter';
            const allPlannedServices = getTrilogyAccuratePlannedServices(results);

            if (allPlannedServices.length === 0) return null;

            const distinctServices = Array.from(new Set(allPlannedServices.map(s => s.service_name))).sort();

            const consecutiveCount = allPlannedServices.filter(s => s.type === 'consecutive').length;
            const standaloneCount = allPlannedServices.filter(s => s.type === 'standalone').length;

            const totalPlannedHours = allPlannedServices.reduce((acc, curr) => acc + curr.total_hours, 0);
            const totalPlannedCost = allPlannedServices.reduce((acc, curr) => acc + curr.total_cost, 0);

            // Filter according to current type and service filters
            const displayedEntries = allPlannedServices.filter(entry => {
              if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
              if (serviceFilter !== 'all' && entry.service_name !== serviceFilter) return false;
              return true;
            });

            const copyAllPlannedData = () => {
              const lines = [
                `TRILOGY CARE PLANNED SERVICES — DATA TO ENTER`,
                `Client: ${clientName}`,
                `Quarter: ${quarterLabel}`,
                `Date Mode: ${dateSpanMode === 'shifts' ? 'Actual Shift Dates' : 'Calendar Week Dates'} (dd/MM/yyyy)`,
                `Total Planned Services: ${displayedEntries.length} (${consecutiveCount} Consecutive Spans + ${standaloneCount} Standalone Weeks)`,
                `Total Scheduled Hours: ${totalPlannedHours.toFixed(2)} hrs`,
                `Total Estimated Value: $${totalPlannedCost.toFixed(2)}`,
                `--------------------------------------------------`,
                ...displayedEntries.map((e, idx) => {
                  const sDate = dateSpanMode === 'shifts'
                    ? format(new Date(e.startDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                    : format(new Date(e.startDateWeek + 'T12:00:00Z'), 'dd/MM/yyyy');
                  const eDate = dateSpanMode === 'shifts'
                    ? format(new Date(e.endDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                    : format(new Date(e.endDateWeek + 'T12:00:00Z'), 'dd/MM/yyyy');

                  return [
                    `[#${idx + 1}] ${e.service_name}`,
                    `Type: ${e.typeLabel}`,
                    `Dates: ${sDate} to ${eDate}`,
                    `Base Rate: $${e.rate.toFixed(2)} / hr`,
                    `Weekday Hours: ${e.weekday_hours} / wk`,
                    `Saturday Hours: ${e.saturday_hours} / wk`,
                    `Sunday Hours: ${e.sunday_hours} / wk`,
                    `Public Holiday Hours: ${e.publicholiday_hours} / wk`,
                    `Total Hours: ${e.total_hours} hrs (${e.week_count} wk${e.week_count > 1 ? 's' : ''} × ${e.weekly_hours} hrs/wk)`,
                    `Estimated Value: $${e.total_cost.toFixed(2)}`,
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
                        {allPlannedServices.length} {allPlannedServices.length === 1 ? 'Service' : 'Services'}
                      </span>
                    </h2>
                    <p className="text-[#8B949E] text-xs mt-1">
                      Precise planned services to enter into <span className="text-white font-semibold">{clientName}</span>'s budget for {quarterLabel}. Every scheduled shift fits between a start date and end date.
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
                        title="Span from the earliest scheduled shift date to the latest scheduled shift date in this block"
                      >
                        Actual Shift Dates
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateSpanMode('week')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          dateSpanMode === 'week'
                            ? 'bg-brand-teal text-black font-bold shadow-sm'
                            : 'text-[#8B949E] hover:text-white'
                        }`}
                        title="Span from Monday of first week to Sunday of last week"
                      >
                        Calendar Week Dates
                      </button>
                    </div>

                    {/* Copy All Data Button */}
                    <button
                      type="button"
                      onClick={copyAllPlannedData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-teal text-black text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm cursor-pointer"
                      title="Copy all planned services data formatted to clipboard"
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
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">{allPlannedServices.length} to add</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Quarter Hours</span>
                    <span className="text-base font-bold text-brand-teal font-mono mt-0.5 block">{totalPlannedHours.toFixed(2)} hrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Estimated Value</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">${totalPlannedCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Schedule Breakdown</span>
                    <span className="text-xs font-semibold text-[#E6EDF3] mt-1 block">
                      <span className="text-brand-teal font-bold">{consecutiveCount}</span> consecutive + <span className="text-zinc-300 font-bold">{standaloneCount}</span> standalone
                    </span>
                  </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111111] p-3 rounded-xl border border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#8B949E] font-medium flex items-center gap-1 mr-1">
                      <Filter className="w-3.5 h-3.5 text-brand-teal" /> Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        typeFilter === 'all'
                          ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/40'
                          : 'bg-white/[0.04] text-[#8B949E] hover:text-white border border-transparent'
                      }`}
                    >
                      All ({allPlannedServices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('consecutive')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        typeFilter === 'consecutive'
                          ? 'bg-brand-teal text-black font-bold border border-brand-teal'
                          : 'bg-white/[0.04] text-[#8B949E] hover:text-white border border-transparent'
                      }`}
                    >
                      Consecutive Spans ({consecutiveCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('standalone')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        typeFilter === 'standalone'
                          ? 'bg-white/20 text-white font-bold border border-white/30'
                          : 'bg-white/[0.04] text-[#8B949E] hover:text-white border border-transparent'
                      }`}
                    >
                      Standalone Weeks ({standaloneCount})
                    </button>
                  </div>

                  {distinctServices.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8B949E]">Service:</span>
                      <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="bg-black/60 border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-teal cursor-pointer"
                      >
                        <option value="all">All Services ({distinctServices.length})</option>
                        {distinctServices.map((svc) => (
                          <option key={svc} value={svc}>{svc}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Table View of Planned Services */}
                <div className="bg-[#151515] border border-brand-teal/30 rounded-xl overflow-hidden shadow-md">
                  <div className="px-4 py-2.5 bg-black/50 border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">
                      Planned Services List ({displayedEntries.length})
                    </span>
                    <span className="text-[11px] text-[#8B949E]">
                      Click any <Copy className="w-3 h-3 inline text-zinc-400" /> icon to copy that value for entry into Trilogy
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-black/60 text-[#8B949E] text-[10px] font-bold uppercase tracking-wider">
                          <th className="px-3 py-2.5 w-8 text-center">#</th>
                          <th className="px-3 py-2.5">Service Description</th>
                          <th className="px-3 py-2.5 text-center">Span / Type</th>
                          <th className="px-3 py-2.5">Start Date</th>
                          <th className="px-3 py-2.5">End Date</th>
                          <th className="px-3 py-2.5 text-right">Base Rate</th>
                          <th className="px-3 py-2.5 text-right">Weekday Hrs/Wk</th>
                          <th className="px-3 py-2.5 text-right">Sat Hrs/Wk</th>
                          <th className="px-3 py-2.5 text-right">Sun Hrs/Wk</th>
                          <th className="px-3 py-2.5 text-right">PH Hrs/Wk</th>
                          <th className="px-3 py-2.5 text-right">Total Hrs</th>
                          <th className="px-3 py-2.5 text-right">Est. Cost</th>
                          <th className="px-3 py-2.5 text-center w-12">Copy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-xs">
                        {displayedEntries.map((entry, idx) => {
                          const sDate = dateSpanMode === 'shifts'
                            ? format(new Date(entry.startDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                            : format(new Date(entry.startDateWeek + 'T12:00:00Z'), 'dd/MM/yyyy');
                          const eDate = dateSpanMode === 'shifts'
                            ? format(new Date(entry.endDateShifts + 'T12:00:00Z'), 'dd/MM/yyyy')
                            : format(new Date(entry.endDateWeek + 'T12:00:00Z'), 'dd/MM/yyyy');

                          const isConsecutive = entry.type === 'consecutive';

                          const rowSummaryText = [
                            `Service: ${entry.service_name}`,
                            `Type: ${entry.typeLabel}`,
                            `Dates: ${sDate} to ${eDate}`,
                            `Base Rate: $${entry.rate.toFixed(2)}/hr`,
                            `Weekday Hours: ${entry.weekday_hours}/wk`,
                            `Saturday Hours: ${entry.saturday_hours}/wk`,
                            `Sunday Hours: ${entry.sunday_hours}/wk`,
                            `Public Holiday Hours: ${entry.publicholiday_hours}/wk`,
                            `Total Hours: ${entry.total_hours} hrs`,
                            `Estimated Cost: $${entry.total_cost.toFixed(2)}`
                          ].join('\n');

                          return (
                            <tr
                              key={entry.id}
                              className={`transition-colors ${
                                isConsecutive
                                  ? 'hover:bg-brand-teal/[0.04]'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="px-3 py-3 text-center text-[#8B949E] font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Service Name */}
                              <td className="px-3 py-3 font-semibold text-white">
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
                              </td>

                              {/* Type / Span */}
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                {isConsecutive ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-teal/15 text-brand-teal text-[11px] font-semibold border border-brand-teal/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {entry.week_count} Weeks
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 text-[11px] font-medium border border-white/[0.08]">
                                    <Calendar className="w-3 h-3 text-zinc-400" />
                                    1 Week
                                  </span>
                                )}
                              </td>

                              {/* Start Date */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 font-mono font-bold text-white group">
                                  <span>{sDate}</span>
                                  <button
                                    type="button"
                                    title="Copy Start Date"
                                    onClick={() => handleCopyText(`t-sdate-${entry.id}`, sDate)}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sdate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* End Date */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 font-mono font-bold text-white group">
                                  <span>{eDate}</span>
                                  <button
                                    type="button"
                                    title="Copy End Date"
                                    onClick={() => handleCopyText(`t-edate-${entry.id}`, eDate)}
                                    className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-edate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </td>

                              {/* Base Rate */}
                              <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 group">
                                  <span className="text-[#E6EDF3]">${entry.rate.toFixed(2)}</span>
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
                              <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 group">
                                  <span className={entry.weekday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                    {entry.weekday_hours > 0 ? `${entry.weekday_hours}` : '0'}
                                  </span>
                                  {entry.weekday_hours > 0 && (
                                    <button
                                      type="button"
                                      title="Copy Weekday Hours"
                                      onClick={() => handleCopyText(`t-wd-${entry.id}`, entry.weekday_hours.toString())}
                                      className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                    >
                                      {copiedId === `t-wd-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Saturday Hours */}
                              <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 group">
                                  <span className={entry.saturday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                    {entry.saturday_hours > 0 ? `${entry.saturday_hours}` : '0'}
                                  </span>
                                  {entry.saturday_hours > 0 && (
                                    <button
                                      type="button"
                                      title="Copy Saturday Hours"
                                      onClick={() => handleCopyText(`t-sat-${entry.id}`, entry.saturday_hours.toString())}
                                      className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                    >
                                      {copiedId === `t-sat-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Sunday Hours */}
                              <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 group">
                                  <span className={entry.sunday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                    {entry.sunday_hours > 0 ? `${entry.sunday_hours}` : '0'}
                                  </span>
                                  {entry.sunday_hours > 0 && (
                                    <button
                                      type="button"
                                      title="Copy Sunday Hours"
                                      onClick={() => handleCopyText(`t-sun-${entry.id}`, entry.sunday_hours.toString())}
                                      className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                    >
                                      {copiedId === `t-sun-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Public Holiday Hours */}
                              <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1 group">
                                  <span className={entry.publicholiday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                    {entry.publicholiday_hours > 0 ? `${entry.publicholiday_hours}` : '0'}
                                  </span>
                                  {entry.publicholiday_hours > 0 && (
                                    <button
                                      type="button"
                                      title="Copy Public Holiday Hours"
                                      onClick={() => handleCopyText(`t-ph-${entry.id}`, entry.publicholiday_hours.toString())}
                                      className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                                    >
                                      {copiedId === `t-ph-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Total Hours */}
                              <td className="px-3 py-3 text-right font-mono font-bold text-white whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                  <span>{entry.total_hours.toFixed(2)} hrs</span>
                                  {isConsecutive && (
                                    <span className="text-[10px] text-zinc-500 font-normal">
                                      {entry.week_count} wks × {entry.weekly_hours}h
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Estimated Cost */}
                              <td className="px-3 py-3 text-right font-mono font-bold text-brand-teal whitespace-nowrap">
                                ${entry.total_cost.toFixed(2)}
                              </td>

                              {/* Row Copy Button */}
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  title="Copy All Row Details"
                                  onClick={() => handleCopyText(`row-${entry.id}`, rowSummaryText)}
                                  className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  {copiedId === `row-${entry.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-brand-teal" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
