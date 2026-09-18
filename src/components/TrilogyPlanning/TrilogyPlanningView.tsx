import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  Copy, 
  Check, 
  Filter, 
  X, 
  Calculator, 
  DollarSign, 
  Clock, 
  HelpCircle, 
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

// Helper to compare weekday, Saturday, Sunday, and Public Holidays hours values
const isBlockHoursEqual = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  return (
    Math.abs(Number(b1.weekday_hours || 0) - Number(b2.weekday_hours || 0)) < 0.01 &&
    Math.abs(Number(b1.saturday_hours || 0) - Number(b2.saturday_hours || 0)) < 0.01 &&
    Math.abs(Number(b1.sunday_hours || 0) - Number(b2.sunday_hours || 0)) < 0.01 &&
    Math.abs(Number(b1.publicholiday_hours || 0) - Number(b2.publicholiday_hours || 0)) < 0.01
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

// Format a YYYY-MM-DD string to DD/MM/YYYY reliably without any timezone conversion skew
const formatDateToDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
};

// Calculate the Monday date string (yyyy-MM-dd) for any given date
const getMondayDateStr = (dateStr: string) => {
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = dt.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
};

// Calculate the Sunday date string (yyyy-MM-dd) for any given date
const getSundayDateStr = (dateStr: string) => {
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = dt.getUTCDate() + (day === 0 ? 0 : 7 - day);
  const sunday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), diff));
  return sunday.toISOString().split('T')[0];
};

// Determines if two blocks represent consecutive calendar weeks
const areConsecutiveWeeks = (b1: any, b2: any) => {
  if (!b1 || !b2) return false;
  if (b1.start_date && b2.start_date) {
    const mon1Str = getMondayDateStr(b1.start_date);
    const mon2Str = getMondayDateStr(b2.start_date);
    const p1 = mon1Str.split('-').map(Number);
    const p2 = mon2Str.split('-').map(Number);
    const diffDays = Math.round((Date.UTC(p2[0], p2[1] - 1, p2[2]) - Date.UTC(p1[0], p1[1] - 1, p1[2])) / (1000 * 60 * 60 * 24));
    return diffDays === 7;
  }
  if (b1.week_of_month != null && b2.week_of_month != null) {
    return Number(b2.week_of_month) - Number(b1.week_of_month) === 1;
  }
  return false;
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
  rate: number;                  // base / weekday rate
  weekday_rate: number;
  saturday_rate: number;
  sunday_rate: number;
  publicholiday_rate: number;
  weekday_hours: number;         // weekly hours to enter into Trilogy
  saturday_hours: number;        // weekly hours to enter into Trilogy
  sunday_hours: number;          // weekly hours to enter into Trilogy
  publicholiday_hours: number;   // weekly hours to enter into Trilogy
  weekly_hours: number;          // sum of weekly hours
  weekday_amount: number;        // weekday_hours * weekday_rate
  saturday_amount: number;       // saturday_hours * saturday_rate
  sunday_amount: number;         // sunday_hours * sunday_rate
  publicholiday_amount: number;  // publicholiday_hours * publicholiday_rate
  weekly_amount: number;         // sum of daily amounts per week
  daily_amount: number;          // weekly_amount / 7 (matching Trilogy Rate Calculator)
  total_hours: number;           // week_count * weekly_hours
  total_cost: number;            // week_count * weekly_amount
  monthLabel?: string;
}

