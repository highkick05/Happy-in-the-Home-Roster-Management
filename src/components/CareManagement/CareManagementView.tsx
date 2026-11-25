import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getFinancialYearQuarters,
  getCurrentFinancialYearAndQuarter,
  HomeCareQuarter
} from '../Directory/HomeCareBudgetView';
import {
  Landmark,
  Calendar,
  Search,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

interface QuarterHistoryItem {
  fyLabel: string;
  quarterLabel: string;
  shortLabel: string;
  displayRange: string;
  startDateStr: string;
  endDateStr: string;
  activeDays: number;
  grossSubsidy: number;
  careMgmtPooled: number;
  netClientAllocation: number;
  isCurrentQuarter: boolean;
}

export default function CareManagementView() {
  const { token, settings } = useAuth();
  const navigate = useNavigate();

  const timezone = settings?.timezone || 'Australia/Perth';
  const initialPeriod = getCurrentFinancialYearAndQuarter(timezone);

  const [selectedFyStartYear, setSelectedFyStartYear] = useState<number>(initialPeriod.currentFyStartYear);
  const [selectedQuarterId, setSelectedQuarterId] = useState<number>(initialPeriod.currentQuarterId);
  const [clients, setClients] = useState<any[]>([]);
  const [fundingRates, setFundingRates] = useState<any>({
    hcpFundingLevels: [],
    sahFundingLevels: [],
    defaultManagementFee: 10,
    defaultCareCoordinationFee: 20,
    defaultCareManagementFee: 10
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [schemeFilter, setSchemeFilter] = useState<'ALL' | 'HCP' | 'SAH'>('ALL');
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  useEffect(() => {
    if (settings?.timezone) {
      const p = getCurrentFinancialYearAndQuarter(settings.timezone);
      setSelectedFyStartYear(p.currentFyStartYear);
      setSelectedQuarterId(p.currentQuarterId);
    }
  }, [settings?.timezone]);

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [clientsRes, ratesRes] = await Promise.all([
        fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(Array.isArray(cData) ? cData : []);
      }
      if (ratesRes.ok) {
        const rData = await ratesRes.json();
        setFundingRates(rData);
      }
    } catch (e) {
      console.error('Failed to load Care Management data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const realTimePeriod = getCurrentFinancialYearAndQuarter(timezone);
  const todayStr = realTimePeriod.todayStr;

  const careManagementFeePercent =
    fundingRates?.defaultCareManagementFee !== undefined && fundingRates?.defaultCareManagementFee !== null
      ? Number(fundingRates.defaultCareManagementFee)
      : 10;

  const parseDailyRate = (item: any, fallback: number) => {
    if (!item) return fallback;
    if (item.amountAnnual !== undefined && item.amountAnnual !== null && Number(item.amountAnnual) > 0) {
      return Number(item.amountAnnual) / 365;
    }
    if (item.amount !== undefined && item.amount !== null && Number(item.amount) > 0) {
      return Number(item.amount) / 365;
    }
    if (item.amountDaily !== undefined && item.amountDaily !== null) return Number(item.amountDaily);
    if (item.amountQuarterly !== undefined && item.amountQuarterly !== null) return Number(item.amountQuarterly) / 91.25;
    return fallback;
  };

  const getClientDailyRate = (client: any): number => {
    const subType = String(client?.home_care_sub_type || 'HCP').toUpperCase();
    const levelOrClass = client?.home_care_level_or_class || (subType === 'SAH' ? 'Class 1' : 'Level 1');
    if (subType === 'SAH') {
      const levels = fundingRates?.sahFundingLevels?.length
        ? fundingRates.sahFundingLevels
        : [
            { level: 'Class 1', amountAnnual: 10731.00, amountDaily: 29.40 },
            { level: 'Class 2', amountAnnual: 16034.45, amountDaily: 43.93 },
            { level: 'Class 3', amountAnnual: 21965.70, amountDaily: 60.18 },
            { level: 'Class 4', amountAnnual: 29696.40, amountDaily: 81.36 },
            { level: 'Class 5', amountAnnual: 39697.40, amountDaily: 108.76 },
            { level: 'Class 6', amountAnnual: 48114.30, amountDaily: 131.82 },
            { level: 'Class 7', amountAnnual: 58148.15, amountDaily: 159.31 },
            { level: 'Class 8', amountAnnual: 78106.35, amountDaily: 213.99 }
          ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return parseDailyRate(match, 10731.00 / 365);
    } else {
      const levels = fundingRates?.hcpFundingLevels?.length
        ? fundingRates.hcpFundingLevels
        : [
            { level: 'Level 1', amountAnnual: 11294.22, amountDaily: 30.94 },
            { level: 'Level 2', amountAnnual: 19860.56, amountDaily: 54.41 },
            { level: 'Level 3', amountAnnual: 43233.21, amountDaily: 118.45 },
            { level: 'Level 4', amountAnnual: 65543.98, amountDaily: 179.57 }
          ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return parseDailyRate(match, 65543.98 / 365);
    }
  };

  // Filter strictly to Home Care clients
  const homeCareClients = useMemo(() => {
    return clients.filter((c) => {
      const fType = String(c.funding_type || '').toUpperCase().trim();
      const isNdis = fType === 'NDIS';
      return !isNdis && (fType === 'HOME_CARE' || fType === 'HOME CARE' || fType === 'HCP' || (!fType && Boolean(c.home_care_sub_type)));
    });
  }, [clients]);

  // Available Financial Years spanning earliest joined client through next FY
  const availableFyYears = useMemo(() => {
    let minYear = realTimePeriod.currentFyStartYear - 2;
    for (const c of homeCareClients) {
      if (c.joined_date) {
        const y = parseInt(String(c.joined_date).slice(0, 4), 10);
        if (!isNaN(y) && y - 1 < minYear) {
          minYear = y - 1;
        }
      }
    }
    const maxYear = realTimePeriod.currentFyStartYear + 1;
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [homeCareClients, realTimePeriod.currentFyStartYear]);

  const quartersForSelectedFy = useMemo(
    () => getFinancialYearQuarters(selectedFyStartYear),
    [selectedFyStartYear]
  );

  const activeQuarter: HomeCareQuarter =
    quartersForSelectedFy.find((q) => q.id === selectedQuarterId) || quartersForSelectedFy[0];

  const computeDaysInWindow = (windowStartStr: string, windowEndStr: string, joinedStr: string, defaultTotalDays?: number): number => {
    if (joinedStr > windowEndStr) return 0;
    if (joinedStr <= windowStartStr && defaultTotalDays !== undefined) {
      return defaultTotalDays;
    }
    const effStartStr = joinedStr > windowStartStr ? joinedStr : windowStartStr;
    const sDate = new Date(`${effStartStr}T00:00:00`);
    const eDate = new Date(`${windowEndStr}T23:59:59`);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) return 0;
    return Math.max(1, Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Enrich each Home Care client with Selected Quarter, Selected FY, and Cumulative Running Total Since Joined
  const clientRows = useMemo(() => {
    const currentFyQuarters = getFinancialYearQuarters(realTimePeriod.currentFyStartYear);
    const currentRealQuarter =
      currentFyQuarters.find((q) => q.id === realTimePeriod.currentQuarterId) || currentFyQuarters[0];

    return homeCareClients.map((client) => {
      const subType = String(client.home_care_sub_type || 'HCP').toUpperCase() === 'SAH' ? 'SAH' : 'HCP';
      const levelOrClass = client.home_care_level_or_class || (subType === 'SAH' ? 'Class 1' : 'Level 1');
      const dailyRate = getClientDailyRate(client);

      const rawJoined = client.joined_date ? String(client.joined_date).split('T')[0] : '';
      const hasExplicitJoinedDate = Boolean(rawJoined);
      // Fallback to current quarter start if joined_date was not populated on profile
      const effectiveJoinedStr = rawJoined || currentRealQuarter.startDateStr;

      // 1. Selected Quarter calculation
      const quarterDays = computeDaysInWindow(
        activeQuarter.startDateStr,
        activeQuarter.endDateStr,
        effectiveJoinedStr,
        activeQuarter.totalDays
      );
      const quarterGrossSubsidy = quarterDays * dailyRate;
      const quarterCareMgmtPooled = quarterGrossSubsidy * (careManagementFeePercent / 100);
      const quarterNetClientAllocation = quarterGrossSubsidy - quarterCareMgmtPooled;

      // 2. Selected Financial Year calculation (sum of Q1-Q4 in selected FY)
      let fyDays = 0;
      for (const q of quartersForSelectedFy) {
        fyDays += computeDaysInWindow(q.startDateStr, q.endDateStr, effectiveJoinedStr, q.totalDays);
      }
      const fyGrossSubsidy = fyDays * dailyRate;
      const fyCareMgmtPooled = fyGrossSubsidy * (careManagementFeePercent / 100);

      // 3. Running Total Since Joined HITH (from effectiveJoinedStr through all quarters up to and including the current active quarter)
      const [jYearStr, jMonthStr, jDayStr] = effectiveJoinedStr.split('-');
      const jYear = parseInt(jYearStr, 10) || realTimePeriod.currentFyStartYear;
      const jMonth = parseInt(jMonthStr, 10) || 7;
      const jDay = parseInt(jDayStr, 10) || 1;
      const isJoinedPastJun30 = jMonth > 6 || (jMonth === 6 && jDay >= 30);
      const startFyYear = isJoinedPastJun30 ? jYear : jYear - 1;

      const quarterHistory: QuarterHistoryItem[] = [];
      let cumulativeQuarterlyDays = 0;
      let cumulativeQuarterlyGross = 0;
      let cumulativeQuarterlyCareMgmt = 0;
      let cumulativeQuarterlyNet = 0;

      for (let fy = startFyYear; fy <= realTimePeriod.currentFyStartYear; fy++) {
        const qs = getFinancialYearQuarters(fy);
        for (const q of qs) {
          // Stop after the current real-time quarter
          if (fy === realTimePeriod.currentFyStartYear && q.id > realTimePeriod.currentQuarterId) {
            continue;
          }
          if (q.endDateStr < effectiveJoinedStr) {
            continue;
          }
          const qActiveDays = computeDaysInWindow(q.startDateStr, q.endDateStr, effectiveJoinedStr, q.totalDays);
          if (qActiveDays <= 0) continue;

          const qGross = qActiveDays * dailyRate;
          const qCareMgmt = qGross * (careManagementFeePercent / 100);
          const qNet = qGross - qCareMgmt;

          cumulativeQuarterlyDays += qActiveDays;
          cumulativeQuarterlyGross += qGross;
          cumulativeQuarterlyCareMgmt += qCareMgmt;
          cumulativeQuarterlyNet += qNet;

          quarterHistory.push({
            fyLabel: `FY ${fy}-${fy + 1}`,
            quarterLabel: q.label,
            shortLabel: q.shortLabel,
            displayRange: q.displayRange,
            startDateStr: q.startDateStr > effectiveJoinedStr ? q.startDateStr : effectiveJoinedStr,
            endDateStr: q.endDateStr,
            activeDays: qActiveDays,
            grossSubsidy: qGross,
            careMgmtPooled: qCareMgmt,
            netClientAllocation: qNet,
            isCurrentQuarter: fy === realTimePeriod.currentFyStartYear && q.id === realTimePeriod.currentQuarterId
          });
        }
      }

      // Also calculate exact accrued days to today (joined_date -> todayStr)
      const accruedDaysToToday = computeDaysInWindow(effectiveJoinedStr, todayStr, effectiveJoinedStr);
      const accruedCareMgmtToToday = accruedDaysToToday * dailyRate * (careManagementFeePercent / 100);

      return {
        client,
        clientId: client.id,
        fullName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        subType,
        levelOrClass,
        dailyRate,
        joinedDateStr: effectiveJoinedStr,
        hasExplicitJoinedDate,
        quarterDays,
        quarterGrossSubsidy,
        quarterCareMgmtPooled,
        quarterNetClientAllocation,
        fyDays,
        fyGrossSubsidy,
        fyCareMgmtPooled,
        cumulativeQuarterlyDays,
        cumulativeQuarterlyGross,
        cumulativeQuarterlyCareMgmt,
        cumulativeQuarterlyNet,
        accruedDaysToToday,
        accruedCareMgmtToToday,
        quarterHistory: quarterHistory.slice().reverse()
      };
    });
  }, [
    homeCareClients,
    fundingRates,
    careManagementFeePercent,
    activeQuarter,
    quartersForSelectedFy,
    realTimePeriod.currentFyStartYear,
    realTimePeriod.currentQuarterId,
    todayStr
  ]);

  const filteredRows = useMemo(() => {
    return clientRows.filter((row) => {
      if (schemeFilter !== 'ALL' && row.subType !== schemeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.fullName.toLowerCase().includes(q);
        const matchLevel = row.levelOrClass.toLowerCase().includes(q);
        const matchScheme = row.subType.toLowerCase().includes(q);
        if (!matchName && !matchLevel && !matchScheme) return false;
      }
      return true;
    });
  }, [clientRows, schemeFilter, searchQuery]);

  // Aggregate Summary Totals across filtered / all Home Care clients
  const summaryTotals = useMemo(() => {
    let totalCumulativeCareMgmt = 0;
    let totalCumulativeGross = 0;
    let totalAccruedToToday = 0;
    let totalQuarterCareMgmt = 0;
    let totalQuarterGross = 0;
    let totalQuarterNet = 0;
    let totalFyCareMgmt = 0;
    let totalFyGross = 0;
    let hcpCount = 0;
    let sahCount = 0;

    for (const r of filteredRows) {
      totalCumulativeCareMgmt += r.cumulativeQuarterlyCareMgmt;
      totalCumulativeGross += r.cumulativeQuarterlyGross;
      totalAccruedToToday += r.accruedCareMgmtToToday;
      totalQuarterCareMgmt += r.quarterCareMgmtPooled;
      totalQuarterGross += r.quarterGrossSubsidy;
      totalQuarterNet += r.quarterNetClientAllocation;
      totalFyCareMgmt += r.fyCareMgmtPooled;
      totalFyGross += r.fyGrossSubsidy;
      if (r.subType === 'SAH') sahCount++;
      else hcpCount++;
    }

    return {
      totalCumulativeCareMgmt,
      totalCumulativeGross,
      totalAccruedToToday,
      totalQuarterCareMgmt,
      totalQuarterGross,
      totalQuarterNet,
      totalFyCareMgmt,
      totalFyGross,
      hcpCount,
      sahCount,
      totalClients: filteredRows.length
    };
  }, [filteredRows]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val || 0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-brand-navy border border-border-subtle rounded-lg p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Landmark className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-[#E6EDF3] tracking-tight">
              Care Management Pooled Funds
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {careManagementFeePercent}% Off-Top Subsidy Deduction
            </span>
          </div>
          <p className="text-xs text-[#8B949E] max-w-3xl leading-relaxed">
            Services Australia mandatory Care Management deduction ({careManagementFeePercent}%) stripped off the top of every ongoing Home Care Package (HCP) and Support at Home (SaH) quarterly subsidy before it hits individual client Total Allocation (ON) budgets, credited to HITH&apos;s pooled Care Management account.
          </p>
        </div>

        {/* Period Selectors */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-brand-bg border border-border-subtle rounded-md px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-teal" />
            <span className="text-[11px] font-medium text-[#8B949E]">Period:</span>
            <select
              value={selectedFyStartYear}
              onChange={(e) => setSelectedFyStartYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-[#E6EDF3] focus:outline-none cursor-pointer pr-1"
            >
              {availableFyYears.map((fy) => (
                <option key={fy} value={fy} className="bg-[#121214] text-white">
                  FY {fy}–{fy + 1} {fy === realTimePeriod.currentFyStartYear ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedQuarterId}
            onChange={(e) => setSelectedQuarterId(Number(e.target.value))}
            className="bg-brand-bg border border-border-subtle rounded-md px-3 py-1.5 text-xs font-semibold text-[#E6EDF3] focus:outline-none focus:border-brand-teal cursor-pointer"
          >
            {quartersForSelectedFy.map((q) => (
              <option key={q.id} value={q.id} className="bg-[#121214] text-white">
                {q.label} ({q.displayRange})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchAllData}
            className="p-1.5 rounded-md bg-brand-bg border border-border-subtle text-zinc-400 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            title="Refresh Pooled Funds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Running Total Since Joined HITH */}
        <div className="bg-brand-navy border border-amber-500/30 rounded-lg p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">
                Running Total Pooled (Since Joined)
              </span>
              <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
            <div className="text-2xl font-bold text-amber-400 tracking-tight">
              {formatCurrency(summaryTotals.totalCumulativeCareMgmt)}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span>Accrued to Today: {formatCurrency(summaryTotals.totalAccruedToToday)}</span>
            <span className="text-amber-300/80">{careManagementFeePercent}% Pool</span>
          </div>
        </div>

        {/* Card 2: Selected Quarter Pooled Funds */}
        <div className="bg-brand-navy border border-border-subtle rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                {activeQuarter.label} Pooled Funds
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                {activeQuarter.shortLabel}
              </span>
            </div>
            <div className="text-2xl font-bold text-[#E6EDF3] tracking-tight">
              {formatCurrency(summaryTotals.totalQuarterCareMgmt)}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span>Gross: {formatCurrency(summaryTotals.totalQuarterGross)}</span>
            <span className="text-emerald-400">Net ON: {formatCurrency(summaryTotals.totalQuarterNet)}</span>
          </div>
        </div>

        {/* Card 3: Selected Financial Year Total */}
        <div className="bg-brand-navy border border-border-subtle rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                FY {selectedFyStartYear}–{selectedFyStartYear + 1} Pooled Total
              </span>
              <TrendingUp className="w-4 h-4 text-brand-teal shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#E6EDF3] tracking-tight">
              {formatCurrency(summaryTotals.totalFyCareMgmt)}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span>FY Gross Subsidy: {formatCurrency(summaryTotals.totalFyGross)}</span>
            <span>Q1–Q4</span>
          </div>
        </div>

        {/* Card 4: Active Home Care Packages */}
        <div className="bg-brand-navy border border-border-subtle rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
                Home Care Packages in Pool
              </span>
              <Users className="w-4 h-4 text-sky-400 shrink-0" />
            </div>
            <div className="text-2xl font-bold text-[#E6EDF3] tracking-tight">
              {summaryTotals.totalClients}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <span>{summaryTotals.hcpCount} HCP • {summaryTotals.sahCount} Support at Home</span>
            <span className="text-sky-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Pooled
            </span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-brand-navy border border-border-subtle rounded-lg overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-brand-bg/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#E6EDF3]">
              Client Care Management Ledger
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400">
              {filteredRows.length} {filteredRows.length === 1 ? 'client' : 'clients'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scheme Filter Tabs */}
            <div className="flex items-center bg-brand-bg border border-border-subtle rounded-md p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSchemeFilter('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  schemeFilter === 'ALL'
                    ? 'bg-brand-teal/20 text-brand-teal'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({clientRows.length})
              </button>
              <button
                type="button"
                onClick={() => setSchemeFilter('HCP')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  schemeFilter === 'HCP'
                    ? 'bg-brand-teal/20 text-brand-teal'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                HCP
              </button>
              <button
                type="button"
                onClick={() => setSchemeFilter('SAH')}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  schemeFilter === 'SAH'
                    ? 'bg-brand-teal/20 text-brand-teal'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Support at Home
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client or level..."
                className="bg-brand-bg border border-border-subtle rounded-md pl-8 pr-3 py-1 text-xs text-[#E6EDF3] placeholder:text-zinc-500 focus:outline-none focus:border-brand-teal w-52"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-8 text-center text-xs text-[#8B949E] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Calculating pooled Care Management funds across Home Care clients...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8B949E]">
            No Home Care clients found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-black/20 text-[10.5px] font-semibold uppercase tracking-wider text-[#8B949E]">
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Scheme &amp; Level</th>
                  <th className="py-2.5 px-3">Joined HITH</th>
                  <th className="py-2.5 px-3 text-right">Daily Subsidy</th>
                  <th className="py-2.5 px-3 text-right">{activeQuarter.shortLabel} Gross Subsidy</th>
                  <th className="py-2.5 px-3 text-right text-amber-300">
                    {activeQuarter.shortLabel} Care Mgmt ({careManagementFeePercent}%)
                  </th>
                  <th className="py-2.5 px-3 text-right text-emerald-400">
                    {activeQuarter.shortLabel} Net ON Budget
                  </th>
                  <th className="py-2.5 px-3 text-right text-amber-400">
                    Running Total Pooled (Since Joined)
                  </th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {filteredRows.map((row) => {
                  const isExpanded = expandedClientId === row.clientId;
                  return (
                    <React.Fragment key={row.clientId}>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#E6EDF3]">
                          <button
                            type="button"
                            onClick={() => navigate(`/clients/${row.clientId}`)}
                            className="hover:text-brand-teal transition-colors text-left cursor-pointer"
                          >
                            {row.fullName}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold border ${
                              row.subType === 'SAH'
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                            }`}
                          >
                            {row.subType === 'SAH' ? 'SaH' : 'HCP'} • {row.levelOrClass}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                          <div>{formatDate(row.joinedDateStr)}</div>
                          <div className="text-[10px] text-zinc-500">
                            {row.accruedDaysToToday} days to date • {row.quarterHistory.length}{' '}
                            {row.quarterHistory.length === 1 ? 'qtr' : 'qtrs'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                          {formatCurrency(row.dailyRate)}/day
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                          <div>{formatCurrency(row.quarterGrossSubsidy)}</div>
                          <div className="text-[10px] text-zinc-500">{row.quarterDays} days</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-300 bg-amber-500/[0.03]">
                          {formatCurrency(row.quarterCareMgmtPooled)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(row.quarterNetClientAllocation)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 bg-amber-500/[0.06]">
                          <div>{formatCurrency(row.cumulativeQuarterlyCareMgmt)}</div>
                          <div className="text-[10px] font-normal text-amber-300/70">
                            Accrued to today: {formatCurrency(row.accruedCareMgmtToToday)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedClientId(isExpanded ? null : row.clientId)
                              }
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="View quarter-by-quarter pooled Care Management history since joined"
                            >
                              <span>History</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/clients/${row.clientId}/budget`)}
                              className="p-1.5 rounded bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 transition-colors cursor-pointer"
                              title="Open Client Budget"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Quarter-by-Quarter Breakdown Since Joined */}
                      {isExpanded && (
                        <tr className="bg-black/40">
                          <td colSpan={9} className="p-3.5">
                            <div className="bg-brand-navy border border-border-subtle rounded-md p-3 space-y-2.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="text-xs font-semibold text-[#E6EDF3] flex items-center gap-2">
                                  <span>
                                    Quarter-by-Quarter Care Management Pool History — {row.fullName}
                                  </span>
                                  <span className="text-[10.5px] font-mono text-zinc-400 font-normal">
                                    (Joined {formatDate(row.joinedDateStr)})
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-amber-300">
                                  Total Pooled Across {row.quarterHistory.length} Quarters:{' '}
                                  <strong>{formatCurrency(row.cumulativeQuarterlyCareMgmt)}</strong>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-white/[0.08] text-[#8B949E] font-mono uppercase text-[10px]">
                                      <th className="py-1.5 px-2.5">Financial Year</th>
                                      <th className="py-1.5 px-2.5">Quarter</th>
                                      <th className="py-1.5 px-2.5">Active Period</th>
                                      <th className="py-1.5 px-2.5 text-right">Active Days</th>
                                      <th className="py-1.5 px-2.5 text-right">Gross Quarterly Subsidy</th>
                                      <th className="py-1.5 px-2.5 text-right text-amber-300">
                                        Care Mgmt Pooled ({careManagementFeePercent}%)
                                      </th>
                                      <th className="py-1.5 px-2.5 text-right text-emerald-400">
                                        Net Client ON Allocation
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/[0.05] font-mono">
                                    {row.quarterHistory.map((qh, idx) => (
                                      <tr key={idx} className="hover:bg-white/[0.02]">
                                        <td className="py-1.5 px-2.5 text-zinc-300">{qh.fyLabel}</td>
                                        <td className="py-1.5 px-2.5 text-[#E6EDF3] font-semibold">
                                          {qh.quarterLabel}{' '}
                                          {qh.isCurrentQuarter && (
                                            <span className="ml-1 px-1.5 py-0.2 rounded bg-brand-teal/15 text-brand-teal text-[9.5px]">
                                              Active
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-zinc-400">
                                          {formatDate(qh.startDateStr)} – {formatDate(qh.endDateStr)}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right text-zinc-300">
                                          {qh.activeDays} days
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right text-zinc-300">
                                          {formatCurrency(qh.grossSubsidy)}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right font-semibold text-amber-300">
                                          {formatCurrency(qh.careMgmtPooled)}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-400">
                                          {formatCurrency(qh.netClientAllocation)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-subtle bg-black/30 font-mono text-xs font-bold text-[#E6EDF3]">
                  <td colSpan={4} className="py-3 px-3 text-right uppercase text-[11px] text-[#8B949E]">
                    Pooled Totals ({filteredRows.length} Home Care Clients):
                  </td>
                  <td className="py-3 px-3 text-right text-zinc-200">
                    {formatCurrency(summaryTotals.totalQuarterGross)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-300 bg-amber-500/[0.05]">
                    {formatCurrency(summaryTotals.totalQuarterCareMgmt)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400">
                    {formatCurrency(summaryTotals.totalQuarterNet)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400 bg-amber-500/[0.08]">
                    {formatCurrency(summaryTotals.totalCumulativeCareMgmt)}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