// Generate exact planned services for Trilogy portal:
// Sequences of consecutive matching weeks are combined into exact multi-week spans,
// while individual/varying weeks are maintained as standalone 1-week planned services.
// Every scheduled shift fits between a start date and end date with zero bulk-add distortions.
export const getTrilogyAccuratePlannedServices = (monthResults: any[], quarterStartStr?: string, quarterEndStr?: string): TrilogyPortalPlannedService[] => {
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
    const rawBlocks = serviceMap.get(serviceName) || [];
    if (rawBlocks.length === 0) continue;

    // Consolidate any blocks belonging to the same calendar week (Monday to Sunday)
    // to guarantee month-transition shifts (e.g. 30 June / 1 July) form a single intact week
    const weekMap = new Map<string, any>();
    for (const block of rawBlocks) {
      const monStr = getMondayDateStr(block.start_date);
      if (!weekMap.has(monStr)) {
        weekMap.set(monStr, { ...block });
      } else {
        const existing = weekMap.get(monStr)!;
        if (block.start_date < existing.start_date) existing.start_date = block.start_date;
        if (block.end_date > existing.end_date) existing.end_date = block.end_date;
        existing.weekday_hours = Number(((existing.weekday_hours || 0) + (block.weekday_hours || 0)).toFixed(2));
        existing.saturday_hours = Number(((existing.saturday_hours || 0) + (block.saturday_hours || 0)).toFixed(2));
        existing.sunday_hours = Number(((existing.sunday_hours || 0) + (block.sunday_hours || 0)).toFixed(2));
        existing.publicholiday_hours = Number(((existing.publicholiday_hours || 0) + (block.publicholiday_hours || 0)).toFixed(2));
        existing.total_hours = Number(((existing.total_hours || 0) + (block.total_hours || 0)).toFixed(2));
        existing.weekly_amount = Number(((existing.weekly_amount || 0) + (block.weekly_amount || 0)).toFixed(2));
        existing.daily_amount = Number((existing.weekly_amount / 7).toFixed(2));
        if (block.weekday_rate && !existing.weekday_rate) existing.weekday_rate = block.weekday_rate;
        if (block.saturday_rate && !existing.saturday_rate) existing.saturday_rate = block.saturday_rate;
        if (block.sunday_rate && !existing.sunday_rate) existing.sunday_rate = block.sunday_rate;
        if (block.publicholiday_rate && !existing.publicholiday_rate) existing.publicholiday_rate = block.publicholiday_rate;
      }
    }
    const blocks = Array.from(weekMap.values());

    // Sort chronologically by start_date
    blocks.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    // 1. Group blocks into contiguous runs of consecutive calendar weeks with matching rates
    const runs: any[][] = [];
    let currentRun: any[] = [];

    for (const b of blocks) {
      if (currentRun.length === 0) {
        currentRun.push(b);
      } else {
        const prev = currentRun[currentRun.length - 1];
        const prevWdRate = Number(prev.weekday_rate ?? prev.rate ?? 0);
        const candWdRate = Number(b.weekday_rate ?? b.rate ?? 0);
        const prevSatRate = Number(prev.saturday_rate ?? prev.rate ?? 0);
        const candSatRate = Number(b.saturday_rate ?? b.rate ?? 0);
        const prevSunRate = Number(prev.sunday_rate ?? prev.rate ?? 0);
        const candSunRate = Number(b.sunday_rate ?? b.rate ?? 0);
        const prevPhRate = Number(prev.publicholiday_rate ?? prev.rate ?? 0);
        const candPhRate = Number(b.publicholiday_rate ?? b.rate ?? 0);

        const isConsecutive = areConsecutiveWeeks(prev, b);
        const ratesMatch =
          Math.abs(prevWdRate - candWdRate) < 0.01 &&
          Math.abs(prevSatRate - candSatRate) < 0.01 &&
          Math.abs(prevSunRate - candSunRate) < 0.01 &&
          Math.abs(prevPhRate - candPhRate) < 0.01;

        if (isConsecutive && ratesMatch) {
          currentRun.push(b);
        } else {
          runs.push(currentRun);
          currentRun = [b];
        }
      }
    }
    if (currentRun.length > 0) {
      runs.push(currentRun);
    }

    // 2. Process each consecutive run into planned service entries (consecutive or standalone)
    for (const run of runs) {
      if (run.length === 0) continue;

      const first = run[0];
      const wdRate = Number(first.weekday_rate ?? first.rate ?? 0);
      const satRate = Number(first.saturday_rate ?? first.rate ?? 0);
      const sunRate = Number(first.sunday_rate ?? first.rate ?? 0);
      const phRate = Number(first.publicholiday_rate ?? first.rate ?? 0);

      if (run.length === 1) {
        // Standalone 1-week planned service
        const b = run[0];
        const wHrs = Number(b.weekday_hours || 0);
        const satHrs = Number(b.saturday_hours || 0);
        const sunHrs = Number(b.sunday_hours || 0);
        const phHrs = Number(b.publicholiday_hours || 0);
        const weeklyHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));

        const wdAmount = Number((wHrs * wdRate).toFixed(2));
        const satAmount = Number((satHrs * satRate).toFixed(2));
        const sunAmount = Number((sunHrs * sunRate).toFixed(2));
        const phAmount = Number((phHrs * phRate).toFixed(2));
        const weeklyAmount = Number((wdAmount + satAmount + sunAmount + phAmount).toFixed(2));
        const dailyAmount = Number((weeklyAmount / 7).toFixed(2));

        allEntries.push({
          id: `standalone-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${b.start_date}`,
          service_name: serviceName,
          type: 'standalone',
          typeLabel: '1 Week (Standalone)',
          week_count: 1,
          startDateShifts: b.start_date,
          endDateShifts: b.end_date,
          startDateWeek: (quarterStartStr && getMondayDateStr(b.start_date) < quarterStartStr) ? quarterStartStr : getMondayDateStr(b.start_date),
          endDateWeek: (quarterEndStr && getSundayDateStr(b.end_date) > quarterEndStr) ? quarterEndStr : getSundayDateStr(b.end_date),
          rate: wdRate,
          weekday_rate: wdRate,
          saturday_rate: satRate,
          sunday_rate: sunRate,
          publicholiday_rate: phRate,
          weekday_hours: wHrs,
          saturday_hours: satHrs,
          sunday_hours: sunHrs,
          publicholiday_hours: phHrs,
          weekly_hours: weeklyHrs,
          weekday_amount: wdAmount,
          saturday_amount: satAmount,
          sunday_amount: sunAmount,
          publicholiday_amount: phAmount,
          weekly_amount: weeklyAmount,
          daily_amount: dailyAmount,
          total_hours: Number((b.total_hours ?? weeklyHrs).toFixed(2)),
          total_cost: Number((b.weekly_amount ?? weeklyAmount).toFixed(2)),
          monthLabel: b.month
        });
        continue;
      }

      // Multi-week run: determine candidate patterns
      const patternCounts = new Map<string, { count: number; pat: any; totalHrs: number }>();
      for (const w of run) {
        const wd = Number(w.weekday_hours || 0);
        const sat = Number(w.saturday_hours || 0);
        const sun = Number(w.sunday_hours || 0);
        const ph = Number(w.publicholiday_hours || 0);
        const key = `${wd}|${sat}|${sun}|${ph}`;
        const cur = patternCounts.get(key) || {
          count: 0,
          pat: { weekday_hours: wd, saturday_hours: sat, sunday_hours: sun, publicholiday_hours: ph },
          totalHrs: wd + sat + sun + ph
        };
        cur.count++;
        patternCounts.set(key, cur);
      }

      const sortedPatterns = Array.from(patternCounts.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalHrs - a.totalHrs;
      });

      const dominant = sortedPatterns[0].pat;

      // Helper to check if week w is compatible as a partial boundary or variation of dominant pattern
      const isCompatibleWithDominant = (w: any, isStartBoundary: boolean, isEndBoundary: boolean) => {
        const wd = Number(w.weekday_hours || 0);
        const sat = Number(w.saturday_hours || 0);
        const sun = Number(w.sunday_hours || 0);
        const ph = Number(w.publicholiday_hours || 0);

        // Exact match
        if (
          Math.abs(wd - dominant.weekday_hours) < 0.01 &&
          Math.abs(sat - dominant.saturday_hours) < 0.01 &&
          Math.abs(sun - dominant.sunday_hours) < 0.01 &&
          Math.abs(ph - dominant.publicholiday_hours) < 0.01
        ) {
          return true;
        }

        // Partial start boundary week (e.g. starts Tue-Sun, or start of quarter, hours <= dominant)
        if (isStartBoundary) {
          if (
            wd <= dominant.weekday_hours + 0.01 &&
            sat <= dominant.saturday_hours + 0.01 &&
            sun <= dominant.sunday_hours + 0.01 &&
            ph <= dominant.publicholiday_hours + 0.01
          ) {
            return true;
          }
        }

        // Partial end boundary week (e.g. ends Mon-Sat, or end of quarter/active week, hours <= dominant)
        if (isEndBoundary) {
          if (
            wd <= dominant.weekday_hours + 0.01 &&
            sat <= dominant.saturday_hours + 0.01 &&
            sun <= dominant.sunday_hours + 0.01 &&
            ph <= dominant.publicholiday_hours + 0.01
          ) {
            return true;
          }
        }

        // Public holiday variation where total hours <= dominant total hours
        const totalW = wd + sat + sun + ph;
        const totalDom = dominant.weekday_hours + dominant.saturday_hours + dominant.sunday_hours + dominant.publicholiday_hours;
        if (totalW > 0 && totalW <= totalDom + 0.01) {
          return true;
        }

        return false;
      };

      let allCompatible = true;
      for (let k = 0; k < run.length; k++) {
        if (!isCompatibleWithDominant(run[k], k === 0, k === run.length - 1)) {
          allCompatible = false;
          break;
        }
      }

      if (allCompatible) {
        // Entire run forms a single continuous multi-week planned service
        const firstWeek = run[0];
        const lastWeek = run[run.length - 1];

        const wHrs = Number(dominant.weekday_hours || 0);
        const satHrs = Number(dominant.saturday_hours || 0);
        const sunHrs = Number(dominant.sunday_hours || 0);
        const phHrs = Number(dominant.publicholiday_hours || 0);
        const weeklyHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));

        const wdAmount = Number((wHrs * wdRate).toFixed(2));
        const satAmount = Number((satHrs * satRate).toFixed(2));
        const sunAmount = Number((sunHrs * sunRate).toFixed(2));
        const phAmount = Number((phHrs * phRate).toFixed(2));
        const weeklyAmount = Number((wdAmount + satAmount + sunAmount + phAmount).toFixed(2));
        const dailyAmount = Number((weeklyAmount / 7).toFixed(2));

        const totalHrs = Number(run.reduce((sum: number, b: any) => sum + Number(b.total_hours || 0), 0).toFixed(2));
        const totalCost = Number(run.reduce((sum: number, b: any) => sum + Number(b.weekly_amount || 0), 0).toFixed(2));

        allEntries.push({
          id: `consec-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${firstWeek.start_date}-${run.length}`,
          service_name: serviceName,
          type: 'consecutive',
          typeLabel: `${run.length} Consecutive Weeks`,
          week_count: run.length,
          startDateShifts: firstWeek.start_date,
          endDateShifts: lastWeek.end_date,
          startDateWeek: (quarterStartStr && getMondayDateStr(firstWeek.start_date) < quarterStartStr) ? quarterStartStr : getMondayDateStr(firstWeek.start_date),
          endDateWeek: (quarterEndStr && getSundayDateStr(lastWeek.end_date) > quarterEndStr) ? quarterEndStr : getSundayDateStr(lastWeek.end_date),
          rate: wdRate,
          weekday_rate: wdRate,
          saturday_rate: satRate,
          sunday_rate: sunRate,
          publicholiday_rate: phRate,
          weekday_hours: wHrs,
          saturday_hours: satHrs,
          sunday_hours: sunHrs,
          publicholiday_hours: phHrs,
          weekly_hours: weeklyHrs,
          weekday_amount: wdAmount,
          saturday_amount: satAmount,
          sunday_amount: sunAmount,
          publicholiday_amount: phAmount,
          weekly_amount: weeklyAmount,
          daily_amount: dailyAmount,
          total_hours: totalHrs,
          total_cost: totalCost,
          monthLabel: firstWeek.month === lastWeek.month ? firstWeek.month : `${firstWeek.month} - ${lastWeek.month}`
        });
      } else {
        // Group consecutive blocks with matching hours, then merge boundary weeks if compatible
        const segments: any[][] = [];
        let curSeg = [run[0]];
        for (let k = 1; k < run.length; k++) {
          if (isBlockHoursEqual(curSeg[curSeg.length - 1], run[k])) {
            curSeg.push(run[k]);
          } else {
            segments.push(curSeg);
            curSeg = [run[k]];
          }
        }
        if (curSeg.length > 0) segments.push(curSeg);

        // Merge single-week partial boundary segments into adjacent multi-week segments if compatible
        const finalSegments: any[][] = [];
        let sIdx = 0;
        while (sIdx < segments.length) {
          const seg = segments[sIdx];
          const nextSeg = segments[sIdx + 1];

          if (seg.length === 1 && nextSeg && nextSeg.length >= 2) {
            const nextPat = nextSeg[0];
            const w = seg[0];
            if (
              Number(w.weekday_hours || 0) <= Number(nextPat.weekday_hours || 0) + 0.01 &&
              Number(w.saturday_hours || 0) <= Number(nextPat.saturday_hours || 0) + 0.01 &&
              Number(w.sunday_hours || 0) <= Number(nextPat.sunday_hours || 0) + 0.01 &&
              Number(w.publicholiday_hours || 0) <= Number(nextPat.publicholiday_hours || 0) + 0.01
            ) {
              nextSeg.unshift(w);
              sIdx++;
              continue;
            }
          }

          if (finalSegments.length > 0 && seg.length === 1) {
            const prevSeg = finalSegments[finalSegments.length - 1];
            const prevPat = prevSeg[prevSeg.length - 1];
            const w = seg[0];
            if (
              Number(w.weekday_hours || 0) <= Number(prevPat.weekday_hours || 0) + 0.01 &&
              Number(w.saturday_hours || 0) <= Number(prevPat.saturday_hours || 0) + 0.01 &&
              Number(w.sunday_hours || 0) <= Number(prevPat.sunday_hours || 0) + 0.01 &&
              Number(w.publicholiday_hours || 0) <= Number(prevPat.publicholiday_hours || 0) + 0.01
            ) {
              prevSeg.push(w);
              sIdx++;
              continue;
            }
          }

          finalSegments.push(seg);
          sIdx++;
        }

        for (const seg of finalSegments) {
          const isConsecutive = seg.length >= 2;
          const firstWeek = seg[0];
          const lastWeek = seg[seg.length - 1];

          // Determine representative pattern for this segment
          const pCounts = new Map<string, { count: number; pat: any; totalHrs: number }>();
          for (const w of seg) {
            const wd = Number(w.weekday_hours || 0);
            const sat = Number(w.saturday_hours || 0);
            const sun = Number(w.sunday_hours || 0);
            const ph = Number(w.publicholiday_hours || 0);
            const key = `${wd}|${sat}|${sun}|${ph}`;
            const cur = pCounts.get(key) || {
              count: 0,
              pat: { weekday_hours: wd, saturday_hours: sat, sunday_hours: sun, publicholiday_hours: ph },
              totalHrs: wd + sat + sun + ph
            };
            cur.count++;
            pCounts.set(key, cur);
          }
          const sortedPats = Array.from(pCounts.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.totalHrs - a.totalHrs;
          });
          const repPat = sortedPats[0].pat;

          const wHrs = Number(repPat.weekday_hours || 0);
          const satHrs = Number(repPat.saturday_hours || 0);
          const sunHrs = Number(repPat.sunday_hours || 0);
          const phHrs = Number(repPat.publicholiday_hours || 0);
          const weeklyHrs = Number((wHrs + satHrs + sunHrs + phHrs).toFixed(2));

          const wdAmount = Number((wHrs * wdRate).toFixed(2));
          const satAmount = Number((satHrs * satRate).toFixed(2));
          const sunAmount = Number((sunHrs * sunRate).toFixed(2));
          const phAmount = Number((phHrs * phRate).toFixed(2));
          const weeklyAmount = Number((wdAmount + satAmount + sunAmount + phAmount).toFixed(2));
          const dailyAmount = Number((weeklyAmount / 7).toFixed(2));

          const totalHrs = Number(seg.reduce((sum: number, b: any) => sum + Number(b.total_hours || 0), 0).toFixed(2));
          const totalCost = Number(seg.reduce((sum: number, b: any) => sum + Number(b.weekly_amount || 0), 0).toFixed(2));

          allEntries.push({
            id: isConsecutive
              ? `consec-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${firstWeek.start_date}-${seg.length}`
              : `standalone-${serviceName.replace(/\s+/g, '-').toLowerCase()}-${firstWeek.start_date}`,
            service_name: serviceName,
            type: isConsecutive ? 'consecutive' : 'standalone',
            typeLabel: isConsecutive ? `${seg.length} Consecutive Weeks` : '1 Week (Standalone)',
            week_count: seg.length,
            startDateShifts: firstWeek.start_date,
            endDateShifts: lastWeek.end_date,
            startDateWeek: (quarterStartStr && getMondayDateStr(firstWeek.start_date) < quarterStartStr) ? quarterStartStr : getMondayDateStr(firstWeek.start_date),
            endDateWeek: (quarterEndStr && getSundayDateStr(lastWeek.end_date) > quarterEndStr) ? quarterEndStr : getSundayDateStr(lastWeek.end_date),
            rate: wdRate,
            weekday_rate: wdRate,
            saturday_rate: satRate,
            sunday_rate: sunRate,
            publicholiday_rate: phRate,
            weekday_hours: wHrs,
            saturday_hours: satHrs,
            sunday_hours: sunHrs,
            publicholiday_hours: phHrs,
            weekly_hours: weeklyHrs,
            weekday_amount: wdAmount,
            saturday_amount: satAmount,
            sunday_amount: sunAmount,
            publicholiday_amount: phAmount,
            weekly_amount: weeklyAmount,
            daily_amount: dailyAmount,
            total_hours: totalHrs,
            total_cost: totalCost,
            monthLabel: isConsecutive
              ? (firstWeek.month === lastWeek.month ? firstWeek.month : `${firstWeek.month} - ${lastWeek.month}`)
              : firstWeek.month
          });
        }
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
  const { token, settings } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(() => {
    return localStorage.getItem('trilogyPlanningSelectedClient') || '';
  });
  const [selectedQuarterIndex, setSelectedQuarterIndex] = useState<number>(1);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateSpanMode, setDateSpanMode] = useState<'shifts' | 'week'>('shifts');
  const [typeFilter, setTypeFilter] = useState<'all' | 'consecutive' | 'standalone' | 'active_week'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [calculatorModalItem, setCalculatorModalItem] = useState<TrilogyPortalPlannedService | null>(null);

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
      const hcClients = data.filter((c: any) => 
        c.funding_type === 'Home Care' || 
        c.funding_type === 'HCP' || 
        c.funding_type === 'HOME_CARE' ||
        c.funding_type === 'HomeCare'
      );
      setClients(hcClients);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Generate Quarters based on selected client and configured business timezone
  const quarters = useMemo(() => {
    const timezone = settings?.timezone || 'Australia/Perth';

    let todayStr = '';
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      todayStr = new Date().toISOString().split('T')[0];
    }
    const [currentYearStr, currentMonthStr, currentDayStr] = todayStr.split('-');
    const curYear = parseInt(currentYearStr, 10);
    const curMonth = parseInt(currentMonthStr, 10);
    const curDay = parseInt(currentDayStr, 10);

    const isPastJun30 = curMonth > 6 || (curMonth === 6 && curDay >= 30);
    const fyStartYear = isPastJun30 ? curYear : curYear - 1;

    const baseQuarters = [
      { id: 1, label: "Quarter 1", startDateStr: `${fyStartYear}-06-30`, endDateStr: `${fyStartYear}-09-30`, displayRange: `30 Jun - 30 Sep ${fyStartYear}` },
      { id: 2, label: "Quarter 2", startDateStr: `${fyStartYear}-09-30`, endDateStr: `${fyStartYear}-12-31`, displayRange: `30 Sep - 31 Dec ${fyStartYear}` },
      { id: 3, label: "Quarter 3", startDateStr: `${fyStartYear}-12-31`, endDateStr: `${fyStartYear + 1}-03-31`, displayRange: `31 Dec ${fyStartYear} - 31 Mar ${fyStartYear + 1}` },
      { id: 4, label: "Quarter 4", startDateStr: `${fyStartYear + 1}-03-31`, endDateStr: `${fyStartYear + 1}-06-30`, displayRange: `31 Mar - 30 Jun ${fyStartYear + 1}` }
    ];

    const client = clients.find(c => c.id.toString() === selectedClient);
    
    return baseQuarters.map(q => {
      let actualStartDateStr = q.startDateStr;
      if (client && client.joined_date) {
        const joinedStr = client.joined_date.split('T')[0];
        if (joinedStr >= q.startDateStr && joinedStr <= q.endDateStr) {
          actualStartDateStr = joinedStr;
        }
      }

      const isCurrent = todayStr >= q.startDateStr && todayStr <= q.endDateStr;
      
      let displayLabel = `${q.label}: ${q.displayRange}`;
      if (actualStartDateStr !== q.startDateStr) {
        displayLabel = `${q.label}: ${formatDateToDisplay(actualStartDateStr)} - ${formatDateToDisplay(q.endDateStr)}`;
      }
      
      return {
        ...q,
        actualStartDateStr,
        displayLabel,
        isCurrent
      };
    });
  }, [clients, selectedClient, settings]);

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

    const startDate = activeQuarter.actualStartDateStr;
    const endDate = activeQuarter.endDateStr;
    
    setIsLoading(true);
    try {
      const client = clients.find(c => c.id.toString() === clientId);
      const clientName = client ? `${client.first_name} ${client.last_name}` : '';
      
      const res = await fetch(`/api/reports/trilogy-summary?client_id=${clientId}&client_name=${encodeURIComponent(clientName)}&start_date=${startDate}&end_date=${endDate}&_t=${Date.now()}`, {
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

  const clientObj = clients.find(c => c.id.toString() === selectedClient);
  const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : 'Selected Client';
  const currentQuarter = quarters[selectedQuarterIndex];
  const quarterLabel = currentQuarter ? currentQuarter.displayLabel : 'Selected Quarter';

  // Compute all accurate planned services
  const allPlannedServices = useMemo(() => {
    return getTrilogyAccuratePlannedServices(results, currentQuarter?.actualStartDateStr, currentQuarter?.endDateStr);
  }, [results, currentQuarter]);

  // Current week boundaries in configured business timezone
  const currentWeekRange = useMemo(() => {
    const timezone = settings?.timezone || 'Australia/Perth';
    let todayStr = '';
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      todayStr = new Date().toISOString().split('T')[0];
    }
    const mondayStr = getMondayDateStr(todayStr);
    const sundayStr = getSundayDateStr(todayStr);
    return {
      todayStr,
      mondayStr,
      sundayStr,
      formattedMonday: formatDateToDisplay(mondayStr),
      formattedSunday: formatDateToDisplay(sundayStr)
    };
  }, [settings]);

  // Determines if a planned service falls in the current week
  const isEntryActiveThisWeek = useCallback((entry: TrilogyPortalPlannedService | null | undefined) => {
    if (!entry || !currentWeekRange.mondayStr || !currentWeekRange.sundayStr) return false;
    const sShift = entry.startDateShifts;
    const eShift = entry.endDateShifts;
    const sWeek = entry.startDateWeek;
    const eWeek = entry.endDateWeek;

    const matchShift = Boolean(sShift && eShift && sShift <= currentWeekRange.sundayStr && eShift >= currentWeekRange.mondayStr);
    const matchWeek = Boolean(sWeek && eWeek && sWeek <= currentWeekRange.sundayStr && eWeek >= currentWeekRange.mondayStr);

    return matchShift || matchWeek;
  }, [currentWeekRange]);

  const distinctServices = useMemo(() => {
    return Array.from(new Set(allPlannedServices.map(s => s.service_name))).sort();
  }, [allPlannedServices]);

  const activeThisWeekCount = useMemo(() => {
    return allPlannedServices.filter(isEntryActiveThisWeek).length;
  }, [allPlannedServices, isEntryActiveThisWeek]);

  const consecutiveCount = useMemo(() => {
    return allPlannedServices.filter(s => s.type === 'consecutive').length;
  }, [allPlannedServices]);

  const standaloneCount = useMemo(() => {
    return allPlannedServices.filter(s => s.type === 'standalone').length;
  }, [allPlannedServices]);

  const totalPlannedHours = useMemo(() => {
    return allPlannedServices.reduce((acc, curr) => acc + curr.total_hours, 0);
  }, [allPlannedServices]);

  const totalPlannedCost = useMemo(() => {
    return allPlannedServices.reduce((acc, curr) => acc + curr.total_cost, 0);
  }, [allPlannedServices]);

  // Filter planned services
  const displayedEntries = useMemo(() => {
    return allPlannedServices.filter(entry => {
      if (typeFilter === 'consecutive' && entry.type !== 'consecutive') return false;
      if (typeFilter === 'standalone' && entry.type !== 'standalone') return false;
      if (typeFilter === 'active_week' && !isEntryActiveThisWeek(entry)) return false;
      if (serviceFilter !== 'all' && entry.service_name !== serviceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = entry.service_name.toLowerCase().includes(q);
        const matchesDate = entry.startDateShifts.includes(q) || 
          entry.endDateShifts.includes(q) || 
          formatDateToDisplay(entry.startDateShifts).includes(q) || 
          formatDateToDisplay(entry.endDateShifts).includes(q);
        if (!matchesName && !matchesDate) return false;
      }
      return true;
    });
  }, [allPlannedServices, typeFilter, serviceFilter, searchQuery, isEntryActiveThisWeek]);

  const copyAllPlannedData = () => {
    const lines = [
      `TRILOGY CARE PLANNED SERVICES — FIXED DATES EXPORT`,
      `Client: ${clientName}`,
      `Quarter: ${quarterLabel}`,
      `Date Mode: ${dateSpanMode === 'shifts' ? 'Actual Shift Dates' : 'Calendar Week Dates'} (dd/MM/yyyy)`,
      `Total Planned Items: ${displayedEntries.length} (${consecutiveCount} Consecutive Spans + ${standaloneCount} Standalone Weeks)`,
      `Total Actual Hours: ${totalPlannedHours.toFixed(2)} hrs`,
      `Total Budget Impact: $${totalPlannedCost.toFixed(2)}`,
      `==================================================`,
      ...displayedEntries.map((e, idx) => {
        const sDate = dateSpanMode === 'shifts'
          ? formatDateToDisplay(e.startDateShifts)
          : formatDateToDisplay(e.startDateWeek);
        const eDate = dateSpanMode === 'shifts'
          ? formatDateToDisplay(e.endDateShifts)
          : formatDateToDisplay(e.endDateWeek);

        return [
          `[Item #${idx + 1}]`,
          `Service Name: ${e.service_name}`,
          `Plan Type: Fixed Dates`,
          `Start Date: ${sDate}`,
          `End Date: ${eDate}`,
          `Duration: ${e.typeLabel}`,
          `-- Rate Calculator Breakdown --`,
          `Weekday: $${e.weekday_rate.toFixed(2)}/hr | ${e.weekday_hours} hrs/wk | Amount: $${e.weekday_amount.toFixed(2)}`,
          `Saturday: $${e.saturday_rate.toFixed(2)}/hr | ${e.saturday_hours} hrs/wk | Amount: $${e.saturday_amount.toFixed(2)}`,
          `Sunday: $${e.sunday_rate.toFixed(2)}/hr | ${e.sunday_hours} hrs/wk | Amount: $${e.sunday_amount.toFixed(2)}`,
          `Public Holiday: $${e.publicholiday_rate.toFixed(2)}/hr | ${e.publicholiday_hours} hrs/wk | Amount: $${e.publicholiday_amount.toFixed(2)}`,
          `Weekly Total: ${e.weekly_hours} hrs/wk ($${e.weekly_amount.toFixed(2)}/wk) | Daily Rate: $${e.daily_amount.toFixed(2)}/day`,
          `Span Total: ${e.total_hours} hrs across ${e.week_count} wk(s) = $${e.total_cost.toFixed(2)}`,
          `--------------------------------------------------`
        ].join('\n');
      })
    ];
    handleCopyText('copy-all-data', lines.join('\n'));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E6EDF3] mb-1.5 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse" />
            Trilogy Planning Summary
          </h1>
          <p className="text-[#8B949E] text-xs">
            Generate fixed date planned services from actual completed & invoiced shifts to accurately program client budgets in the Trilogy portal.
          </p>
        </div>
        <button
          id="refresh-trilogy-summary-btn"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-brand-teal text-[#0D1117] hover:bg-brand-teal-hover active:scale-[0.98] transition-all text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Refresh Trilogy planning data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter Control Box: Client & Quarter */}
      <div className="bg-[#151515] border border-white/[0.08] rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">
              Home Care Client
            </label>
            <select 
              id="trilogy-client-select"
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.2]"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">
              Budget Quarter
            </label>
            <select 
              id="trilogy-quarter-select"
              value={selectedQuarterIndex} 
              onChange={e => setSelectedQuarterIndex(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/[0.1] rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.2]"
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

      {/* Main Content Area */}
      {selectedClient ? (
        isLoading ? (
          <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-12 text-center shadow-sm">
            <RefreshCw className="w-6 h-6 text-brand-teal animate-spin mx-auto mb-3" />
            <p className="text-white text-sm font-semibold">Analyzing completed and invoiced shifts for {clientName}...</p>
            <p className="text-[#8B949E] text-xs mt-1">Calculating exact weekday, Saturday, Sunday, and public holiday rates and hours.</p>
          </div>
        ) : allPlannedServices.length > 0 ? (
          <div className="space-y-6">
            {/* Key Metrics Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#151515] border border-white/[0.08] rounded-xl p-3.5">
                <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Planned Services</span>
                <span className="text-xl font-bold text-white font-mono mt-0.5 block">
                  {allPlannedServices.length} <span className="text-xs font-normal text-zinc-400">items</span>
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {consecutiveCount} consecutive + {standaloneCount} standalone
                </span>
              </div>

              <div className="bg-[#151515] border border-brand-teal/20 rounded-xl p-3.5">
                <span className="text-[10px] text-brand-teal uppercase font-bold tracking-wider block">Actual Hours</span>
                <span className="text-xl font-bold text-brand-teal font-mono mt-0.5 block">
                  {totalPlannedHours.toFixed(2)} <span className="text-xs font-normal text-brand-teal/80">hrs</span>
                </span>
                <span className="text-[10px] text-[#8B949E] mt-1 block">Completed & invoiced</span>
              </div>

              <div className="bg-[#151515] border border-white/[0.08] rounded-xl p-3.5">
                <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Budget Value</span>
                <span className="text-xl font-bold text-white font-mono mt-0.5 block">
                  ${totalPlannedCost.toFixed(2)}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">Total funds allocated</span>
              </div>

              <div className="bg-[#151515] border border-white/[0.08] rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider block">Portal Format</span>
                  <span className="text-xs font-bold text-[#E6EDF3] mt-1 block">Fixed Dates (dd/mm/yyyy)</span>
                </div>
                <div className="text-[10px] text-brand-teal font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-brand-teal" /> Ready to enter in portal
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Type Filter, Service Filter, Date Mode, View Mode, Copy All */}
            <div className="bg-[#151515] border border-white/[0.08] rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {/* Left Side: Type Filter Pills & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex p-0.5 bg-black/60 border border-white/[0.1] rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        typeFilter === 'all'
                          ? 'bg-brand-teal text-black font-bold shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                    >
                      All ({allPlannedServices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter(typeFilter === 'active_week' ? 'all' : 'active_week')}
                      className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-2 font-bold ${
                        typeFilter === 'active_week'
                          ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/40'
                          : activeThisWeekCount > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 hover:bg-emerald-500/30'
                            : 'text-[#8B949E] hover:text-white'
                      }`}
                      title={`Filter to planned services active in the current week (${currentWeekRange.formattedMonday} - ${currentWeekRange.formattedSunday})`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activeThisWeekCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`}></span>
                      <span>Active This Week ({activeThisWeekCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('consecutive')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        typeFilter === 'consecutive'
                          ? 'bg-brand-teal text-black font-bold shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                    >
                      Consecutive Spans ({consecutiveCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('standalone')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        typeFilter === 'standalone'
                          ? 'bg-brand-teal text-black font-bold shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                    >
                      Standalone Weeks ({standaloneCount})
                    </button>
                  </div>

                  {distinctServices.length > 1 && (
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="bg-black/60 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-teal cursor-pointer"
                    >
                      <option value="all">All Services ({distinctServices.length})</option>
                      {distinctServices.map((svc) => (
                        <option key={svc} value={svc}>{svc}</option>
                      ))}
                    </select>
                  )}

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search services or dates..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-black/60 border border-white/[0.1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal w-44 sm:w-56"
                    />
                  </div>
                </div>

                {/* Right Side: Date Span Toggle, View Toggle & Master Copy */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Date Mode Toggle */}
                  <div className="inline-flex p-0.5 bg-black/60 border border-white/[0.1] rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDateSpanMode('shifts')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        dateSpanMode === 'shifts'
                          ? 'bg-brand-teal text-black font-bold shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                      title="Span from the earliest scheduled shift date to latest scheduled shift date"
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

                  {/* View Mode Toggle */}
                  <div className="inline-flex p-0.5 bg-black/60 border border-white/[0.1] rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        viewMode === 'cards'
                          ? 'bg-brand-teal text-black shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                      title="Trilogy Portal Cards view (matches Screenshots 2 & 3)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-brand-teal text-black shadow-sm'
                          : 'text-[#8B949E] hover:text-white'
                      }`}
                      title="Data Grid Table view"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Master Copy Button */}
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
            </div>

            {/* List of Planned Services */}
            {displayedEntries.length === 0 ? (
              <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-8 text-center shadow-sm">
                <p className="text-[#8B949E] text-xs font-semibold">
                  No services match the current filter or search criteria.
                </p>
              </div>
            ) : viewMode === 'cards' ? (
              /* CARD VIEW: Tailored to mirror Trilogy portal Screenshot 2 & 3 */
              <div className="space-y-4">
                {displayedEntries.map((entry, idx) => {
                  const sDate = dateSpanMode === 'shifts'
                    ? formatDateToDisplay(entry.startDateShifts)
                    : formatDateToDisplay(entry.startDateWeek);
                  const eDate = dateSpanMode === 'shifts'
                    ? formatDateToDisplay(entry.endDateShifts)
                    : formatDateToDisplay(entry.endDateWeek);

                  const isConsecutive = entry.type === 'consecutive';
                  const isActive = isEntryActiveThisWeek(entry);

                  const rowSummaryText = [
                    `Service: ${entry.service_name}`,
                    `Plan Type: Fixed Dates`,
                    `Start Date: ${sDate}`,
                    `End Date: ${eDate}`,
                    `Duration: ${entry.typeLabel}`,
                    `Weekday: $${entry.weekday_rate.toFixed(2)}/hr | ${entry.weekday_hours} hrs/wk | Amount: $${entry.weekday_amount.toFixed(2)}`,
                    `Saturday: $${entry.saturday_rate.toFixed(2)}/hr | ${entry.saturday_hours} hrs/wk | Amount: $${entry.saturday_amount.toFixed(2)}`,
                    `Sunday: $${entry.sunday_rate.toFixed(2)}/hr | ${entry.sunday_hours} hrs/wk | Amount: $${entry.sunday_amount.toFixed(2)}`,
                    `Public Holiday: $${entry.publicholiday_rate.toFixed(2)}/hr | ${entry.publicholiday_hours} hrs/wk | Amount: $${entry.publicholiday_amount.toFixed(2)}`,
                    `Weekly Total: ${entry.weekly_hours} hrs/wk ($${entry.weekly_amount.toFixed(2)}/wk)`,
                    `Span Total: ${entry.total_hours} hrs ($${entry.total_cost.toFixed(2)})`
                  ].join('\n');

                  return (
                    <div 
                      key={entry.id}
                      className={`rounded-xl overflow-hidden transition-all relative ${
                        isActive
                          ? 'bg-[#0b1b13] border-2 border-emerald-400 border-l-[8px] border-l-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/60'
                          : isConsecutive 
                            ? 'bg-[#151515] border border-brand-teal/30 hover:border-brand-teal/50 shadow-sm' 
                            : 'bg-[#151515] border border-white/[0.08] hover:border-white/[0.15] shadow-sm'
                      }`}
                    >
                      {/* Active Week Banner */}
                      {isActive && (
                        <div className="bg-emerald-500 text-black px-4 py-2 flex flex-wrap items-center justify-between font-black text-xs shadow-md tracking-wider">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
                            </span>
                            <span>ACTIVE THIS WEEK — CURRENT SCHEDULED PERIOD ({currentWeekRange.formattedMonday} – {currentWeekRange.formattedSunday})</span>
                          </div>
                          <span className="bg-black text-emerald-300 text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                            Live Week
                          </span>
                        </div>
                      )}

                      {/* Card Header: Service Description & Badges */}
                      <div className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-950 via-emerald-900/60 to-black/70 border-emerald-400/50'
                          : 'bg-black/40 border-white/[0.06]'
                      }`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded ${
                            isActive
                              ? 'bg-emerald-400 text-black shadow-sm'
                              : 'bg-white/[0.06] text-[#8B949E]'
                          }`}>
                            #{idx + 1}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-black text-xs font-black shadow-md uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-black"></span>
                              Active This Week
                            </span>
                          )}
                          <h3 className={`text-sm font-bold tracking-wide flex items-center gap-1.5 group ${isActive ? 'text-emerald-100' : 'text-white'}`}>
                            <span>{entry.service_name}</span>
                            <button
                              type="button"
                              title="Copy Service Name"
                              onClick={() => handleCopyText(`c-svc-${entry.id}`, entry.service_name)}
                              className="text-zinc-500 hover:text-brand-teal opacity-60 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            >
                              {copiedId === `c-svc-${entry.id}` ? <Check className="w-3.5 h-3.5 text-brand-teal" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {isConsecutive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal text-[11px] font-bold border border-brand-teal/30">
                              <CheckCircle2 className="w-3 h-3" />
                              {entry.week_count} Consecutive Weeks
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 text-[11px] font-medium border border-white/[0.08]">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              1 Week (Standalone)
                            </span>
                          )}

                          <span className="text-xs font-mono font-bold text-brand-teal px-2 py-0.5 rounded bg-brand-teal/10 border border-brand-teal/20">
                            ${entry.total_cost.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyText(`row-card-${entry.id}`, rowSummaryText)}
                            className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy full item details to clipboard"
                          >
                            {copiedId === `row-card-${entry.id}` ? <Check className="w-3.5 h-3.5 text-brand-teal" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Card Body: Split between Fixed Dates configuration and Rate Calculator */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left Column: Fixed Dates Entry (Screenshot 2) */}
                        <div className={`lg:col-span-4 space-y-3.5 p-3.5 rounded-lg border transition-all ${
                          isActive 
                            ? 'bg-[#082216] border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50' 
                            : 'bg-black/30 border-white/[0.04]'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-300' : 'text-[#8B949E]'}`}>
                              Plan Type & Dates
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isActive && (
                                <span className="text-[10px] font-black text-black bg-emerald-400 px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                                  Current Week
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-brand-teal bg-brand-teal/10 px-1.5 py-0.5 rounded border border-brand-teal/20">
                                Fixed Dates
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Start Date */}
                            <div className={`p-2.5 rounded border transition-colors ${
                              isActive ? 'bg-[#031b11] border-2 border-emerald-400 shadow-sm' : 'bg-[#111111] border-white/[0.06]'
                            }`}>
                              <span className={`text-[9px] uppercase tracking-wider block font-black mb-1 ${
                                isActive ? 'text-emerald-300' : 'text-[#8B949E]'
                              }`}>
                                Start Date
                              </span>
                              <div className={`flex items-center justify-between font-mono font-black text-xs ${
                                isActive ? 'text-emerald-200' : 'text-white'
                              }`}>
                                <span>{sDate}</span>
                                <button
                                  type="button"
                                  title="Copy Start Date (dd/mm/yyyy)"
                                  onClick={() => handleCopyText(`c-sdate-${entry.id}`, sDate)}
                                  className={`p-0.5 cursor-pointer ${isActive ? 'text-emerald-300 hover:text-white' : 'text-zinc-500 hover:text-brand-teal'}`}
                                >
                                  {copiedId === `c-sdate-${entry.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {/* End Date */}
                            <div className={`p-2.5 rounded border transition-colors ${
                              isActive ? 'bg-[#031b11] border-2 border-emerald-400 shadow-sm' : 'bg-[#111111] border-white/[0.06]'
                            }`}>
                              <span className={`text-[9px] uppercase tracking-wider block font-black mb-1 ${
                                isActive ? 'text-emerald-300' : 'text-[#8B949E]'
                              }`}>
                                End Date
                              </span>
                              <div className={`flex items-center justify-between font-mono font-black text-xs ${
                                isActive ? 'text-emerald-200' : 'text-white'
                              }`}>
                                <span>{eDate}</span>
                                <button
                                  type="button"
                                  title="Copy End Date (dd/mm/yyyy)"
                                  onClick={() => handleCopyText(`c-edate-${entry.id}`, eDate)}
                                  className={`p-0.5 cursor-pointer ${isActive ? 'text-emerald-300 hover:text-white' : 'text-zinc-500 hover:text-brand-teal'}`}
                                >
                                  {copiedId === `c-edate-${entry.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/[0.04] space-y-1 text-xs">
                            <div className="flex justify-between text-zinc-400">
                              <span>Duration:</span>
                              <span className="font-semibold text-white">{entry.week_count} {entry.week_count === 1 ? 'Week' : 'Weeks'}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Total Scheduled Hours:</span>
                              <span className="font-semibold text-brand-teal font-mono">{entry.total_hours.toFixed(2)} hrs</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Total Budget Amount:</span>
                              <span className="font-bold text-white font-mono">${entry.total_cost.toFixed(2)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setCalculatorModalItem(entry)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.1] transition-all cursor-pointer"
                          >
                            <Calculator className="w-3.5 h-3.5 text-brand-teal" />
                            <span>Open Rate Calculator View</span>
                          </button>
                        </div>

                        {/* Right Column: Trilogy Rate Calculator (Screenshot 3) */}
                        <div className="lg:col-span-8 bg-black/40 p-3.5 rounded-lg border border-white/[0.04] flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider flex items-center gap-1">
                                <Calculator className="w-3 h-3 text-brand-teal" />
                                Trilogy Rate Calculator
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Frequency: Weekly
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-white/[0.08] text-[9px] uppercase tracking-wider text-[#8B949E] font-bold">
                                    <th className="py-1.5 pr-2">Service day</th>
                                    <th className="py-1.5 px-2 text-right">$ Rate</th>
                                    <th className="py-1.5 px-2 text-right">Hours or units</th>
                                    <th className="py-1.5 px-2 text-right">Amount</th>
                                    <th className="py-1.5 px-2 text-center">Frequency</th>
                                    <th className="py-1.5 pl-2 text-right">$ Daily</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04] font-mono">
                                  {/* Weekday Row */}
                                  <tr className={entry.weekday_hours > 0 ? 'bg-brand-teal/[0.03]' : ''}>
                                    <td className="py-2 pr-2 font-sans font-medium text-white">Weekday</td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className="text-[#E6EDF3]">${entry.weekday_rate.toFixed(2)}</span>
                                        <button
                                          type="button"
                                          title="Copy Weekday Rate"
                                          onClick={() => handleCopyText(`c-wd-rate-${entry.id}`, entry.weekday_rate.toFixed(2))}
                                          className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                        >
                                          {copiedId === `c-wd-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className={entry.weekday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                          {entry.weekday_hours}
                                        </span>
                                        {entry.weekday_hours > 0 && (
                                          <button
                                            type="button"
                                            title="Copy Weekday Hours"
                                            onClick={() => handleCopyText(`c-wd-hrs-${entry.id}`, entry.weekday_hours.toString())}
                                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                          >
                                            {copiedId === `c-wd-hrs-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-zinc-300">
                                      ${entry.weekday_amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2 text-center text-zinc-400 font-sans text-[11px]">
                                      Weekly
                                    </td>
                                    <td className="py-2 pl-2 text-right text-zinc-400">
                                      ${(entry.weekday_amount / 7).toFixed(2)}
                                    </td>
                                  </tr>

                                  {/* Saturday Row */}
                                  <tr className={entry.saturday_hours > 0 ? 'bg-brand-teal/[0.03]' : ''}>
                                    <td className="py-2 pr-2 font-sans font-medium text-white">Saturday</td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className="text-[#E6EDF3]">${entry.saturday_rate.toFixed(2)}</span>
                                        <button
                                          type="button"
                                          title="Copy Saturday Rate"
                                          onClick={() => handleCopyText(`c-sat-rate-${entry.id}`, entry.saturday_rate.toFixed(2))}
                                          className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                        >
                                          {copiedId === `c-sat-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className={entry.saturday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                          {entry.saturday_hours}
                                        </span>
                                        {entry.saturday_hours > 0 && (
                                          <button
                                            type="button"
                                            title="Copy Saturday Hours"
                                            onClick={() => handleCopyText(`c-sat-hrs-${entry.id}`, entry.saturday_hours.toString())}
                                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                          >
                                            {copiedId === `c-sat-hrs-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-zinc-300">
                                      ${entry.saturday_amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2 text-center text-zinc-400 font-sans text-[11px]">
                                      Weekly
                                    </td>
                                    <td className="py-2 pl-2 text-right text-zinc-400">
                                      ${(entry.saturday_amount / 7).toFixed(2)}
                                    </td>
                                  </tr>

                                  {/* Sunday Row */}
                                  <tr className={entry.sunday_hours > 0 ? 'bg-brand-teal/[0.03]' : ''}>
                                    <td className="py-2 pr-2 font-sans font-medium text-white">Sunday</td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className="text-[#E6EDF3]">${entry.sunday_rate.toFixed(2)}</span>
                                        <button
                                          type="button"
                                          title="Copy Sunday Rate"
                                          onClick={() => handleCopyText(`c-sun-rate-${entry.id}`, entry.sunday_rate.toFixed(2))}
                                          className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                        >
                                          {copiedId === `c-sun-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className={entry.sunday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                          {entry.sunday_hours}
                                        </span>
                                        {entry.sunday_hours > 0 && (
                                          <button
                                            type="button"
                                            title="Copy Sunday Hours"
                                            onClick={() => handleCopyText(`c-sun-hrs-${entry.id}`, entry.sunday_hours.toString())}
                                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                          >
                                            {copiedId === `c-sun-hrs-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-zinc-300">
                                      ${entry.sunday_amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2 text-center text-zinc-400 font-sans text-[11px]">
                                      Weekly
                                    </td>
                                    <td className="py-2 pl-2 text-right text-zinc-400">
                                      ${(entry.sunday_amount / 7).toFixed(2)}
                                    </td>
                                  </tr>

                                  {/* Public Holiday Row */}
                                  <tr className={entry.publicholiday_hours > 0 ? 'bg-brand-teal/[0.03]' : ''}>
                                    <td className="py-2 pr-2 font-sans font-medium text-white">Public Holiday</td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className="text-[#E6EDF3]">${entry.publicholiday_rate.toFixed(2)}</span>
                                        <button
                                          type="button"
                                          title="Copy Public Holiday Rate"
                                          onClick={() => handleCopyText(`c-ph-rate-${entry.id}`, entry.publicholiday_rate.toFixed(2))}
                                          className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                        >
                                          {copiedId === `c-ph-rate-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="inline-flex items-center justify-end gap-1">
                                        <span className={entry.publicholiday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                          {entry.publicholiday_hours}
                                        </span>
                                        {entry.publicholiday_hours > 0 && (
                                          <button
                                            type="button"
                                            title="Copy Public Holiday Hours"
                                            onClick={() => handleCopyText(`c-ph-hrs-${entry.id}`, entry.publicholiday_hours.toString())}
                                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                          >
                                            {copiedId === `c-ph-hrs-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-right text-zinc-300">
                                      ${entry.publicholiday_amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2 text-center text-zinc-400 font-sans text-[11px]">
                                      Weekly
                                    </td>
                                    <td className="py-2 pl-2 text-right text-zinc-400">
                                      ${(entry.publicholiday_amount / 7).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Footer Totals */}
                          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-4 text-zinc-400">
                              <span>Daily: <strong className="text-white">${entry.daily_amount.toFixed(2)}</strong></span>
                              <span>Weekly: <strong className="text-white">{entry.weekly_hours} hrs</strong> (${entry.weekly_amount.toFixed(2)})</span>
                            </div>
                            <div className="text-brand-teal font-bold">
                              Span Total ({entry.week_count} wks): {entry.total_hours} hrs = ${entry.total_cost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW: Dense data grid with 1-click copy */
              <div className="bg-[#151515] border border-brand-teal/30 rounded-xl overflow-hidden shadow-md">
                <div className="px-4 py-2.5 bg-black/50 border-b border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">
                    Planned Services List ({displayedEntries.length})
                  </span>
                  <span className="text-[11px] text-[#8B949E]">
                    Click any <Copy className="w-3 h-3 inline text-zinc-400" /> icon to copy that value for entry into Trilogy portal
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
                        <th className="px-3 py-2.5 text-right">Weekday (Rate & Hrs)</th>
                        <th className="px-3 py-2.5 text-right">Saturday (Rate & Hrs)</th>
                        <th className="px-3 py-2.5 text-right">Sunday (Rate & Hrs)</th>
                        <th className="px-3 py-2.5 text-right">Pub Hol (Rate & Hrs)</th>
                        <th className="px-3 py-2.5 text-right">Weekly Amount</th>
                        <th className="px-3 py-2.5 text-right">Total Est. Cost</th>
                        <th className="px-3 py-2.5 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05] text-xs">
                      {displayedEntries.map((entry, idx) => {
                        const sDate = dateSpanMode === 'shifts'
                          ? formatDateToDisplay(entry.startDateShifts)
                          : formatDateToDisplay(entry.startDateWeek);
                        const eDate = dateSpanMode === 'shifts'
                          ? formatDateToDisplay(entry.endDateShifts)
                          : formatDateToDisplay(entry.endDateWeek);

                        const isConsecutive = entry.type === 'consecutive';
                        const isActive = isEntryActiveThisWeek(entry);

                        const rowSummaryText = [
                          `Service: ${entry.service_name}`,
                          `Plan Type: Fixed Dates`,
                          `Start Date: ${sDate}`,
                          `End Date: ${eDate}`,
                          `Duration: ${entry.typeLabel}`,
                          `Weekday: $${entry.weekday_rate.toFixed(2)}/hr | ${entry.weekday_hours} hrs/wk | Amount: $${entry.weekday_amount.toFixed(2)}`,
                          `Saturday: $${entry.saturday_rate.toFixed(2)}/hr | ${entry.saturday_hours} hrs/wk | Amount: $${entry.saturday_amount.toFixed(2)}`,
                          `Sunday: $${entry.sunday_rate.toFixed(2)}/hr | ${entry.sunday_hours} hrs/wk | Amount: $${entry.sunday_amount.toFixed(2)}`,
                          `Public Holiday: $${entry.publicholiday_rate.toFixed(2)}/hr | ${entry.publicholiday_hours} hrs/wk | Amount: $${entry.publicholiday_amount.toFixed(2)}`,
                          `Weekly Total: ${entry.weekly_hours} hrs/wk ($${entry.weekly_amount.toFixed(2)}/wk)`,
                          `Span Total: ${entry.total_hours} hrs ($${entry.total_cost.toFixed(2)})`
                        ].join('\n');

                        return (
                          <tr
                            key={entry.id}
                            className={`transition-colors ${
                              isActive
                                ? 'bg-emerald-950/60 hover:bg-emerald-950/80 border-l-[8px] border-l-emerald-400 border-b border-emerald-500/40'
                                : isConsecutive
                                  ? 'hover:bg-brand-teal/[0.04]'
                                  : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className="px-3 py-3 text-center font-mono text-[11px]">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={isActive ? 'text-emerald-300 font-bold' : 'text-[#8B949E]'}>{idx + 1}</span>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Active This Week" />
                                )}
                              </div>
                            </td>

                            {/* Service Name */}
                            <td className="px-3 py-3 font-semibold text-white">
                              <div className="flex items-center gap-2 group flex-wrap">
                                {isActive && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    Active
                                  </span>
                                )}
                                <span className={`max-w-xs truncate ${isActive ? 'text-emerald-100 font-bold' : 'text-[#E6EDF3]'}`} title={entry.service_name}>
                                  {entry.service_name}
                                </span>
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
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
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
                                {isActive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider shadow">
                                    Active Week
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Start Date */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1 font-mono font-bold group ${
                                isActive ? 'text-emerald-200 bg-[#031b11] px-2 py-1 rounded border border-emerald-400' : 'text-white'
                              }`}>
                                <span>{sDate}</span>
                                <button
                                  type="button"
                                  title="Copy Start Date"
                                  onClick={() => handleCopyText(`t-sdate-${entry.id}`, sDate)}
                                  className={`opacity-80 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer ${
                                    isActive ? 'text-emerald-300 hover:text-white' : 'text-zinc-500 hover:text-brand-teal'
                                  }`}
                                >
                                  {copiedId === `t-sdate-${entry.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* End Date */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-1 font-mono font-bold group ${
                                isActive ? 'text-emerald-200 bg-[#031b11] px-2 py-1 rounded border border-emerald-400' : 'text-white'
                              }`}>
                                <span>{eDate}</span>
                                <button
                                  type="button"
                                  title="Copy End Date"
                                  onClick={() => handleCopyText(`t-edate-${entry.id}`, eDate)}
                                  className={`opacity-80 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer ${
                                    isActive ? 'text-emerald-300 hover:text-white' : 'text-zinc-500 hover:text-brand-teal'
                                  }`}
                                >
                                  {copiedId === `t-edate-${entry.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* Weekday Rate & Hrs */}
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <span className="text-zinc-400">${entry.weekday_rate.toFixed(0)}</span>
                                <span className="text-zinc-600">×</span>
                                <span className={entry.weekday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                  {entry.weekday_hours}h
                                </span>
                                <button
                                  type="button"
                                  title="Copy Weekday Rate & Hours"
                                  onClick={() => handleCopyText(`t-wd-${entry.id}`, `${entry.weekday_rate}|${entry.weekday_hours}`)}
                                  className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                >
                                  {copiedId === `t-wd-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>

                            {/* Saturday Rate & Hrs */}
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <span className="text-zinc-400">${entry.saturday_rate.toFixed(0)}</span>
                                <span className="text-zinc-600">×</span>
                                <span className={entry.saturday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                  {entry.saturday_hours}h
                                </span>
                                {entry.saturday_hours > 0 && (
                                  <button
                                    type="button"
                                    title="Copy Saturday Rate & Hours"
                                    onClick={() => handleCopyText(`t-sat-${entry.id}`, `${entry.saturday_rate}|${entry.saturday_hours}`)}
                                    className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sat-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Sunday Rate & Hrs */}
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <span className="text-zinc-400">${entry.sunday_rate.toFixed(0)}</span>
                                <span className="text-zinc-600">×</span>
                                <span className={entry.sunday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                  {entry.sunday_hours}h
                                </span>
                                {entry.sunday_hours > 0 && (
                                  <button
                                    type="button"
                                    title="Copy Sunday Rate & Hours"
                                    onClick={() => handleCopyText(`t-sun-${entry.id}`, `${entry.sunday_rate}|${entry.sunday_hours}`)}
                                    className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-sun-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Public Holiday Rate & Hrs */}
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <span className="text-zinc-400">${entry.publicholiday_rate.toFixed(0)}</span>
                                <span className="text-zinc-600">×</span>
                                <span className={entry.publicholiday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                                  {entry.publicholiday_hours}h
                                </span>
                                {entry.publicholiday_hours > 0 && (
                                  <button
                                    type="button"
                                    title="Copy Public Holiday Rate & Hours"
                                    onClick={() => handleCopyText(`t-ph-${entry.id}`, `${entry.publicholiday_rate}|${entry.publicholiday_hours}`)}
                                    className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                                  >
                                    {copiedId === `t-ph-${entry.id}` ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Weekly Amount */}
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap text-zinc-300">
                              ${entry.weekly_amount.toFixed(2)}/wk
                            </td>

                            {/* Total Cost */}
                            <td className="px-3 py-3 text-right font-mono font-bold text-brand-teal whitespace-nowrap">
                              <div className="flex flex-col items-end">
                                <span>${entry.total_cost.toFixed(2)}</span>
                                <span className="text-[10px] text-zinc-400 font-normal">
                                  {entry.total_hours.toFixed(2)} hrs
                                </span>
                              </div>
                            </td>

                            {/* Actions: Calculator Modal & Copy Row */}
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title="Open Rate Calculator"
                                  onClick={() => setCalculatorModalItem(entry)}
                                  className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-brand-teal transition-colors cursor-pointer"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Copy All Row Details"
                                  onClick={() => handleCopyText(`t-row-${entry.id}`, rowSummaryText)}
                                  className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  {copiedId === `t-row-${entry.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-brand-teal" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-8 text-center shadow-sm">
            <p className="text-[#8B949E] text-xs font-semibold tracking-wide">
              No completed or invoiced shifts found for {clientName} in this quarter.
            </p>
            <p className="text-zinc-500 text-[11px] mt-1">
              Ensure shifts have status 'COMPLETED' (or 'CANCELLED' with an invoice generated) and the client has Home Care funding.
            </p>
          </div>
        )
      ) : (
        <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-12 text-center shadow-sm">
          <Layers className="w-8 h-8 text-brand-teal/60 mx-auto mb-3" />
          <h3 className="text-white text-sm font-semibold mb-1">Select a Home Care Client</h3>
          <p className="text-[#8B949E] text-xs max-w-md mx-auto">
            Choose a client and budget quarter above to extract actual services provided and generate programmable items for the Trilogy Care portal.
          </p>
        </div>
      )}

      {/* RATE CALCULATOR DIALOG MODAL (Replicating Screenshot 3) */}
      {calculatorModalItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-white/[0.12] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Dialog Header */}
            <div className="px-5 py-3.5 bg-black/60 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-brand-teal" />
                <h3 className="text-sm font-bold text-white tracking-wide">Rate Calculator</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalculatorModalItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4">
              {/* Form details top row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/30 p-3 rounded-lg border border-white/[0.04]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8B949E] block mb-0.5">Rate source</span>
                  <span className="text-white font-medium">None</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8B949E] block mb-0.5">Service</span>
                  <span className="text-white font-medium">{calculatorModalItem.service_name}</span>
                </div>
              </div>

              {/* Service Dates banner */}
              <div className="flex items-center justify-between text-xs bg-brand-teal/[0.06] border border-brand-teal/20 px-3.5 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-brand-teal" />
                  <span className="text-zinc-300">Plan Type: <strong className="text-white">Fixed Dates</strong></span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300">Dates: <strong className="text-white font-mono">
                    {dateSpanMode === 'shifts' 
                      ? formatDateToDisplay(calculatorModalItem.startDateShifts) 
                      : formatDateToDisplay(calculatorModalItem.startDateWeek)} 
                    {' to '} 
                    {dateSpanMode === 'shifts' 
                      ? formatDateToDisplay(calculatorModalItem.endDateShifts) 
                      : formatDateToDisplay(calculatorModalItem.endDateWeek)}
                  </strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {isEntryActiveThisWeek(calculatorModalItem) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-black text-[11px] font-black uppercase tracking-wider shadow">
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                      Active This Week
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-brand-teal">
                    {calculatorModalItem.typeLabel}
                  </span>
                </div>
              </div>

              {/* Rate Calculator Table (Screenshot 3) */}
              <div className="border border-white/[0.08] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-black/50 text-[10px] uppercase tracking-wider text-[#8B949E] font-bold">
                      <th className="py-2.5 px-3">Service day</th>
                      <th className="py-2.5 px-3 text-right">$ Rate</th>
                      <th className="py-2.5 px-3 text-right">Hours or units</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Frequency</th>
                      <th className="py-2.5 px-3 text-right">$ Daily</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono">
                    {/* Weekday */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">Weekday</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-[#E6EDF3]">${calculatorModalItem.weekday_rate.toFixed(2)}</span>
                          <button
                            type="button"
                            title="Copy Weekday Rate"
                            onClick={() => handleCopyText('m-wd-rate', calculatorModalItem.weekday_rate.toFixed(2))}
                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                          >
                            {copiedId === 'm-wd-rate' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className={calculatorModalItem.weekday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                            {calculatorModalItem.weekday_hours}
                          </span>
                          {calculatorModalItem.weekday_hours > 0 && (
                            <button
                              type="button"
                              title="Copy Weekday Hours"
                              onClick={() => handleCopyText('m-wd-hrs', calculatorModalItem.weekday_hours.toString())}
                              className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                            >
                              {copiedId === 'm-wd-hrs' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        ${calculatorModalItem.weekday_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-sans">
                        Weekly
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        ${(calculatorModalItem.weekday_amount / 7).toFixed(2)}
                      </td>
                    </tr>

                    {/* Saturday */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">Saturday</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-[#E6EDF3]">${calculatorModalItem.saturday_rate.toFixed(2)}</span>
                          <button
                            type="button"
                            title="Copy Saturday Rate"
                            onClick={() => handleCopyText('m-sat-rate', calculatorModalItem.saturday_rate.toFixed(2))}
                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                          >
                            {copiedId === 'm-sat-rate' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className={calculatorModalItem.saturday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                            {calculatorModalItem.saturday_hours}
                          </span>
                          {calculatorModalItem.saturday_hours > 0 && (
                            <button
                              type="button"
                              title="Copy Saturday Hours"
                              onClick={() => handleCopyText('m-sat-hrs', calculatorModalItem.saturday_hours.toString())}
                              className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                            >
                              {copiedId === 'm-sat-hrs' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        ${calculatorModalItem.saturday_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-sans">
                        Weekly
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        ${(calculatorModalItem.saturday_amount / 7).toFixed(2)}
                      </td>
                    </tr>

                    {/* Sunday */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">Sunday</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-[#E6EDF3]">${calculatorModalItem.sunday_rate.toFixed(2)}</span>
                          <button
                            type="button"
                            title="Copy Sunday Rate"
                            onClick={() => handleCopyText('m-sun-rate', calculatorModalItem.sunday_rate.toFixed(2))}
                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                          >
                            {copiedId === 'm-sun-rate' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className={calculatorModalItem.sunday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                            {calculatorModalItem.sunday_hours}
                          </span>
                          {calculatorModalItem.sunday_hours > 0 && (
                            <button
                              type="button"
                              title="Copy Sunday Hours"
                              onClick={() => handleCopyText('m-sun-hrs', calculatorModalItem.sunday_hours.toString())}
                              className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                            >
                              {copiedId === 'm-sun-hrs' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        ${calculatorModalItem.sunday_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-sans">
                        Weekly
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        ${(calculatorModalItem.sunday_amount / 7).toFixed(2)}
                      </td>
                    </tr>

                    {/* Public Holiday */}
                    <tr className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-sans font-medium text-white">Public Holiday</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className="text-[#E6EDF3]">${calculatorModalItem.publicholiday_rate.toFixed(2)}</span>
                          <button
                            type="button"
                            title="Copy Public Holiday Rate"
                            onClick={() => handleCopyText('m-ph-rate', calculatorModalItem.publicholiday_rate.toFixed(2))}
                            className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                          >
                            {copiedId === 'm-ph-rate' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <span className={calculatorModalItem.publicholiday_hours > 0 ? 'text-brand-teal font-bold' : 'text-zinc-500'}>
                            {calculatorModalItem.publicholiday_hours}
                          </span>
                          {calculatorModalItem.publicholiday_hours > 0 && (
                            <button
                              type="button"
                              title="Copy Public Holiday Hours"
                              onClick={() => handleCopyText('m-ph-hrs', calculatorModalItem.publicholiday_hours.toString())}
                              className="text-zinc-500 hover:text-brand-teal p-0.5 cursor-pointer"
                            >
                              {copiedId === 'm-ph-hrs' ? <Check className="w-3 h-3 text-brand-teal" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">
                        ${calculatorModalItem.publicholiday_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-sans">
                        Weekly
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        ${(calculatorModalItem.publicholiday_amount / 7).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Modal Totals Summary */}
              <div className="bg-black/50 p-3.5 rounded-lg border border-white/[0.06] flex flex-wrap items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-sans">Daily Subtotal</span>
                  <span className="text-white font-bold text-sm">${calculatorModalItem.daily_amount.toFixed(2)} / day</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-sans">Weekly Subtotal</span>
                  <span className="text-white font-bold text-sm">
                    {calculatorModalItem.weekly_hours} hrs = ${calculatorModalItem.weekly_amount.toFixed(2)} / wk
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-brand-teal block text-[10px] uppercase font-sans">Total Planned Budget Impact</span>
                  <span className="text-brand-teal font-bold text-sm">
                    ${calculatorModalItem.total_cost.toFixed(2)} ({calculatorModalItem.total_hours} hrs)
                  </span>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-5 py-3 bg-black/60 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[11px] text-[#8B949E]">
                Open alongside Trilogy portal to enter rates and hours.
              </span>
              <button
                type="button"
                onClick={() => setCalculatorModalItem(null)}
                className="px-4 py-1.5 rounded-lg bg-brand-teal text-black text-xs font-bold hover:bg-brand-teal/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
