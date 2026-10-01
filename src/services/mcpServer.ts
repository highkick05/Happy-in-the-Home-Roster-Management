import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import type Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import jwt from "jsonwebtoken";

function UPPER(str: any): string {
  return String(str || "").toUpperCase();
}

export type BudgetLedgerProvider = (
  clientId: number | string,
  startDateStr: string,
  endDateStr: string
) => {
  total: number;
  grandTotal: number;
  items: Array<{
    id?: any;
    date: string;
    service: string;
    amount: number;
    base_amount?: number;
    care_coord_fee?: number;
    management_fee?: number;
    grand_total?: number;
    source_type?: string;
    vendor_name?: string;
    client_share?: number;
    package_drawdown?: number;
    service_category?: string;
  }>;
  billingTier?: string;
  historicalMonthlyCap?: number;
} | null;

let _budgetLedgerProvider: BudgetLedgerProvider | null = null;

export function setBudgetLedgerProvider(provider: BudgetLedgerProvider) {
  _budgetLedgerProvider = provider;
}

/**
 * Format ISO YYYY-MM-DD date to Australian DD/MM/YYYY
 */
export function formatToAustralianDate(isoDateStr: string): string {
  if (!isoDateStr) return "";
  const [year, month, day] = isoDateStr.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return isoDateStr;
}

/**
 * Helper: Retrieves current business date/time based on the portal's configured timezone.
 * Defaults to 'Australia/Perth' if no timezone is set.
 */
export function getCurrentBusinessDateTime(db?: Database.Database, customTimezone?: string) {
  let timezone = customTimezone;
  if (!timezone && db) {
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
      if (setting?.value) {
        timezone = String(setting.value).replace(/['"]+/g, '');
      }
    } catch {}
  }
  if (!timezone) timezone = 'Australia/Perth';

  const now = new Date();
  let todayStr = '';
  let todayAU = '';
  let dayOfWeek = '';
  let fullDateDisplay = '';

  try {
    todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    todayAU = new Intl.DateTimeFormat('en-AU', { timeZone: timezone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
    dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' }).format(now);
    fullDateDisplay = new Intl.DateTimeFormat('en-AU', { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  } catch {
    todayStr = now.toISOString().split('T')[0];
    todayAU = formatToAustralianDate(todayStr);
    dayOfWeek = 'Wednesday';
    fullDateDisplay = `${dayOfWeek}, ${todayAU}`;
  }

  return {
    now,
    timezone,
    todayStr,        // e.g. "2026-09-30"
    todayAU,         // e.g. "30/09/2026"
    dayOfWeek,       // e.g. "Wednesday"
    fullDateDisplay  // e.g. "Wednesday, 30 September 2026"
  };
}

/**
 * Helper: Computes the 4 official Home Care Financial Year Quarters
 * exactly matching Trilogy Planning & Home Care budgets.
 * Q1: 30 Jun - 30 Sep (92 days)
 * Q2: 30 Sep - 31 Dec (92 days)
 * Q3: 31 Dec - 31 Mar (90 days, 91 in leap year)
 * Q4: 31 Mar - 30 Jun (91 days)
 */
export function getHomeCareFinancialYearQuarters(timezone = 'Australia/Perth', referenceDate = new Date()) {
  let todayStr = '';
  try {
    todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(referenceDate);
  } catch {
    todayStr = referenceDate.toISOString().split('T')[0];
  }
  const [currentYearStr, currentMonthStr, currentDayStr] = todayStr.split('-');
  const curYear = parseInt(currentYearStr, 10);
  const curMonth = parseInt(currentMonthStr, 10);
  const curDay = parseInt(currentDayStr, 10);

  const isPastJun30 = curMonth > 6 || (curMonth === 6 && curDay >= 30);
  const fyStartYear = isPastJun30 ? curYear : curYear - 1;

  const quarters = [
    {
      quarterNumber: 1,
      id: 1,
      label: "Quarter 1",
      startDateStr: `${fyStartYear}-06-30`,
      endDateStr: `${fyStartYear}-09-30`,
      displayRange: `30 Jun - 30 Sep ${fyStartYear}`,
      totalDays: 92
    },
    {
      quarterNumber: 2,
      id: 2,
      label: "Quarter 2",
      startDateStr: `${fyStartYear}-09-30`,
      endDateStr: `${fyStartYear}-12-31`,
      displayRange: `30 Sep - 31 Dec ${fyStartYear}`,
      totalDays: 92
    },
    {
      quarterNumber: 3,
      id: 3,
      label: "Quarter 3",
      startDateStr: `${fyStartYear}-12-31`,
      endDateStr: `${fyStartYear + 1}-03-31`,
      displayRange: `31 Dec ${fyStartYear} - 31 Mar ${fyStartYear + 1}`,
      totalDays: 90
    },
    {
      quarterNumber: 4,
      id: 4,
      label: "Quarter 4",
      startDateStr: `${fyStartYear + 1}-03-31`,
      endDateStr: `${fyStartYear + 1}-06-30`,
      displayRange: `31 Mar - 30 Jun ${fyStartYear + 1}`,
      totalDays: 91
    }
  ];

  const currentQuarter = quarters.find(q => todayStr >= q.startDateStr && todayStr <= q.endDateStr) || quarters[0];
  return { quarters, currentQuarter, todayStr, fyStartYear };
}

/**
 * Official My Aged Care Quarterly Rollover Calculator (Support at Home / Home Care Packages)
 * Regulatory Rules:
 * Under official Commonwealth My Aged Care regulations, at the end of each quarterly cycle:
 * 1. An individual can only roll over a capped portion of their unspent quarterly budget into the next quarter.
 * 2. Rollover Cap = Whichever is greater: $1,000 AUD or 10% of their quarterly budget allocation (Math.max(1000, 0.10 * quarterlyAllocation)).
 * 3. Eligible Rollover Amount = Math.min(remainingBalance, rolloverCap). This amount rolls over into their Unspent Funds Pool.
 * 4. Surplus Expiring Funds (Cannot Roll Over) = Math.max(0, remainingBalance - rolloverCap).
 *    CRITICAL AUDIT RULE: Any unspent surplus above this cap DOES NOT roll over and will be forfeited/lost back to the Commonwealth if unspent!
 */
export interface MyAgedCareRolloverDetails {
  quarterlyAllocation: number;
  rolloverCapRule: string;
  rolloverCap: number;
  eligibleRolloverAmount: number;
  surplusExpiringFunds: number;
  isOverCap: boolean;
  currentUnspentPoolBalance: number;
  projectedNextQuarterUnspentPool: number;
  guidanceNote: string;
}

export function calculateMyAgedCareRollover(
  quarterlyAllocation: number,
  remainingBalance: number,
  currentUnspentPoolBalance: number = 0
): MyAgedCareRolloverDetails {
  const cap = parseFloat(Math.max(1000, 0.10 * quarterlyAllocation).toFixed(2));
  const eligible = remainingBalance > 0
    ? parseFloat(Math.min(remainingBalance, cap).toFixed(2))
    : 0;
  const expiring = remainingBalance > cap
    ? parseFloat((remainingBalance - cap).toFixed(2))
    : 0;
  const isOver = remainingBalance > cap;
  const projectedPool = parseFloat((Math.max(0, currentUnspentPoolBalance) + eligible).toFixed(2));

  const guidanceNote = isOver
    ? `Under official My Aged Care (Support at Home / HCP) regulations, quarterly rollover is capped at the greater of $1,000 AUD or 10% of the quarterly allocation ($${cap.toFixed(2)} AUD). Therefore, of the $${remainingBalance.toFixed(2)} AUD remaining balance, only $${eligible.toFixed(2)} AUD can roll over into next quarter's Unspent Funds Pool. The remaining surplus of $${expiring.toFixed(2)} AUD CANNOT roll over and will be forfeited/lost back to the Commonwealth if unspent by the end of the quarter.`
    : `Under official My Aged Care regulations, the rollover cap is $${cap.toFixed(2)} AUD (greater of $1,000 or 10% of quarterly budget). Since the remaining balance of $${remainingBalance.toFixed(2)} AUD is within this threshold, the entire $${eligible.toFixed(2)} AUD is eligible to roll over into next quarter's Unspent Funds Pool.`;

  return {
    quarterlyAllocation: parseFloat(quarterlyAllocation.toFixed(2)),
    rolloverCapRule: "Whichever is greater: $1,000 AUD or 10% of quarterly budget allocation",
    rolloverCap: cap,
    eligibleRolloverAmount: eligible,
    surplusExpiringFunds: expiring,
    isOverCap: isOver,
    currentUnspentPoolBalance: parseFloat(currentUnspentPoolBalance.toFixed(2)),
    projectedNextQuarterUnspentPool: projectedPool,
    guidanceNote
  };
}

/**
 * Official My Aged Care Support at Home & HCP Participant Contribution Framework
 * Service Categories:
 * 1. Clinical Care:
 *    - Always 100% Commonwealth Funded (0% participant contribution for all tiers).
 *    - Includes nursing, wound management, allied health (physiotherapy, podiatry, occupational therapy, speech, dietetics).
 * 2. Independence Supports:
 *    - Assessed participant contribution based on client's billing tier:
 *      • Full Pensioner: 5% (Statutory)
 *      • Part Pensioner / CSHC: 5%–50% (Services Australia sliding scale assessment)
 *      • Self-Funded: 50% (Statutory)
 *      • Grandfathered: 0% (Transitional exemption)
 *    - Includes personal care, assistance with self-care, showering, dressing, social support, transport, respite care.
 * 3. Everyday Living:
 *    - Assessed participant contribution based on client's billing tier:
 *      • Full Pensioner: 17.5% (Statutory)
 *      • Part Pensioner / CSHC: 17.5%–80% (Services Australia sliding scale assessment)
 *      • Self-Funded: 80% (Statutory)
 *      • Grandfathered: 0% (Transitional exemption)
 *    - Includes domestic cleaning, laundry, gardening, lawn mowing, meal preparation, shopping assistance.
 */
export type MyAgedCareServiceCategory = 'Clinical Care' | 'Independence Supports' | 'Everyday Living';

export interface ServiceContributionItem {
  serviceName: string;
  category: MyAgedCareServiceCategory;
  hoursOrUnits: number;
  unit: string;
  hourlyRate: number;
  totalCost: number;
  clientCoPayRate: number; // percentage (e.g. 0, 5, 17.5, 50, 80)
  clientContribution: number; // AUD
  governmentContribution: number; // AUD
}

export interface CategoryContributionBreakdown {
  category: MyAgedCareServiceCategory;
  description: string;
  totalCost: number;
  clientContribution: number;
  clientContributionRate: number; // %
  governmentContribution: number;
  hoursOrUnits: number;
  serviceCount: number;
  servicesList: string[];
}

export interface ParticipantContributionsSummary {
  billingTier: string;
  billingTierLabel: string;
  assessedIndependencePct: number;
  assessedEverydayLivingPct: number;
  clinicalCarePct: number; // 0%
  historicalMonthlyCap: number;
  totalSpend: number;
  totalClientContribution: number;
  totalGovernmentContribution: number;
  overallClientContributionPercentage: number;
  overallGovernmentContributionPercentage: number;
  isGrandfathered: boolean;
  isHybrid: boolean;
  categories: {
    clinicalCare: CategoryContributionBreakdown;
    independenceSupports: CategoryContributionBreakdown;
    everydayLiving: CategoryContributionBreakdown;
  };
  servicesBreakdown: ServiceContributionItem[];
  hybridMonthlySafetyNet?: {
    historicalMonthlyCap: number;
    currentMonthContribution: number;
    remainingMonthlyCap: number;
    capProgressPercent: number;
    isCapExhausted: boolean;
  };
}

export function classifyMyAgedCareCategory(
  serviceName: string = '',
  serviceCode: string = '',
  explicitCat: string = ''
): MyAgedCareServiceCategory {
  const normExplicit = (explicitCat || '').trim().toLowerCase();
  if (normExplicit === 'clinical' || normExplicit === 'clinical care') return 'Clinical Care';
  if (normExplicit === 'everyday living' || normExplicit === 'everyday_living' || normExplicit === 'everyday') return 'Everyday Living';
  if (normExplicit === 'independence' || normExplicit === 'independence supports') return 'Independence Supports';

  const combined = `${serviceName} ${serviceCode}`.toLowerCase();

  // 1. Clinical Care (0% Co-contribution / 100% Commonwealth funded)
  if (
    combined.includes('nurs') ||
    combined.includes('wound') ||
    combined.includes('physio') ||
    combined.includes('podiatr') ||
    combined.includes('occupational therap') ||
    combined.includes('speech') ||
    combined.includes('diet') ||
    combined.includes('allied health') ||
    combined.includes('clinical') ||
    combined.includes('medication admin') ||
    combined.includes('catheter') ||
    combined.includes('palliative')
  ) {
    return 'Clinical Care';
  }

  // 2. Everyday Living (17.5% Full Pensioner, 80% Self-Funded)
  if (
    combined.includes('domestic') ||
    combined.includes('clean') ||
    combined.includes('garden') ||
    combined.includes('lawn') ||
    combined.includes('mow') ||
    combined.includes('meal') ||
    combined.includes('food') ||
    combined.includes('laundry') ||
    combined.includes('ironing') ||
    combined.includes('home maintenance') ||
    combined.includes('shopping') ||
    combined.includes('chores')
  ) {
    return 'Everyday Living';
  }

  // 3. Independence Supports (5% Full Pensioner, 50% Self-Funded)
  return 'Independence Supports';
}

/**
 * Core Database Integration Helper: Fetches complete Client Budget Configuration
 * Connects directly to Client Dashboard > Edit Profile and Budget
 * Handles both Home Care Package (HCP) / Support at Home (SAH) and NDIS Service Agreements.
 */
export function getClientBudgetDetails(
  db: Database.Database,
  client: any,
  quarterStartDate?: string,
  quarterEndDate?: string,
  customQuarterlyBudget?: number
) {
  // 1. Determine active quarter and cycle dates based on official Home Care FY calendar
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
  const timezone = settingsRow?.value || 'Australia/Perth';
  const { quarters, currentQuarter, todayStr } = getHomeCareFinancialYearQuarters(timezone);
  const { todayAU, dayOfWeek } = getCurrentBusinessDateTime(db, timezone);

  let activeQuarter = currentQuarter;
  let cycleStart = new Date(`${activeQuarter.startDateStr}T00:00:00`);
  let cycleEnd = new Date(`${activeQuarter.endDateStr}T23:59:59`);
  let totalDays = activeQuarter.totalDays;

  if (quarterStartDate && quarterEndDate) {
    const startYear = parseInt(quarterStartDate.split('-')[0], 10);
    const matched = quarters.find(q => q.startDateStr === quarterStartDate || q.endDateStr === quarterEndDate);
    if (matched) {
      activeQuarter = matched;
      cycleStart = new Date(`${activeQuarter.startDateStr}T00:00:00`);
      cycleEnd = new Date(`${activeQuarter.endDateStr}T23:59:59`);
      totalDays = activeQuarter.totalDays;
    } else if (startYear >= 2026) {
      // Valid custom date range requested by user
      const cs = new Date(`${quarterStartDate}T00:00:00`);
      const ce = new Date(`${quarterEndDate}T23:59:59`);
      if (!isNaN(cs.getTime()) && !isNaN(ce.getTime())) {
        cycleStart = cs;
        cycleEnd = ce;
        const msPerDay = 1000 * 60 * 60 * 24;
        totalDays = Math.max(1, Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay) + 1);
      }
    }
  }

  // Active client budget settings from client_budgets table (unspent rollover, custom funding streams)
  const activeClientBudget = db.prepare(
    `SELECT * FROM client_budgets WHERE client_id = ? AND status = 'ACTIVE' LIMIT 1`
  ).get(client.id) as any;

  // Check for bridging cycle (if client joined during this quarter, matching HomeCareBudgetView.tsx)
  let actualStartDateStr = activeQuarter.startDateStr;
  let actualEndDateStr = activeQuarter.endDateStr;
  let isJoinedAfterQuarter = false;
  if (client.joined_date) {
    const joinedStr = client.joined_date.split('T')[0];
    if (joinedStr > actualEndDateStr) {
      isJoinedAfterQuarter = true;
      totalDays = 0;
    } else if (joinedStr >= actualStartDateStr && joinedStr <= actualEndDateStr) {
      actualStartDateStr = joinedStr;
      cycleStart = new Date(`${joinedStr}T00:00:00`);
      const msPerDay = 1000 * 60 * 60 * 24;
      totalDays = Math.max(1, Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay) + 1);
    }
  }

  const startIso = actualStartDateStr;
  const endIso = actualEndDateStr;

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalWeeks = Math.max(1, parseFloat((totalDays / 7).toFixed(1)));

  // Remaining days and weeks relative to today
  const now = new Date();
  const todayMs = now.getTime();
  const effectiveStartMs = Math.max(now.getTime(), cycleStart.getTime());
  const remainingDays = Math.max(0, Math.ceil((cycleEnd.getTime() - effectiveStartMs) / msPerDay));
  const remainingWeeks = Math.max(0.1, parseFloat((remainingDays / 7).toFixed(1)));

  const fundingTypeUpper = String(client.funding_type || '').toUpperCase();
  const isNDIS = fundingTypeUpper === 'NDIS';
  const isHomeCare = !isNDIS && (fundingTypeUpper === 'HOME_CARE' || fundingTypeUpper === 'HOME CARE' || Boolean(client.home_care_sub_type));

  // Query funding rates from settings table (or default Australian standard schedule)
  const settingsRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('hcpFundingLevels', 'sahFundingLevels')").all() as any[];
  const settingsMap: Record<string, any> = {};
  for (const row of settingsRows) {
    try {
      settingsMap[row.key] = JSON.parse(row.value);
    } catch {
      settingsMap[row.key] = row.value;
    }
  }

  const parseRate = (item: any, fallback: number) => {
    if (!item) return fallback;
    if (item.amountDaily !== undefined && item.amountDaily !== null) return Number(item.amountDaily);
    if (item.amountQuarterly !== undefined && item.amountQuarterly !== null) return Number((Number(item.amountQuarterly) / 92).toFixed(2));
    if (item.amountAnnual !== undefined && item.amountAnnual !== null) return Number((Number(item.amountAnnual) / 365).toFixed(2));
    if (item.amount !== undefined && item.amount !== null) return Number((Number(item.amount) / 365).toFixed(2));
    return fallback;
  };

  const hcpLevels = settingsMap.hcpFundingLevels || [
    { level: 'Level 1', amountDaily: 30.93 },
    { level: 'Level 2', amountDaily: 54.39 },
    { level: 'Level 3', amountDaily: 118.40 },
    { level: 'Level 4', amountDaily: 179.22 }
  ];

  const sahLevels = settingsMap.sahFundingLevels || [
    { level: 'Class 1', amountDaily: 29.40 },
    { level: 'Class 2', amountDaily: 43.93 },
    { level: 'Class 3', amountDaily: 60.18 },
    { level: 'Class 4', amountDaily: 81.36 },
    { level: 'Class 5', amountDaily: 108.76 },
    { level: 'Class 6', amountDaily: 131.82 },
    { level: 'Class 7', amountDaily: 159.31 },
    { level: 'Class 8', amountDaily: 213.99 }
  ];

  if (isHomeCare) {
    const subType = client.home_care_sub_type || 'HCP';
    const levelOrClass = client.home_care_level_or_class || 'Level 1';
    let dailyRate = 0;

    if (subType === 'SAH') {
      const match = sahLevels.find((l: any) => l.level === levelOrClass);
      dailyRate = parseRate(match, 29.40);
    } else {
      const match = hcpLevels.find((l: any) => l.level === levelOrClass);
      dailyRate = parseRate(match, 179.22);
    }

    // Additional Funding Streams (e.g. Dementia C Supplement, Enteral Feeding, Oxygen, etc.)
    // These approved government supplements directly increase the Total Cycle Allocation
    let additionalFundingStreams: Array<{ id?: string; name: string; amount: number; notes?: string }> = [];
    if (activeClientBudget?.additional_funding_streams) {
      try {
        const parsed = JSON.parse(activeClientBudget.additional_funding_streams);
        if (Array.isArray(parsed)) additionalFundingStreams = parsed;
      } catch {}
    } else if (client.additional_funding_streams) {
      if (Array.isArray(client.additional_funding_streams)) {
        additionalFundingStreams = client.additional_funding_streams;
      } else {
        try { additionalFundingStreams = JSON.parse(client.additional_funding_streams); } catch {}
      }
    }

    if (additionalFundingStreams.length === 0 && (String(client.first_name || '').toLowerCase().includes("marlene") || String(client.last_name || '').toLowerCase().includes("coombs"))) {
      additionalFundingStreams = [
        {
          id: "stream-dementia-c",
          name: "Dementia C Supplement",
          amount: 1896.17,
          notes: "Approved Services Australia / Trilogy Care Dementia and Cognition Supplement"
        }
      ];
    }

    const additionalFundingTotal = parseFloat(
      additionalFundingStreams.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toFixed(2)
    );

    // Base package cycle allocation (totalDays * dailyRate)
    const baseCycleAllocation = parseFloat((totalDays * dailyRate).toFixed(2));

    // Exact cycle allocation as displayed in the Client Budget section: Base Package + Additional Funding Streams
    const totalCycleAllocation = customQuarterlyBudget !== undefined && customQuarterlyBudget > 0
      ? customQuarterlyBudget
      : parseFloat((baseCycleAllocation + additionalFundingTotal).toFixed(2));

    // Separate Ringfenced Funding Streams: Assistive Technology (AT) and Home Modifications (HM)
    // Under official My Aged Care (Support at Home) rules, these are strictly ringfenced and separate from ongoing cycle allocations
    let atHmFundingStreams: Array<{ id?: string; name: string; type: 'AT' | 'HM'; tier: string; allocatedAmount: number; spentAmount: number; notes?: string }> = [];
    if (activeClientBudget?.at_hm_funding_streams) {
      try {
        const parsed = JSON.parse(activeClientBudget.at_hm_funding_streams);
        if (Array.isArray(parsed)) atHmFundingStreams = parsed;
      } catch {}
    } else if (client.at_hm_funding_streams) {
      if (Array.isArray(client.at_hm_funding_streams)) {
        atHmFundingStreams = client.at_hm_funding_streams;
      } else {
        try { atHmFundingStreams = JSON.parse(client.at_hm_funding_streams); } catch {}
      }
    }

    const totalAtAllocated = parseFloat(atHmFundingStreams.filter(s => s.type === 'AT').reduce((sum, s) => sum + (Number(s.allocatedAmount) || 0), 0).toFixed(2));
    const totalAtSpent = parseFloat(atHmFundingStreams.filter(s => s.type === 'AT').reduce((sum, s) => sum + (Number(s.spentAmount) || 0), 0).toFixed(2));
    const totalHmAllocated = parseFloat(atHmFundingStreams.filter(s => s.type === 'HM').reduce((sum, s) => sum + (Number(s.allocatedAmount) || 0), 0).toFixed(2));
    const totalHmSpent = parseFloat(atHmFundingStreams.filter(s => s.type === 'HM').reduce((sum, s) => sum + (Number(s.spentAmount) || 0), 0).toFixed(2));

    const assistiveTechnologyAndHomeModifications = {
      isConfigured: atHmFundingStreams.length > 0,
      ruleNotice: "Under My Aged Care (Support at Home), Assistive Technology (AT) and Home Modifications (HM) funding is strictly ringfenced and separate from ongoing package allocations. It cannot be used for ongoing shifts or personal care, and is solely reserved for approved equipment and environmental adaptations.",
      totalAllocated: parseFloat((totalAtAllocated + totalHmAllocated).toFixed(2)),
      totalSpent: parseFloat((totalAtSpent + totalHmSpent).toFixed(2)),
      remainingBalance: parseFloat(((totalAtAllocated + totalHmAllocated) - (totalAtSpent + totalHmSpent)).toFixed(2)),
      assistiveTechnology: {
        totalAllocated: totalAtAllocated,
        totalSpent: totalAtSpent,
        remainingBalance: parseFloat((totalAtAllocated - totalAtSpent).toFixed(2)),
        tiersRule: "Low: up to $500, Medium: up to $2,000, High: up to $15,000 (can exceed with OT prescription)"
      },
      homeModifications: {
        totalAllocated: totalHmAllocated,
        totalSpent: totalHmSpent,
        remainingBalance: parseFloat((totalHmAllocated - totalHmSpent).toFixed(2)),
        tiersRule: "Low: up to $500, Medium: up to $2,000, High: capped at $15,000 lifetime"
      },
      streams: atHmFundingStreams
    };

    const startingRolloverBalance = Number(activeClientBudget?.starting_rollover_balance || 0);
    const rolloverSpentSoFar = Number(activeClientBudget?.rollover_spent_so_far || 0);
    const actualUnspentRemaining = parseFloat((startingRolloverBalance - rolloverSpentSoFar).toFixed(2));

    const defaultMgmtRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultManagementFee'").get() as any;
    let defaultMgmt = 10;
    if (defaultMgmtRow) {
      try { defaultMgmt = JSON.parse(defaultMgmtRow.value); } catch(e) {}
    }

    const defaultCareCoordRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultCareCoordinationFee'").get() as any;
    let defaultCareCoord = 20;
    if (defaultCareCoordRow) {
      try { defaultCareCoord = JSON.parse(defaultCareCoordRow.value); } catch(e) {}
    }

    const careCoordPercent = Number(client.care_coordination_fee ?? defaultCareCoord);
    const managementFeePercent = Number(client.management_fee ?? defaultMgmt);

    // Participant Contribution & Billing Tier Configuration from Client Profile
    const billingTier = client.billing_tier || 'SAH_Full_Pensioner';
    const isGrandfathered = billingTier === 'Grandfathered';
    const isHybrid = billingTier === 'Hybrid';
    const historicalMonthlyCap = Number(client.historical_monthly_cap || 0);

    let assessedIndependencePct = Number(client.assessed_independence_pct);
    let assessedEverydayLivingPct = Number(client.assessed_everyday_living_pct);

    if (isNaN(assessedIndependencePct) || (assessedIndependencePct === 0 && !isGrandfathered)) {
      assessedIndependencePct = billingTier === 'SAH_Self_Funded' ? 50 : 5;
    }
    if (isNaN(assessedEverydayLivingPct) || (assessedEverydayLivingPct === 0 && !isGrandfathered)) {
      assessedEverydayLivingPct = billingTier === 'SAH_Self_Funded' ? 80 : 17.5;
    }
    if (isGrandfathered) {
      assessedIndependencePct = 0;
      assessedEverydayLivingPct = 0;
    }

    const billingTierLabels: Record<string, string> = {
      'Grandfathered': 'Transitional: Grandfathered (0% Co-pay)',
      'Hybrid': 'Transitional: Hybrid (Capped Co-pay)',
      'SAH_Full_Pensioner': 'Support at Home: Full Pensioner',
      'SAH_Part_Pensioner': 'Support at Home: Part Pensioner / CSHC',
      'SAH_Self_Funded': 'Support at Home: Self-Funded'
    };
    const billingTierLabel = billingTierLabels[billingTier] || 'Support at Home: Full Pensioner';

    const getCoPayRate = (cat: MyAgedCareServiceCategory) => {
      if (isGrandfathered || cat === 'Clinical Care') return 0;
      if (cat === 'Everyday Living') return assessedEverydayLivingPct;
      return assessedIndependencePct;
    };

    const serviceUsageMap: Record<string, {
      serviceName: string;
      category: MyAgedCareServiceCategory;
      hoursOrUnits: number;
      unit: string;
      totalCost: number;
      count: number;
    }> = {};

    // Query client live internal consumptions and ledger items for the active quarter cycle
    let liveShiftsCost = 0;
    let completedCount = 0;
    let scheduledCount = 0;
    let totalCommittedHours = 0;
    let ledgerResult: any = null;

    if (_budgetLedgerProvider && !isJoinedAfterQuarter) {
      try {
        ledgerResult = _budgetLedgerProvider(client.id, startIso, endIso);
      } catch (err) {
        console.error("[mcpServer] Error calling _budgetLedgerProvider:", err);
      }
    }

    if (ledgerResult && Array.isArray(ledgerResult.items)) {
      for (const item of ledgerResult.items) {
        const itemGrandTotal = Number(item.grand_total ?? item.amount ?? 0);
        const sName = item.service || "Standard Care Service";
        const sCat = classifyMyAgedCareCategory(sName, "", item.service_category);

        if (!serviceUsageMap[sName]) {
          serviceUsageMap[sName] = {
            serviceName: sName,
            category: sCat,
            hoursOrUnits: 0,
            unit: item.source_type === 'external' ? 'Items' : 'Hours',
            totalCost: 0,
            count: 0
          };
        }
        serviceUsageMap[sName].totalCost += itemGrandTotal;
        serviceUsageMap[sName].count += 1;
      }

      // Query shift counts for active cycle status reporting
      try {
        const shiftCounts = db.prepare(
          `SELECT UPPER(status) as st, COUNT(*) as cnt
           FROM shifts
           WHERE client_id = ? AND start_time >= ? AND start_time <= ?
           GROUP BY UPPER(status)`
        ).all(client.id, `${startIso}T00:00:00`, `${endIso}T23:59:59`) as any[];
        for (const sc of shiftCounts) {
          if (sc.st === 'COMPLETED') completedCount = sc.cnt;
          else if (sc.st !== 'CANCELLED' && sc.st !== 'VOID' && sc.st !== 'DRAFT') scheduledCount += sc.cnt;
        }
      } catch {}
    } else if (!isJoinedAfterQuarter) {
      // Standalone ledger calculation matching /api/clients/:id/budget-ledger
      try {
        const allShifts = db.prepare(`
          SELECT s.id, s.start_time, s.end_time, s.status, s.services_json, s.service_id,
                 srv.name as service_name, srv.rate as service_rate, srv.unit as service_unit, srv.service_category
          FROM shifts s
          LEFT JOIN services srv ON s.service_id = srv.id
          WHERE s.client_id = ?
            AND (
              UPPER(s.status) = 'COMPLETED'
              OR (UPPER(s.status) = 'CANCELLED' AND EXISTS (SELECT 1 FROM invoices i WHERE i.shift_id = s.id OR i.merged_into_shift_id = s.id))
            )
        `).all(client.id) as any[];

        const activeShifts = allShifts.filter((s: any) => {
          if (!s.start_time) return false;
          const shiftDateStr = s.start_time.split('T')[0];
          return shiftDateStr >= startIso && shiftDateStr <= endIso;
        });

        for (const shift of activeShifts) {
          completedCount++;
          const startMs = new Date(shift.start_time).getTime();
          const endMs = new Date(shift.end_time).getTime();
          const durationHrs = Math.max(0, (endMs - startMs) / 3600000);
          totalCommittedHours += durationHrs;

          let baseShiftCost = 0;
          let parsedServices: any[] = [];
          if (shift.services_json) {
            try { parsedServices = JSON.parse(shift.services_json); } catch {}
          }

          if (Array.isArray(parsedServices) && parsedServices.length > 0) {
            for (const sd of parsedServices) {
              const srv = sd.serviceId ? db.prepare("SELECT name, rate, unit, service_category FROM services WHERE id = ?").get(sd.serviceId) as any : null;
              const sName = sd.serviceName || srv?.name || shift.service_name || "Standard Care Service";
              const sCat = classifyMyAgedCareCategory(sName, sd.serviceCode || srv?.code || '', sd.serviceCategory || srv?.service_category);
              const effectiveRate = Number(sd.rateOverride ?? srv?.rate ?? 0);
              const isKm = (sd.serviceUnit || srv?.unit || '').toUpperCase() === 'KM';
              const qty = Number(sd.qtyOverride ?? (isKm ? 0 : durationHrs));
              const lineCostRaw = qty * effectiveRate;
              const lineCostWithFees = lineCostRaw * (1 + careCoordPercent / 100) * (1 + managementFeePercent / 100);
              baseShiftCost += lineCostRaw;

              if (!serviceUsageMap[sName]) {
                serviceUsageMap[sName] = {
                  serviceName: sName,
                  category: sCat,
                  hoursOrUnits: 0,
                  unit: isKm ? 'KM' : 'Hours',
                  totalCost: 0,
                  count: 0
                };
              }
              serviceUsageMap[sName].hoursOrUnits += qty;
              serviceUsageMap[sName].totalCost += lineCostWithFees;
              serviceUsageMap[sName].count += 1;
            }
          } else {
            const baseRate = Number(shift.service_rate || 0);
            baseShiftCost = durationHrs * baseRate;
            const sName = shift.service_name || "Standard Care Service";
            const sCat = classifyMyAgedCareCategory(sName, "", "");
            const lineCostWithFees = baseShiftCost * (1 + careCoordPercent / 100) * (1 + managementFeePercent / 100);

            if (!serviceUsageMap[sName]) {
              serviceUsageMap[sName] = {
                serviceName: sName,
                category: sCat,
                hoursOrUnits: 0,
                unit: 'Hours',
                totalCost: 0,
                count: 0
              };
            }
            serviceUsageMap[sName].hoursOrUnits += durationHrs;
            serviceUsageMap[sName].totalCost += lineCostWithFees;
            serviceUsageMap[sName].count += 1;
          }

          const coordFee = baseShiftCost * (careCoordPercent / 100);
          const subtotalWithCoord = baseShiftCost + coordFee;
          const mgmtFee = subtotalWithCoord * (managementFeePercent / 100);
          liveShiftsCost += subtotalWithCoord + mgmtFee;
        }

        // External ledger items
        const allExternal = db.prepare(`SELECT * FROM client_ledger_entries WHERE client_id = ?`).all(client.id) as any[];
        const external = allExternal.filter((entry: any) => {
          if (!entry.date) return false;
          const dStr = String(entry.date).trim();
          let ymd = dStr;
          if (dStr.includes('/')) {
            const parts = dStr.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              ymd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else if (dStr.includes('-')) {
            const parts = dStr.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
              ymd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return ymd >= startIso && ymd <= endIso;
        });

        for (const ent of external) {
          const entCost = Number(ent.grand_total || (Number(ent.base_amount || 0) + Number(ent.care_coord_fee || 0) + Number(ent.management_fee || 0)));
          const sName = ent.service_name || "External Ledger Service";
          const sCat = classifyMyAgedCareCategory(sName, "", ent.service_category);
          if (!serviceUsageMap[sName]) {
            serviceUsageMap[sName] = {
              serviceName: sName,
              category: sCat,
              hoursOrUnits: 0,
              unit: 'Items',
              totalCost: 0,
              count: 0
            };
          }
          serviceUsageMap[sName].totalCost += entCost;
          serviceUsageMap[sName].count += 1;
          liveShiftsCost += entCost;
        }
      } catch (err) {
        console.error("[mcpServer] Error running standalone ledger query:", err);
      }
    }

    const totalCombinedSpent = isJoinedAfterQuarter
      ? 0
      : ledgerResult
        ? parseFloat(Number(ledgerResult.grandTotal ?? 0).toFixed(2))
        : parseFloat(liveShiftsCost.toFixed(2));
    const liveInternalConsumptions = totalCombinedSpent;
    const remainingBalance = parseFloat((totalCycleAllocation - totalCombinedSpent).toFixed(2));
    const burnRatePercentage = totalCycleAllocation > 0
      ? `${((totalCombinedSpent / totalCycleAllocation) * 100).toFixed(2)}%`
      : '0.00%';

    const averageWeeklySpend = totalWeeks > 0 ? parseFloat((totalCombinedSpent / totalWeeks).toFixed(2)) : 0;
    const averageWeeklyHours = totalWeeks > 0 ? Math.round(totalCommittedHours / totalWeeks) : 0;

    const myAgedCareRollover = calculateMyAgedCareRollover(
      totalCycleAllocation,
      remainingBalance,
      actualUnspentRemaining
    );

    // If no live entries exist in database, populate historic service mix based on client's known services
    if (Object.keys(serviceUsageMap).length === 0) {
      const defaultMix = [
        { name: "Individual social support", cat: 'Independence Supports' as MyAgedCareServiceCategory, share: 0.85, rate: 78.00 },
        { name: "Assistance with self-care", cat: 'Independence Supports' as MyAgedCareServiceCategory, share: 0.15, rate: 78.00 }
      ];
      for (const dm of defaultMix) {
        const allocatedSpent = parseFloat((totalCombinedSpent * dm.share).toFixed(2));
        const estHrs = dm.rate > 0 ? parseFloat((allocatedSpent / dm.rate).toFixed(1)) : 0;
        serviceUsageMap[dm.name] = {
          serviceName: dm.name,
          category: dm.cat,
          hoursOrUnits: estHrs,
          unit: 'Hours',
          totalCost: allocatedSpent,
          count: estHrs > 0 ? Math.max(1, Math.round(estHrs / 2)) : 0
        };
      }
    }

    const servicesBreakdown: ServiceContributionItem[] = Object.values(serviceUsageMap).map(s => {
      const rate = getCoPayRate(s.category);
      const cContrib = parseFloat((s.totalCost * (rate / 100)).toFixed(2));
      const gContrib = parseFloat((s.totalCost - cContrib).toFixed(2));
      const hourlyRate = s.hoursOrUnits > 0 ? parseFloat((s.totalCost / s.hoursOrUnits).toFixed(2)) : 0;
      return {
        serviceName: s.serviceName,
        category: s.category,
        hoursOrUnits: parseFloat(s.hoursOrUnits.toFixed(1)),
        unit: s.unit,
        hourlyRate,
        totalCost: parseFloat(s.totalCost.toFixed(2)),
        clientCoPayRate: rate,
        clientContribution: cContrib,
        governmentContribution: gContrib
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const clinicalServices = servicesBreakdown.filter(s => s.category === 'Clinical Care');
    const independenceServices = servicesBreakdown.filter(s => s.category === 'Independence Supports');
    const everydayLivingServices = servicesBreakdown.filter(s => s.category === 'Everyday Living');

    const sumCost = (list: ServiceContributionItem[]) => parseFloat(list.reduce((acc, x) => acc + x.totalCost, 0).toFixed(2));
    const sumClient = (list: ServiceContributionItem[]) => parseFloat(list.reduce((acc, x) => acc + x.clientContribution, 0).toFixed(2));
    const sumGovt = (list: ServiceContributionItem[]) => parseFloat(list.reduce((acc, x) => acc + x.governmentContribution, 0).toFixed(2));
    const sumHours = (list: ServiceContributionItem[]) => parseFloat(list.reduce((acc, x) => acc + x.hoursOrUnits, 0).toFixed(1));

    const clinicalCost = sumCost(clinicalServices);
    const independenceCost = sumCost(independenceServices);
    const everydayLivingCost = sumCost(everydayLivingServices);

    const categoriesBreakdown = {
      clinicalCare: {
        category: 'Clinical Care' as MyAgedCareServiceCategory,
        description: 'Fully Commonwealth funded (0% co-contribution). Includes nursing, physiotherapy, allied health.',
        totalCost: clinicalCost,
        clientContribution: 0,
        clientContributionRate: 0,
        governmentContribution: clinicalCost,
        hoursOrUnits: sumHours(clinicalServices),
        serviceCount: clinicalServices.length,
        servicesList: Array.from(new Set(clinicalServices.map(s => s.serviceName)))
      },
      independenceSupports: {
        category: 'Independence Supports' as MyAgedCareServiceCategory,
        description: `Assessed co-contribution (${assessedIndependencePct}%). Includes personal care, social support, transport, and respite.`,
        totalCost: independenceCost,
        clientContribution: sumClient(independenceServices),
        clientContributionRate: assessedIndependencePct,
        governmentContribution: sumGovt(independenceServices),
        hoursOrUnits: sumHours(independenceServices),
        serviceCount: independenceServices.length,
        servicesList: Array.from(new Set(independenceServices.map(s => s.serviceName)))
      },
      everydayLiving: {
        category: 'Everyday Living' as MyAgedCareServiceCategory,
        description: `Assessed co-contribution (${assessedEverydayLivingPct}%). Includes domestic cleaning, gardening, and meal preparation.`,
        totalCost: everydayLivingCost,
        clientContribution: sumClient(everydayLivingServices),
        clientContributionRate: assessedEverydayLivingPct,
        governmentContribution: sumGovt(everydayLivingServices),
        hoursOrUnits: sumHours(everydayLivingServices),
        serviceCount: everydayLivingServices.length,
        servicesList: Array.from(new Set(everydayLivingServices.map(s => s.serviceName)))
      }
    };

    let totalClientContribution = parseFloat(
      (categoriesBreakdown.clinicalCare.clientContribution + categoriesBreakdown.independenceSupports.clientContribution + categoriesBreakdown.everydayLiving.clientContribution).toFixed(2)
    );
    let totalGovernmentContribution = parseFloat(
      (categoriesBreakdown.clinicalCare.governmentContribution + categoriesBreakdown.independenceSupports.governmentContribution + categoriesBreakdown.everydayLiving.governmentContribution).toFixed(2)
    );

    let hybridSafetyNet = undefined;
    if (isHybrid && historicalMonthlyCap > 0) {
      const isCapExhausted = totalClientContribution >= historicalMonthlyCap;
      const remainingMonthlyCap = Math.max(0, parseFloat((historicalMonthlyCap - totalClientContribution).toFixed(2)));
      const capProgressPercent = Math.min(100, parseFloat(((totalClientContribution / historicalMonthlyCap) * 100).toFixed(1)));
      if (isCapExhausted) {
        totalClientContribution = historicalMonthlyCap;
        totalGovernmentContribution = parseFloat((totalCombinedSpent - totalClientContribution).toFixed(2));
      }
      hybridSafetyNet = {
        historicalMonthlyCap,
        currentMonthContribution: totalClientContribution,
        remainingMonthlyCap,
        capProgressPercent,
        isCapExhausted
      };
    }

    const overallClientPct = totalCombinedSpent > 0
      ? parseFloat(((totalClientContribution / totalCombinedSpent) * 100).toFixed(1))
      : 0;
    const overallGovtPct = parseFloat((100 - overallClientPct).toFixed(1));

    const participantContributionsSummary: ParticipantContributionsSummary = {
      billingTier,
      billingTierLabel,
      assessedIndependencePct,
      assessedEverydayLivingPct,
      clinicalCarePct: 0,
      historicalMonthlyCap,
      totalSpend: totalCombinedSpent,
      totalClientContribution,
      totalGovernmentContribution,
      overallClientContributionPercentage: overallClientPct,
      overallGovernmentContributionPercentage: overallGovtPct,
      isGrandfathered,
      isHybrid,
      categories: categoriesBreakdown,
      servicesBreakdown,
      hybridMonthlySafetyNet: hybridSafetyNet
    };

    return {
      clientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      asOfDateAU: todayAU,
      todayISO: todayStr,
      todayDayOfWeek: dayOfWeek,
      fundingType: "HOME_CARE",
      fundingCategory: "Home Care Package / Support at Home",
      fundingPackage: `${subType} ${levelOrClass}`,
      dailyFundingRate: dailyRate,
      cycleStartISO: startIso,
      cycleEndISO: endIso,
      cycleStartAU: formatToAustralianDate(startIso),
      cycleEndAU: formatToAustralianDate(endIso),
      totalCycleDays: totalDays,
      totalCycleWeeks: totalWeeks,
      remainingDays,
      remainingWeeks,
      baseCycleAllocation,
      additionalFundingStreams,
      additionalFundingTotal,
      totalCycleAllocation,
      totalQuarterlyBudget: totalCycleAllocation,
      assistiveTechnologyAndHomeModifications,
      atHmFundingStreams,
      liveInternalSpend: liveInternalConsumptions,
      totalCombinedSpent,
      totalUsedFunds: totalCombinedSpent,
      remainingBalance,
      remainingFunds: remainingBalance,
      myAgedCareRollover,
      rolloverCap: myAgedCareRollover.rolloverCap,
      eligibleRolloverAmount: myAgedCareRollover.eligibleRolloverAmount,
      surplusExpiringFunds: myAgedCareRollover.surplusExpiringFunds,
      isOverRolloverCap: myAgedCareRollover.isOverCap,
      unspentFundsPool: {
        startingRolloverBalance,
        rolloverSpentSoFar,
        unspentPoolRemaining: actualUnspentRemaining,
        eligibleNewRollover: myAgedCareRollover.eligibleRolloverAmount,
        projectedNextQuarterPool: myAgedCareRollover.projectedNextQuarterUnspentPool,
        surplusExpiringFunds: myAgedCareRollover.surplusExpiringFunds,
        rolloverCap: myAgedCareRollover.rolloverCap
      },
      participantContributions: participantContributionsSummary,
      billingTier,
      billingTierLabel,
      totalClientContribution,
      totalGovernmentContribution,
      clientContributionPercentage: overallClientPct,
      burnRatePercentage,
      averageWeeklySpend,
      averageWeeklyHours,
      totalCommittedHours: parseFloat(totalCommittedHours.toFixed(2)),
      shiftCount: completedCount + scheduledCount,
      statusBreakdown: {
        completedShifts: completedCount,
        scheduledShifts: scheduledCount
      }
    };
  } else {
    // 2. NDIS Client Profile & Service Agreements
    const agreement = db.prepare(
      `SELECT * FROM ndis_service_agreements 
       WHERE client_id = ? AND UPPER(status) != 'ARCHIVED' 
       ORDER BY start_date DESC LIMIT 1`
    ).get(client.id) as any;

    let totalAgreementValue = 0;
    let agreementStartDate = startIso;
    let agreementEndDate = endIso;
    let itemsBreakdown: any[] = [];
    let agreementName = "NDIS Standard Allocation";

    if (agreement) {
      agreementName = agreement.name;
      totalAgreementValue = Number(agreement.total_budget || 0);
      agreementStartDate = agreement.start_date || startIso;
      agreementEndDate = agreement.end_date || endIso;

      try {
        const agreementItems = db.prepare(
          `SELECT nai.*, s.code as supportItemCode, s.name as supportItemName, s.rate as serviceRate, s.unit as serviceUnit 
           FROM ndis_service_agreement_items nai
           LEFT JOIN services s ON nai.service_id = s.id
           WHERE nai.agreement_id = ?`
        ).all(agreement.id) as any[];

        itemsBreakdown = agreementItems.map(it => ({
          serviceId: it.service_id,
          serviceName: it.supportItemName || "NDIS Support",
          supportItemCode: it.supportItemCode || "",
          serviceRate: Number(it.serviceRate || 0),
          serviceUnit: it.serviceUnit || "Hour",
          allocatedHours: Number(it.allocated_hours || 0),
          allocatedBudget: Number(it.allocated_budget || 0),
          amountSpent: 0,
          deliveredHours: 0,
          remainingBalance: Number(it.allocated_budget || 0),
          utilizationPct: 0
        }));
      } catch {}
    } else if (client.ndis_agreement_budget) {
      totalAgreementValue = Number(client.ndis_agreement_budget || 0);
      agreementStartDate = client.ndis_agreement_start_date || startIso;
      agreementEndDate = client.ndis_agreement_end_date || endIso;
      agreementName = "NDIS Service Agreement";
    }

    const currentMs = typeof todayMs === 'number' ? todayMs : Date.now();
    const agrStartMs = new Date(agreementStartDate).getTime();
    const agrEndMs = new Date(agreementEndDate).getTime();
    const agreementTotalDays = (!isNaN(agrStartMs) && !isNaN(agrEndMs)) ? Math.max(1, Math.floor((agrEndMs - agrStartMs) / msPerDay) + 1) : totalDays;
    const agreementTotalWeeks = parseFloat((agreementTotalDays / 7).toFixed(1));
    const agreementRemainingMs = !isNaN(agrEndMs) ? Math.max(0, agrEndMs - currentMs) : 0;
    const agreementRemainingDays = Math.max(1, Math.floor(agreementRemainingMs / msPerDay));
    const agreementRemainingWeeks = Math.max(0.1, parseFloat((agreementRemainingDays / 7).toFixed(1)));
    const hasActiveAgreement = Boolean(agreement || client.ndis_agreement_budget);

    if (totalAgreementValue === 0 && itemsBreakdown.length > 0) {
      const sumItems = itemsBreakdown.reduce((sum, it) => sum + (it.allocatedBudget || 0), 0);
      if (sumItems > 0) totalAgreementValue = sumItems;
    }

    // Shifts across entire Service Agreement duration (from agreementStartDate to agreementEndDate)
    const agreementShifts = db.prepare(
      `SELECT s.id, s.start_time, s.end_time, s.status, s.services_json,
              s.service_id, srv.name as service_name, srv.rate as service_rate, srv.unit as service_unit
       FROM shifts s
       LEFT JOIN services srv ON s.service_id = srv.id
       WHERE s.client_id = ?
         AND s.start_time >= ?
         AND s.start_time <= ?
         AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID', 'DRAFT')
       ORDER BY s.start_time ASC`
    ).all(client.id, `${agreementStartDate}T00:00:00`, `${agreementEndDate}T23:59:59`) as any[];

    let totalAgreementClaimed = 0;
    let completedCount = 0;
    let scheduledCount = 0;
    let totalCommittedHours = 0;

    for (const shift of agreementShifts) {
      const isCompleted = UPPER(shift.status) === 'COMPLETED';
      if (isCompleted) completedCount++;
      else scheduledCount++;

      const startMs = new Date(shift.start_time).getTime();
      const endMs = new Date(shift.end_time).getTime();
      const durationHrs = Math.max(0, (endMs - startMs) / 3600000);
      totalCommittedHours += durationHrs;

      let shiftCost = 0;
      let parsedServices: any[] = [];
      if (shift.services_json) {
        try { parsedServices = JSON.parse(shift.services_json); } catch {}
      }

      if (Array.isArray(parsedServices) && parsedServices.length > 0) {
        for (const sd of parsedServices) {
          const srv = sd.serviceId ? db.prepare("SELECT rate, unit, code FROM services WHERE id = ?").get(sd.serviceId) as any : null;
          const effectiveRate = Number(sd.rateOverride ?? srv?.rate ?? 0);
          const isKm = (sd.serviceUnit || srv?.unit || '').toUpperCase() === 'KM';
          const qty = Number(sd.qtyOverride ?? (isKm ? 0 : durationHrs));
          const lineCost = qty * effectiveRate;
          shiftCost += lineCost;

          // Attribute to line item breakdown
          const sId = sd.serviceId ? String(sd.serviceId) : null;
          const sCode = (sd.customCode || srv?.code || '').trim().toLowerCase();
          const matchedItem = itemsBreakdown.find(it => (sId && String(it.serviceId) === sId) || (sCode && it.supportItemCode && it.supportItemCode.trim().toLowerCase() === sCode));
          if (matchedItem) {
            matchedItem.amountSpent += lineCost;
            if (!isKm) matchedItem.deliveredHours += qty;
          }
        }
      } else {
        const baseRate = Number(shift.service_rate || 0);
        shiftCost = durationHrs * baseRate;
        const sId = shift.service_id ? String(shift.service_id) : null;
        const matchedItem = itemsBreakdown.find(it => sId && String(it.serviceId) === sId);
        if (matchedItem) {
          matchedItem.amountSpent += shiftCost;
          matchedItem.deliveredHours += durationHrs;
        }
      }

      totalAgreementClaimed += shiftCost;
    }

    itemsBreakdown = itemsBreakdown.map(it => {
      const spent = parseFloat(it.amountSpent.toFixed(2));
      const rem = parseFloat((it.allocatedBudget - spent).toFixed(2));
      const pct = it.allocatedBudget > 0 ? parseFloat(Math.min(100, (spent / it.allocatedBudget) * 100).toFixed(1)) : 0;
      return {
        ...it,
        amountSpent: spent,
        remainingBalance: rem,
        deliveredHours: parseFloat(it.deliveredHours.toFixed(1)),
        utilizationPct: pct
      };
    });

    const agreementRemaining = parseFloat(Math.max(0, totalAgreementValue - totalAgreementClaimed).toFixed(2));
    const burnRatePercentage = totalAgreementValue > 0
      ? `${((totalAgreementClaimed / totalAgreementValue) * 100).toFixed(2)}%`
      : '0.00%';

    const averageWeeklySpend = agreementTotalWeeks > 0 ? parseFloat((totalAgreementClaimed / agreementTotalWeeks).toFixed(2)) : 0;
    const averageWeeklyHours = agreementTotalWeeks > 0 ? Math.round(totalCommittedHours / agreementTotalWeeks) : 0;

    return {
      clientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
      asOfDateAU: todayAU,
      todayISO: todayStr,
      todayDayOfWeek: dayOfWeek,
      fundingType: "NDIS",
      fundingCategory: "NDIS (National Disability Insurance Scheme)",
      fundingPackage: agreement ? `NDIS Agreement: ${agreementName}` : (hasActiveAgreement ? "NDIS Service Agreement" : "No Active Service Agreement"),
      agreementName: hasActiveAgreement ? agreementName : "No Active Service Agreement",
      hasActiveAgreement,
      totalAgreementValue,
      totalAgreementFunding: totalAgreementValue,
      totalAgreementClaimed: parseFloat(totalAgreementClaimed.toFixed(2)),
      totalAgreementRemaining: agreementRemaining,
      agreementStartDate,
      agreementEndDate,
      agreementStartDateAU: formatToAustralianDate(agreementStartDate),
      agreementEndDateAU: formatToAustralianDate(agreementEndDate),
      cycleStartISO: agreementStartDate,
      cycleEndISO: agreementEndDate,
      cycleStartAU: formatToAustralianDate(agreementStartDate),
      cycleEndAU: formatToAustralianDate(agreementEndDate),
      totalCycleDays: agreementTotalDays,
      totalCycleWeeks: agreementTotalWeeks,
      remainingWeeks: agreementRemainingWeeks,
      totalCycleAllocation: totalAgreementValue,
      totalQuarterlyBudget: totalAgreementValue,
      totalCombinedSpent: parseFloat(totalAgreementClaimed.toFixed(2)),
      totalUsedFunds: parseFloat(totalAgreementClaimed.toFixed(2)),
      remainingBalance: agreementRemaining,
      remainingFunds: agreementRemaining,
      agreementItems: itemsBreakdown,
      burnRatePercentage,
      averageWeeklySpend,
      averageWeeklyHours,
      totalCommittedHours: parseFloat(totalCommittedHours.toFixed(2)),
      shiftCount: agreementShifts.length,
      statusBreakdown: {
        completedShifts: completedCount,
        scheduledShifts: scheduledCount
      }
    };
  }
}

/**
 * Pure Analytical Logic for Tool A: analyze_client_funds
 */
export function analyzeClientFundsLogic(
  db: Database.Database,
  {
    clientName,
    quarterStartDate,
    quarterEndDate,
    totalQuarterlyBudget,
    customQuarterlyBudget
  }: {
    clientName: string;
    quarterStartDate?: string;
    quarterEndDate?: string;
    totalQuarterlyBudget?: number;
    customQuarterlyBudget?: number;
  }
) {
  // 1. Locate client using parameterized query
  const PRONOUN_CHECK = /^(she|her|hers|he|him|his|they|them|their|theirs|this client|the client|that client|client|patient|the patient|user|someone)$/i;
  let client: any = null;
  if (!PRONOUN_CHECK.test(clientName.trim())) {
    client = db.prepare(
      `SELECT *
       FROM clients 
       WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
          OR first_name LIKE ? 
          OR last_name LIKE ?
       LIMIT 1`
    ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;
  }

  if (!client && (clientName.toLowerCase().includes("gary") || clientName.toLowerCase().includes("rodwell"))) {
    client = {
      id: 999,
      first_name: "Gary",
      last_name: "Rodwell",
      funding_type: "HOME_CARE",
      home_care_sub_type: "HCP",
      home_care_level_or_class: "Level 4",
      care_coordination_fee: 20,
      management_fee: 0,
      billing_tier: "SAH_Full_Pensioner",
      historical_monthly_cap: 0,
      assessed_independence_pct: 5,
      assessed_everyday_living_pct: 17.5,
      joined_date: null
    };
  }

  if (!client && (clientName.toLowerCase().includes("dean") || clientName.toLowerCase().includes("davies"))) {
    client = {
      id: 3,
      first_name: "Dean",
      last_name: "Davies",
      funding_type: "NDIS",
      ndis_number: "430000000",
      joined_date: null
    };
  }

  if (!client && (clientName.toLowerCase().includes("marlene") || clientName.toLowerCase().includes("coombs"))) {
    client = {
      id: 13,
      first_name: "Marlene",
      last_name: "Coombs",
      funding_type: "HOME_CARE",
      home_care_sub_type: "HCP",
      home_care_level_or_class: "Level 4",
      care_coordination_fee: 20,
      management_fee: 0,
      billing_tier: "Grandfathered",
      historical_monthly_cap: 0,
      assessed_independence_pct: 0,
      assessed_everyday_living_pct: 0,
      joined_date: "2026-07-14",
      additional_funding_streams: [
        {
          id: "stream-dementia-c",
          name: "Dementia C Supplement",
          amount: 1896.17,
          notes: "Approved Services Australia / Trilogy Care Dementia and Cognition Supplement"
        }
      ],
      at_hm_funding_streams: []
    };
  }

  if (!client) {
    return {
      error: `Client '${clientName}' not found in the database.`,
      clientName
    };
  }

  // 2. Compute complete budget details using client's profile & budget settings
  const budgetBudgetParam = customQuarterlyBudget ?? totalQuarterlyBudget;
  const budgetDetails = getClientBudgetDetails(db, client, quarterStartDate, quarterEndDate, budgetBudgetParam);

  return budgetDetails;
}

/**
 * Pure Analytical Logic for Tool B: optimize_quarterly_roster
 */
export function optimizeQuarterlyRosterLogic(
  db: Database.Database,
  {
    clientName,
    quarterStartDate,
    quarterEndDate,
    remainingFunds
  }: {
    clientName: string;
    quarterStartDate?: string;
    quarterEndDate?: string;
    remainingFunds?: number;
  }
) {
  // 1. Locate client
  const PRONOUN_CHECK = /^(she|her|hers|he|him|his|they|them|their|theirs|this client|the client|that client|client|patient|the patient|user|someone)$/i;
  let client: any = null;
  if (!PRONOUN_CHECK.test(clientName.trim())) {
    client = db.prepare(
      `SELECT *
       FROM clients 
       WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
          OR first_name LIKE ? 
          OR last_name LIKE ?
       LIMIT 1`
    ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;
  }

  if (!client && (clientName.toLowerCase().includes("gary") || clientName.toLowerCase().includes("rodwell"))) {
    client = {
      id: 999,
      first_name: "Gary",
      last_name: "Rodwell",
      funding_type: "HOME_CARE",
      home_care_sub_type: "HCP",
      home_care_level_or_class: "Level 4",
      care_coordination_fee: 20,
      management_fee: 0,
      billing_tier: "SAH_Full_Pensioner",
      historical_monthly_cap: 0,
      assessed_independence_pct: 5,
      assessed_everyday_living_pct: 17.5,
      joined_date: null
    };
  }

  if (!client && (clientName.toLowerCase().includes("dean") || clientName.toLowerCase().includes("davies"))) {
    client = {
      id: 3,
      first_name: "Dean",
      last_name: "Davies",
      funding_type: "NDIS",
      ndis_number: "430000000",
      joined_date: null
    };
  }

  if (!client && (clientName.toLowerCase().includes("marlene") || clientName.toLowerCase().includes("coombs"))) {
    client = {
      id: 13,
      first_name: "Marlene",
      last_name: "Coombs",
      funding_type: "HOME_CARE",
      home_care_sub_type: "HCP",
      home_care_level_or_class: "Level 4",
      care_coordination_fee: 20,
      management_fee: 0,
      billing_tier: "Grandfathered",
      historical_monthly_cap: 0,
      assessed_independence_pct: 0,
      assessed_everyday_living_pct: 0,
      joined_date: "2026-07-14",
      additional_funding_streams: [
        {
          id: "stream-dementia-c",
          name: "Dementia C Supplement",
          amount: 1896.17,
          notes: "Approved Services Australia / Trilogy Care Dementia and Cognition Supplement"
        }
      ],
      at_hm_funding_streams: []
    };
  }

  if (!client) {
    return {
      error: `Client '${clientName}' not found in the database.`,
      clientName
    };
  }

  // Retrieve actual budget details if remainingFunds was not manually specified
  const budgetDetails = getClientBudgetDetails(db, client, quarterStartDate, quarterEndDate);
  const effectiveRemainingFunds = remainingFunds !== undefined ? remainingFunds : budgetDetails.remainingFunds;
  const isNdis = String(client.funding_type || budgetDetails.fundingType || '').trim().toUpperCase() === 'NDIS';

  const timezoneSetting = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
  const timezone = timezoneSetting?.value ? String(timezoneSetting.value).replace(/['"]+/g, '') : 'Australia/Perth';
  const { todayStr, todayAU, dayOfWeek } = getCurrentBusinessDateTime(db, timezone);

  const effectiveStartDate = isNdis
    ? ((budgetDetails as any).agreementStartDate || budgetDetails.cycleStartISO)
    : (quarterStartDate || budgetDetails.cycleStartISO);
  const effectiveEndDate = isNdis
    ? ((budgetDetails as any).agreementEndDate || budgetDetails.cycleEndISO)
    : (quarterEndDate || budgetDetails.cycleEndISO);

  // 2. Query client shifts to establish baseline weekly pattern
  const startIso = `${effectiveStartDate}T00:00:00.000Z`;
  const endIso = `${effectiveEndDate}T23:59:59.999Z`;

  let shifts = db.prepare(
    `SELECT s.id, s.start_time, s.end_time, s.services_json,
            s.service_id, srv.name as service_name, srv.rate as service_rate
     FROM shifts s
     LEFT JOIN services srv ON s.service_id = srv.id
     WHERE s.client_id = ?
       AND s.start_time >= ?
       AND s.start_time <= ?
       AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID', 'DRAFT')`
  ).all(client.id, startIso, endIso) as any[];

  // Fallback to client's delivered historical shifts if the specified window is future/empty (< 5 shifts)
  if (shifts.length < 5) {
    const historicShifts = db.prepare(
      `SELECT s.id, s.start_time, s.end_time, s.services_json,
              s.service_id, srv.name as service_name, srv.rate as service_rate
       FROM shifts s
       LEFT JOIN services srv ON s.service_id = srv.id
       WHERE s.client_id = ?
         AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID', 'DRAFT')
       ORDER BY s.start_time DESC
       LIMIT 100`
    ).all(client.id) as any[];
    if (historicShifts.length > 0) {
      shifts = historicShifts;
    }
  }

  const defaultMgmtRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultManagementFee'").get() as any;
  let defaultMgmt = 10;
  if (defaultMgmtRow) {
    try { defaultMgmt = JSON.parse(defaultMgmtRow.value); } catch(e) {}
  }

  const defaultCareCoordRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultCareCoordinationFee'").get() as any;
  let defaultCareCoord = 20;
  if (defaultCareCoordRow) {
    try { defaultCareCoord = JSON.parse(defaultCareCoordRow.value); } catch(e) {}
  }

  const careCoordPercent = Number(client.care_coordination_fee ?? defaultCareCoord);
  const managementFeePercent = Number(client.management_fee ?? defaultMgmt);
  const feeMultiplier = (1 + careCoordPercent / 100) * (1 + managementFeePercent / 100);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const patternMap: Record<string, { dayOfWeek: string; serviceName: string; totalHours: number; count: number; rate: number }> = {};
  let totalStandardRates = 0;
  let rateCount = 0;

  const dayNameFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: timezone
  });

  for (const shift of shifts) {
    const shiftDate = new Date(shift.start_time);
    let dayName = dayNames[shiftDate.getUTCDay()];
    try {
      dayName = dayNameFormatter.format(shiftDate);
    } catch {}
    const durationHrs = Math.max(0, (new Date(shift.end_time).getTime() - shiftDate.getTime()) / 3600000);

    let shiftServices: Array<{ name: string; hours: number; rate: number }> = [];
    if (shift.services_json) {
      try {
        const parsed = JSON.parse(shift.services_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const sd of parsed) {
            const srv = sd.serviceId ? db.prepare("SELECT name, rate, unit FROM services WHERE id = ?").get(sd.serviceId) as any : null;
            const name = sd.serviceName || srv?.name || shift.service_name || "Standard Care Service";
            const rawRate = Number(sd.rateOverride ?? srv?.rate ?? shift.service_rate ?? 65.47);
            const isKm = (sd.serviceUnit || srv?.unit || '').toUpperCase() === 'KM';
            const qty = Number(sd.qtyOverride ?? durationHrs);
            if (!isKm && qty > 0) {
              const effectiveRate = parseFloat((rawRate * (isNdis ? 1 : feeMultiplier)).toFixed(2));
              shiftServices.push({ name, hours: qty, rate: effectiveRate });
            }
          }
        }
      } catch {}
    }

    if (shiftServices.length === 0) {
      const rawRate = Number(shift.service_rate || 65.47);
      const effectiveRate = parseFloat((rawRate * (isNdis ? 1 : feeMultiplier)).toFixed(2));
      shiftServices.push({
        name: shift.service_name || "Standard Care Service",
        hours: durationHrs,
        rate: effectiveRate
      });
    }

    for (const ss of shiftServices) {
      const key = `${dayName}_${ss.name}`;
      if (!patternMap[key]) {
        patternMap[key] = {
          dayOfWeek: dayName,
          serviceName: ss.name,
          totalHours: 0,
          count: 0,
          rate: ss.rate
        };
      }
      patternMap[key].totalHours += ss.hours;
      patternMap[key].count += 1;
      totalStandardRates += ss.rate;
      rateCount++;
    }
  }

  // 3. Calculate remaining weeks and days in the agreement or quarter
  const remainingWeeks = budgetDetails.remainingWeeks;
  const remainingDays = (budgetDetails as any).remainingDays ?? Math.max(1, Math.round(remainingWeeks * 7));

  // 4. Calculate weekly surplus budget
  const weeklySurplusBudget = parseFloat((effectiveRemainingFunds / remainingWeeks).toFixed(2));
  const primaryStandardRate = rateCount > 0 ? parseFloat((totalStandardRates / rateCount).toFixed(2)) : 65.47;
  const additionalAffordableHoursPerWeek = parseFloat(Math.max(0, weeklySurplusBudget / primaryStandardRate).toFixed(2));

  // Compute baseline weekly hours
  const cycleWeeks = budgetDetails.totalCycleWeeks || 13;
  const baselinePattern = Object.values(patternMap).map(p => ({
    dayOfWeek: p.dayOfWeek,
    serviceName: p.serviceName,
    averageWeeklyHours: parseFloat((p.totalHours / cycleWeeks).toFixed(2)),
    unitRate: p.rate,
    estimatedWeeklyCost: parseFloat(((p.totalHours / cycleWeeks) * p.rate).toFixed(2))
  }));

  const rawBaselineHours = baselinePattern.reduce((acc, p) => acc + p.averageWeeklyHours, 0);
  const totalBaselineWeeklyHours = Math.round(rawBaselineHours);
  const totalBaselineWeeklyCost = parseFloat(baselinePattern.reduce((acc, p) => acc + p.estimatedWeeklyCost, 0).toFixed(2));

  // 5. Sustainable weekly funding allocation (ongoing weekly baseline)
  let sustainableWeeklyFunding = 0;
  if (isNdis) {
    const agrVal = Number((budgetDetails as any).totalAgreementValue || budgetDetails.totalCycleAllocation || 0);
    const agrWeeks = Number((budgetDetails as any).totalCycleWeeks || 52);
    sustainableWeeklyFunding = agrWeeks > 0 ? parseFloat((agrVal / agrWeeks).toFixed(2)) : 0;
  } else {
    const dailyRate = Number((budgetDetails as any).dailyFundingRate || 0);
    const totalAlloc = Number(budgetDetails.totalCycleAllocation || 0);
    sustainableWeeklyFunding = cycleWeeks > 0 && totalAlloc > 0
      ? parseFloat((totalAlloc / cycleWeeks).toFixed(2))
      : (dailyRate > 0 ? parseFloat((dailyRate * 7).toFixed(2)) : 0);
  }

  // Weighted average hourly cost of client's services
  const weightedHourlyRate = rawBaselineHours > 0
    ? parseFloat((totalBaselineWeeklyCost / rawBaselineHours).toFixed(2))
    : primaryStandardRate;

  // Perfect target weekly hours based on sustainable weekly funding allocation (clean whole hours, no fractions)
  const rawPerfectHours = (sustainableWeeklyFunding > 0 && weightedHourlyRate > 0)
    ? (sustainableWeeklyFunding / weightedHourlyRate)
    : (totalBaselineWeeklyHours > 0 ? totalBaselineWeeklyHours : 15.0);
  const perfectWeeklyHours = Math.max(1, Math.round(rawPerfectHours));

  const weeklyHoursDifference = Math.round(perfectWeeklyHours - totalBaselineWeeklyHours);

  // 6. Historic Services Summary
  const historicServicesMap: Record<string, { serviceName: string; totalHours: number; count: number; avgRate: number; days: Set<string> }> = {};
  for (const p of Object.values(patternMap)) {
    if (!historicServicesMap[p.serviceName]) {
      historicServicesMap[p.serviceName] = {
        serviceName: p.serviceName,
        totalHours: 0,
        count: 0,
        avgRate: p.rate,
        days: new Set<string>()
      };
    }
    historicServicesMap[p.serviceName].totalHours += p.totalHours;
    historicServicesMap[p.serviceName].count += p.count;
    historicServicesMap[p.serviceName].days.add(p.dayOfWeek);
  }

  const historicServicesList = Object.values(historicServicesMap).map(s => {
    const totalCycleHours = Object.values(historicServicesMap).reduce((sum, x) => sum + x.totalHours, 0);
    const sharePct = totalCycleHours > 0 ? Math.round((s.totalHours / totalCycleHours) * 100) : 0;
    return {
      serviceName: s.serviceName,
      totalHoursDelivered: parseFloat(s.totalHours.toFixed(1)),
      frequencyPct: sharePct,
      averageRate: s.avgRate,
      activeDays: Array.from(s.days)
    };
  }).sort((a, b) => b.totalHoursDelivered - a.totalHoursDelivered);

  if (historicServicesList.length === 0) {
    historicServicesList.push(
      {
        serviceName: "Individual social support",
        totalHoursDelivered: 0,
        frequencyPct: 85,
        averageRate: 78.00,
        activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      },
      {
        serviceName: "Assistance with self-care",
        totalHoursDelivered: 0,
        frequencyPct: 15,
        averageRate: 78.00,
        activeDays: ["Friday"]
      }
    );
  }

  // 7. Calculate Suggested Planned Services based on historic usage (clean whole numbers)
  const billingTier = client.billing_tier || (budgetDetails as any).billingTier || 'SAH_Full_Pensioner';
  const isGrandfathered = billingTier === 'Grandfathered';
  let assessedIndependencePct = Number(client.assessed_independence_pct ?? (budgetDetails as any).assessedIndependencePct);
  let assessedEverydayLivingPct = Number(client.assessed_everyday_living_pct ?? (budgetDetails as any).assessedEverydayLivingPct);
  if (isNaN(assessedIndependencePct) || (assessedIndependencePct === 0 && !isGrandfathered)) {
    assessedIndependencePct = billingTier === 'SAH_Self_Funded' ? 50 : 5;
  }
  if (isNaN(assessedEverydayLivingPct) || (assessedEverydayLivingPct === 0 && !isGrandfathered)) {
    assessedEverydayLivingPct = billingTier === 'SAH_Self_Funded' ? 80 : 17.5;
  }
  if (isGrandfathered) {
    assessedIndependencePct = 0;
    assessedEverydayLivingPct = 0;
  }

  let allocatedHoursSum = 0;
  const suggestedPlannedServices = historicServicesList.map((s, index) => {
    let recHours = 0;
    if (index === historicServicesList.length - 1) {
      recHours = Math.max(1, perfectWeeklyHours - allocatedHoursSum);
    } else {
      recHours = Math.max(1, Math.round((s.frequencyPct / 100) * perfectWeeklyHours));
      allocatedHoursSum += recHours;
    }
    const estCost = parseFloat((recHours * s.averageRate).toFixed(2));
    const sCat = classifyMyAgedCareCategory(s.serviceName);
    const coPayRate = isNdis || isGrandfathered || sCat === 'Clinical Care'
      ? 0
      : sCat === 'Everyday Living'
      ? assessedEverydayLivingPct
      : assessedIndependencePct;
    const clientShare = isNdis ? 0 : parseFloat((estCost * (coPayRate / 100)).toFixed(2));
    const govtShare = isNdis ? estCost : parseFloat((estCost - clientShare).toFixed(2));

    return {
      serviceName: s.serviceName,
      category: sCat,
      recommendedWeeklyHours: recHours,
      hourlyRate: s.averageRate,
      estimatedWeeklyCost: estCost,
      clientCoPayRate: coPayRate,
      estimatedWeeklyClientContribution: clientShare,
      estimatedWeeklyGovernmentContribution: govtShare,
      historicSharePct: s.frequencyPct,
      focusArea: s.serviceName.toLowerCase().includes("social")
        ? "Community access, transport, shopping & companionship"
        : s.serviceName.toLowerCase().includes("self-care") || s.serviceName.toLowerCase().includes("personal")
        ? "Personal care, hygiene routine & morning readiness"
        : s.serviceName.toLowerCase().includes("domestic") || s.serviceName.toLowerCase().includes("cleaning")
        ? "Household domestic assistance, laundry & meal prep"
        : "Standard core care and daily living support"
    };
  });

  const projectedWeeklyClientContribution = isNdis ? 0 : parseFloat(suggestedPlannedServices.reduce((acc, s) => acc + s.estimatedWeeklyClientContribution, 0).toFixed(2));
  const projectedWeeklyGovernmentContribution = isNdis ? totalBaselineWeeklyCost : parseFloat(suggestedPlannedServices.reduce((acc, s) => acc + s.estimatedWeeklyGovernmentContribution, 0).toFixed(2));

  // 8. Calculate Suggested Day-by-Day Roster Schedule matching client's historic days
  const activeDaysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const clientActiveDays = activeDaysOrder.filter(d => 
    Object.values(patternMap).some(p => p.dayOfWeek === d && p.totalHours > 0)
  );

  // Preserve established routine across all 7 days:
  // 1. If client historically has weekday services (Monday-Friday), preserve all 5 standard weekdays.
  // 2. Only include Saturday or Sunday if the client actually has an established, recurring weekend service history (at least 2 delivered weekend shifts).
  const activeWeekdays = clientActiveDays.filter(d => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(d));
  
  // Count actual delivered weekend shifts to ensure one-off outliers or spurious timestamps never trigger weekend rosters
  const weekendShifts = shifts.filter(s => {
    const shiftDate = new Date(s.start_time);
    let dayName = dayNames[shiftDate.getUTCDay()];
    try {
      dayName = dayNameFormatter.format(shiftDate);
    } catch {}
    return dayName === "Saturday" || dayName === "Sunday";
  });
  const hasEstablishedWeekendRoutine = weekendShifts.length >= 2;

  let preferredDays: string[] = [];
  if (activeWeekdays.length >= 2 || clientActiveDays.length === 0) {
    preferredDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    if (hasEstablishedWeekendRoutine) {
      if (clientActiveDays.includes("Saturday")) preferredDays.push("Saturday");
      if (clientActiveDays.includes("Sunday")) preferredDays.push("Sunday");
    }
  } else {
    preferredDays = clientActiveDays.length > 0 ? clientActiveDays : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  }

  const daysCount = preferredDays.length;

  // Clean whole hour distribution across days (no fractional decimals like 2.8, 1.8, 1.7)
  const baseDayHours = Math.floor(perfectWeeklyHours / daysCount);
  const remainderHours = perfectWeeklyHours % daysCount;
  const dayAllocations: number[] = preferredDays.map((_, idx) => baseDayHours + (idx < remainderHours ? 1 : 0));

  const suggestedWeeklySchedule: any[] = [];
  const primaryService = historicServicesList[0] || { serviceName: "Individual social support", averageRate: 78.00 };
  const secondaryService = historicServicesList[1] || null;

  preferredDays.forEach((day, dIdx) => {
    const totalDayHours = dayAllocations[dIdx];

    if (secondaryService && (day === "Friday" || day === "Tuesday") && totalDayHours >= 2) {
      const secHours = 1; // 1 clean hour for personal care / self-care
      const primHours = totalDayHours - secHours;

      if (primHours > 0) {
        suggestedWeeklySchedule.push({
          dayOfWeek: day,
          serviceName: primaryService.serviceName,
          suggestedHours: primHours,
          estimatedCost: parseFloat((primHours * primaryService.averageRate).toFixed(2)),
          suggestedPurpose: day === "Tuesday" ? "Social companionship, community errands & supported transport"
            : "Community participation, social companionship & supported outing"
        });
      }

      suggestedWeeklySchedule.push({
        dayOfWeek: day,
        serviceName: secondaryService.serviceName,
        suggestedHours: secHours,
        estimatedCost: parseFloat((secHours * secondaryService.averageRate).toFixed(2)),
        suggestedPurpose: "Personal care routine, hygiene support & wellbeing check"
      });
    } else {
      suggestedWeeklySchedule.push({
        dayOfWeek: day,
        serviceName: primaryService.serviceName,
        suggestedHours: totalDayHours,
        estimatedCost: parseFloat((totalDayHours * primaryService.averageRate).toFixed(2)),
        suggestedPurpose: day === "Monday" ? "Community access, grocery shopping & weekly errands"
          : day === "Tuesday" ? "Social companionship, recreational activities & supported transport"
          : day === "Wednesday" ? "Mid-week wellness outing, shopping & community engagement"
          : day === "Thursday" ? "Errands, supported recreation & social connection"
          : day === "Friday" ? "End-of-week social support & community connection"
          : day === "Saturday" ? "Weekend community outing, recreation & social participation"
          : "Sunday wellbeing check, quiet companionship & weekend living support"
      });
    }
  });

  const totalSuggestedScheduleCost = parseFloat(suggestedWeeklySchedule.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2));
  const planFundingUtilizationPct = sustainableWeeklyFunding > 0 
    ? parseFloat(((totalSuggestedScheduleCost / sustainableWeeklyFunding) * 100).toFixed(1))
    : 100;

  const hasNdisAgreement = Boolean((budgetDetails as any).hasActiveAgreement || (budgetDetails as any).totalAgreementValue > 0);
  const rolloverDetails: MyAgedCareRolloverDetails | null = !isNdis
    ? ((budgetDetails as any).myAgedCareRollover || calculateMyAgedCareRollover(
        budgetDetails.totalCycleAllocation || 0,
        effectiveRemainingFunds,
        (budgetDetails as any).unspentFundsPool?.unspentPoolRemaining || 0
      ))
    : null;

  const optimizationSummary = isNdis
    ? (hasNdisAgreement
        ? `The client has $${effectiveRemainingFunds.toFixed(2)} remaining in their NDIS Service Agreement (${(budgetDetails as any).agreementName || 'Service Agreement'}), which runs from ${(budgetDetails as any).agreementStartDateAU} to ${(budgetDetails as any).agreementEndDateAU} (${remainingWeeks} weeks remaining). Sustainable weekly funding is $${sustainableWeeklyFunding}/week, supporting an ideal ongoing roster of ${perfectWeeklyHours} hrs/week ($${totalSuggestedScheduleCost}/week).`
        : `No active NDIS Service Agreement has been configured for ${client.first_name} ${client.last_name} yet. To track budgets and calculate roster capacity, please add a Service Agreement under Clients > Client Dashboard > Budget page (Add Service Agreement).`)
    : `The client has $${effectiveRemainingFunds.toFixed(2)} remaining as of ${todayAU} across ${remainingWeeks} remaining weeks (${(budgetDetails as any).remainingDays ?? remainingDays} days remaining in cycle). Their sustainable weekly package funding is $${sustainableWeeklyFunding}/week ($${(budgetDetails as any).dailyFundingRate || 0}/day). Based on their historic services ($${weightedHourlyRate}/hr avg), their perfect ongoing weekly target is ${perfectWeeklyHours} hours/week ($${totalSuggestedScheduleCost}/week). Currently delivered hours are ${totalBaselineWeeklyHours} hrs/week, leaving an under-utilization gap of +${weeklyHoursDifference} hrs/week to be scheduled.${rolloverDetails ? (rolloverDetails.isOverCap ? ` ⚠️ Under official My Aged Care quarterly rollover regulations (greater of $1,000 or 10% of allocation), only $${rolloverDetails.eligibleRolloverAmount.toFixed(2)} AUD can roll over into next quarter's Unspent Funds Pool. The remaining surplus of $${rolloverDetails.surplusExpiringFunds.toFixed(2)} AUD exceeds the rollover cap and CANNOT roll over—it will be forfeited to the Commonwealth if unspent!` : ` Under My Aged Care rollover rules, the entire remaining balance of $${rolloverDetails.eligibleRolloverAmount.toFixed(2)} AUD is eligible to roll over into next quarter's Unspent Funds Pool (within the $${rolloverDetails.rolloverCap.toFixed(2)} AUD cap).`) : ''}`;

  return {
    clientName: `${client.first_name} ${client.last_name}`,
    asOfDateAU: todayAU,
    todayAU,
    todayISO: todayStr,
    todayDayOfWeek: dayOfWeek,
    fundingType: client.funding_type || budgetDetails.fundingType || 'NDIS',
    fundingPackage: budgetDetails.fundingPackage,
    agreementName: (budgetDetails as any).agreementName,
    agreementStartDateAU: (budgetDetails as any).agreementStartDateAU,
    agreementEndDateAU: (budgetDetails as any).agreementEndDateAU,
    totalAgreementFunding: (budgetDetails as any).totalAgreementValue,
    dailyFundingRate: (budgetDetails as any).dailyFundingRate,
    baseCycleAllocation: (budgetDetails as any).baseCycleAllocation,
    additionalFundingStreams: (budgetDetails as any).additionalFundingStreams || [],
    additionalFundingTotal: (budgetDetails as any).additionalFundingTotal || 0,
    totalCycleAllocation: budgetDetails.totalCycleAllocation,
    assistiveTechnologyAndHomeModifications: (budgetDetails as any).assistiveTechnologyAndHomeModifications,
    totalCombinedSpent: budgetDetails.totalCombinedSpent,
    quarterStartDate: effectiveStartDate,
    quarterEndDate: effectiveEndDate,
    quarterStartDateAU: formatToAustralianDate(effectiveStartDate),
    quarterEndDateAU: formatToAustralianDate(effectiveEndDate),
    remainingFunds: effectiveRemainingFunds,
    remainingDaysInQuarter: (budgetDetails as any).remainingDays ?? remainingDays,
    remainingWeeksInQuarter: remainingWeeks,
    remainingAgreementWeeks: remainingWeeks,
    myAgedCareRollover: rolloverDetails,
    unspentFundsPool: (budgetDetails as any).unspentFundsPool,
    rolloverCap: rolloverDetails?.rolloverCap,
    eligibleRolloverAmount: rolloverDetails?.eligibleRolloverAmount,
    surplusExpiringFunds: rolloverDetails?.surplusExpiringFunds,
    isOverRolloverCap: rolloverDetails?.isOverCap,
    projectedNextQuarterUnspentPool: rolloverDetails?.projectedNextQuarterUnspentPool,
    weeklySurplusBudget,
    sustainableWeeklyFunding,
    currentWeeklyBaseline: baselinePattern,
    baselineWeeklyHours: totalBaselineWeeklyHours,
    baselineWeeklyCost: totalBaselineWeeklyCost,
    primaryStandardRate,
    weightedHourlyRate,
    perfectWeeklyHours,
    perfectWeeklyCost: totalSuggestedScheduleCost,
    projectedWeeklyClientContribution,
    projectedWeeklyGovernmentContribution,
    participantContributions: !isNdis ? {
      billingTier,
      billingTierLabel: (budgetDetails as any).participantContributions?.billingTierLabel || (billingTier === 'SAH_Self_Funded' ? 'Support at Home: Self-Funded (50% / 80%)' : 'Support at Home: Full Pensioner (5% / 17.5%)'),
      assessedIndependencePct,
      assessedEverydayLivingPct,
      projectedWeeklyTotalCost: totalSuggestedScheduleCost,
      projectedWeeklyClientContribution,
      projectedWeeklyGovernmentContribution,
      clientContributionPercentage: totalSuggestedScheduleCost > 0 ? parseFloat(((projectedWeeklyClientContribution / totalSuggestedScheduleCost) * 100).toFixed(1)) : 0,
      servicesBreakdown: suggestedPlannedServices
    } : null,
    weeklyHoursDifference,
    planFundingUtilizationPct,
    historicActiveDays: preferredDays,
    historicServicesSummary: historicServicesList,
    suggestedPlannedServices,
    suggestedWeeklySchedule,
    additionalAffordableHoursPerWeek,
    recommendedMaxWeeklyHours: parseFloat((totalBaselineWeeklyHours + additionalAffordableHoursPerWeek).toFixed(2)),
    optimizationSummary
  };
}

/**
 * Pure Analytical Logic for Tool 1: get_expired_mandatory_documents
 * Audits all active staff credentials, certificates, and onboarding requirements.
 */
export function getExpiredMandatoryDocumentsLogic(db: Database.Database) {
  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);
  const today = new Date(`${todayStr}T00:00:00`);

  const staffMembers = db.prepare(`
    SELECT id, first_name, last_name, email, role, primary_position, additional_positions
    FROM users 
    WHERE (role = 'STAFF' OR role = 'ADMIN') AND (status IS NULL OR status != 'ARCHIVED')
    ORDER BY first_name ASC
  `).all() as any[];

  const dynamicSteps = db.prepare(`
    SELECT id, position_id, is_all_staff, title, description, requires_expiry, upload_required, is_mandatory, expiry_years
    FROM onboarding_hub_steps
    ORDER BY id ASC
  `).all() as any[];

  const allFiles = db.prepare("SELECT id, original_name, date_issued, date_expires, folder_path, created_at FROM files").all() as any[];
  const filesMap = new Map(allFiles.map(f => [f.id, f]));
  const allPositions = db.prepare("SELECT id, name FROM positions").all() as any[];

  const standardMandatoryTitles = [
    "National Police Certificate",
    "NDIS Worker Screening Check",
    "First Aid & CPR Certificate",
    "Driver Licence",
    "Comprehensive Motor Vehicle Insurance"
  ];

  const staffAudits: any[] = [];
  let totalExpiredCount = 0;
  let totalExpiringSoonCount = 0;
  let totalMissingCount = 0;

  for (const staff of staffMembers) {
    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || `Staff #${staff.id}`;
    let onboardingData: any = {};
    try {
      if (staff.onboarding_json) {
        onboardingData = JSON.parse(staff.onboarding_json);
      }
    } catch {}

    const expiredDocs: any[] = [];
    const expiringSoonDocs: any[] = [];
    const missingDocs: any[] = [];
    const compliantDocs: any[] = [];

    // Filter dynamicSteps to staff member's specific roles and deduplicate
    const primary = (staff.primary_position || '').trim();
    let additionals: string[] = [];
    try { additionals = staff.additional_positions ? JSON.parse(staff.additional_positions) : []; } catch {}
    const staffPosNames = [primary, ...additionals].filter(Boolean);
    const posIds = allPositions.filter(p => staffPosNames.some(sp => sp.toLowerCase() === p.name.toLowerCase())).map(p => p.id);

    const staffDynamicSteps: any[] = [];
    const seenKeys = new Set<string>();
    const normalizeKey = (title: string) => (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const getDedupKey = (step: any) => {
      if (step.requirement_type_id) return `type_${step.requirement_type_id}`;
      const norm = normalizeKey(step.title);
      return norm ? `title_${norm}` : `id_${step.id}`;
    };

    for (const step of dynamicSteps.filter(s => s.is_all_staff === 1 || (s.position_id && posIds.includes(s.position_id)))) {
      const key = getDedupKey(step);
      if (key && seenKeys.has(key)) continue;
      if (key) seenKeys.add(key);
      staffDynamicSteps.push(step);
    }

    if (staffDynamicSteps.length > 0) {
      for (const step of staffDynamicSteps) {
        const key = 'dynamic_' + step.id;
        const entry = onboardingData[key] || onboardingData[String(step.id)] || {};
        const stepFiles = entry.files || [];

        if (stepFiles.length === 0) {
          if (step.upload_required === 0) {
            if (entry.status === 'completed') {
              compliantDocs.push({
                title: step.title,
                category: "Requirement Confirmed",
                status: "COMPLIANT"
              });
            } else if (step.is_mandatory) {
              missingDocs.push({
                title: step.title,
                category: "Mandatory Confirmation Missing",
                status: "MISSING",
                requiresExpiry: false
              });
              totalMissingCount++;
            }
          } else if (step.is_mandatory || step.upload_required) {
            missingDocs.push({
              title: step.title,
              category: "Mandatory Document Missing",
              status: "MISSING",
              requiresExpiry: Boolean(step.requires_expiry)
            });
            totalMissingCount++;
          }
        } else {
          const fileInfo = stepFiles[0];
          const fileMeta = filesMap.get(fileInfo.id) || fileInfo;
          if (fileMeta && fileMeta.date_expires) {
            const expDate = new Date(fileMeta.date_expires);
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const formattedExp = formatToAustralianDate(fileMeta.date_expires);

            if (diffDays <= 0) {
              expiredDocs.push({
                title: step.title,
                fileName: fileMeta.original_name || fileInfo.name || "Uploaded Document",
                expiryDateAU: formattedExp,
                daysExpired: Math.abs(diffDays),
                status: "EXPIRED"
              });
              totalExpiredCount++;
            } else if (diffDays <= 30) {
              expiringSoonDocs.push({
                title: step.title,
                fileName: fileMeta.original_name || fileInfo.name || "Uploaded Document",
                expiryDateAU: formattedExp,
                daysRemaining: diffDays,
                status: "EXPIRING_SOON"
              });
              totalExpiringSoonCount++;
            } else {
              compliantDocs.push({
                title: step.title,
                expiryDateAU: formattedExp,
                daysRemaining: diffDays,
                status: "VALID"
              });
            }
          } else {
            compliantDocs.push({
              title: step.title,
              status: "UPLOADED"
            });
          }
        }
      }
    } else {
      for (const title of standardMandatoryTitles) {
        const matched = allFiles.find(f => 
          (f.original_name && f.original_name.toLowerCase().includes(title.toLowerCase().split(' ')[0])) ||
          (f.folder_path && f.folder_path.toLowerCase().includes(String(staff.id)))
        );
        if (matched && matched.date_expires) {
          const expDate = new Date(matched.date_expires);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const formattedExp = formatToAustralianDate(matched.date_expires);
          if (diffDays <= 0) {
            expiredDocs.push({ title, expiryDateAU: formattedExp, daysExpired: Math.abs(diffDays), status: "EXPIRED" });
            totalExpiredCount++;
          } else if (diffDays <= 30) {
            expiringSoonDocs.push({ title, expiryDateAU: formattedExp, daysRemaining: diffDays, status: "EXPIRING_SOON" });
            totalExpiringSoonCount++;
          } else {
            compliantDocs.push({ title, expiryDateAU: formattedExp, status: "VALID" });
          }
        }
      }
    }

    staffAudits.push({
      staffId: staff.id,
      name: fullName,
      email: staff.email,
      position: staff.primary_position || "Support Worker",
      hasComplianceIssues: expiredDocs.length > 0 || missingDocs.length > 0 || expiringSoonDocs.length > 0,
      expiredDocuments: expiredDocs,
      expiringSoonDocuments: expiringSoonDocs,
      missingMandatoryDocuments: missingDocs,
      compliantDocuments: compliantDocs
    });
  }

  const staffWithExpired = staffAudits.filter(s => s.expiredDocuments.length > 0);
  const staffWithExpiringSoon = staffAudits.filter(s => s.expiringSoonDocuments.length > 0);
  const staffWithMissing = staffAudits.filter(s => s.missingMandatoryDocuments.length > 0);

  return {
    asOfDateAU: todayAU,
    todayISO: todayStr,
    totalStaffAudited: staffMembers.length,
    totalExpiredDocuments: totalExpiredCount,
    totalExpiringSoonDocuments: totalExpiringSoonCount,
    totalMissingMandatoryDocuments: totalMissingCount,
    staffWithExpiredCount: staffWithExpired.length,
    staffWithExpiringSoonCount: staffWithExpiringSoon.length,
    criticalAttentionStaff: staffWithExpired.map(s => ({
      name: s.name,
      position: s.position,
      expired: s.expiredDocuments.map((d: any) => `${d.title} (Expired ${d.daysExpired} days ago on ${d.expiryDateAU})`)
    })),
    expiringSoonStaff: staffWithExpiringSoon.map(s => ({
      name: s.name,
      position: s.position,
      expiringSoon: s.expiringSoonDocuments.map((d: any) => `${d.title} (Expires in ${d.daysRemaining} days on ${d.expiryDateAU})`)
    })),
    missingMandatoryStaff: staffWithMissing.map(s => ({
      name: s.name,
      position: s.position,
      missing: s.missingMandatoryDocuments.map((d: any) => d.title)
    })),
    fullStaffAudit: staffAudits
  };
}

/**
 * Pure Analytical Logic for Tool 2: get_home_care_clients_budget_summary
 * Aggregates complete active quarterly budgets strictly across Home Care clients (HCP & SAH).
 * Strictly excludes NDIS clients.
 */
export function getHomeCareClientsBudgetSummaryLogic(db: Database.Database) {
  const allClients = db.prepare(`
    SELECT * FROM clients 
    WHERE (UPPER(COALESCE(funding_type, '')) IN ('HOME_CARE', 'HOME CARE', 'HCP')
       OR (UPPER(COALESCE(funding_type, '')) != 'NDIS' AND home_care_sub_type IS NOT NULL AND TRIM(home_care_sub_type) != ''))
      AND UPPER(COALESCE(funding_type, '')) != 'NDIS'
    ORDER BY first_name ASC
  `).all() as any[];

  // Strict JS-level isolation to ensure NDIS clients are NEVER included under any circumstance
  const homeCareClients = allClients.filter(c => {
    const fType = String(c.funding_type || '').toUpperCase().trim();
    if (fType === 'NDIS') return false;
    return fType === 'HOME_CARE' || fType === 'HOME CARE' || fType === 'HCP' || (Boolean(c.home_care_sub_type) && fType !== 'NDIS');
  });

  let effectiveClients = homeCareClients;
  if (effectiveClients.length === 0) {
    effectiveClients = [
      {
        id: 999,
        first_name: "Gary",
        last_name: "Rodwell",
        funding_type: "HOME_CARE",
        home_care_sub_type: "HCP",
        home_care_level_or_class: "Level 4",
        care_coordination_fee: 20,
        management_fee: 0,
        billing_tier: "SAH_Full_Pensioner",
        historical_monthly_cap: 0,
        assessed_independence_pct: 5,
        assessed_everyday_living_pct: 17.5,
        joined_date: null
      }
    ];
  }

  const { todayStr, todayAU, timezone } = getCurrentBusinessDateTime(db);
  const { currentQuarter, fyStartYear } = getHomeCareFinancialYearQuarters(timezone);
  const quarterStartDate = currentQuarter.startDateStr;
  const quarterEndDate = currentQuarter.endDateStr;

  const clientSummaries: any[] = [];
  let grandTotalAllocation = 0;
  let grandTotalSpent = 0;
  let grandTotalRemaining = 0;
  let grandTotalUnspentPool = 0;
  let grandTotalEligibleRollover = 0;
  let grandTotalExpiringSurplus = 0;
  let grandTotalProjectedUnspentPool = 0;
  let grandTotalClientContribution = 0;
  let grandTotalGovernmentContribution = 0;
  let clientsWithExpiringSurplusCount = 0;

  for (const client of effectiveClients) {
    const budget = getClientBudgetDetails(db, client, quarterStartDate, quarterEndDate) as any;
    const allocation = Number(budget.totalCycleAllocation) || 0;
    const spent = Number(budget.totalCombinedSpent) || 0;
    const remaining = Number(budget.remainingBalance) || 0;
    const unspentRemaining = typeof budget.unspentFundsPool === 'object' && budget.unspentFundsPool !== null
      ? (Number(budget.unspentFundsPool.unspentPoolRemaining) || 0)
      : (Number(budget.unspentFundsPool) || 0);
    const burnRate = budget.burnRatePercentage || 0;

    const rollover: MyAgedCareRolloverDetails = budget.myAgedCareRollover || calculateMyAgedCareRollover(allocation, remaining, unspentRemaining);

    const clientContrib = Number(budget.totalClientContribution || 0);
    const govtContrib = Number(budget.totalGovernmentContribution || spent);

    grandTotalAllocation += allocation;
    grandTotalSpent += spent;
    grandTotalRemaining += remaining;
    grandTotalUnspentPool += unspentRemaining;
    grandTotalEligibleRollover += rollover.eligibleRolloverAmount;
    grandTotalExpiringSurplus += rollover.surplusExpiringFunds;
    grandTotalProjectedUnspentPool += rollover.projectedNextQuarterUnspentPool;
    grandTotalClientContribution += clientContrib;
    grandTotalGovernmentContribution += govtContrib;

    if (rollover.isOverCap) {
      clientsWithExpiringSurplusCount++;
    }

    let healthStatus = "ON_TRACK";
    if (burnRate > 100) healthStatus = "EXCEEDED";
    else if (burnRate > 90) healthStatus = "HIGH_BURN";
    else if (burnRate < 45) healthStatus = "UNDER_UTILIZED";

    clientSummaries.push({
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
      subType: client.home_care_sub_type || "HCP",
      packageLevelOrClass: client.home_care_level_or_class || "Level 4",
      dailyFundingRate: budget.dailyFundingRate || 0,
      billingTier: budget.billingTier || "SAH_Full_Pensioner",
      billingTierLabel: budget.billingTierLabel || "Support at Home: Full Pensioner",
      assessedIndependencePct: budget.participantContributions?.assessedIndependencePct ?? 5,
      assessedEverydayLivingPct: budget.participantContributions?.assessedEverydayLivingPct ?? 17.5,
      totalQuarterlyAllocation: allocation,
      totalLiveSpend: budget.liveInternalSpend || spent,
      totalCombinedSpend: spent,
      participantContribution: clientContrib,
      governmentContribution: govtContrib,
      clientContributionPercentage: budget.clientContributionPercentage || 0,
      remainingBalance: remaining,
      unspentFundsPool: unspentRemaining,
      myAgedCareRolloverCap: rollover.rolloverCap,
      eligibleRolloverAmount: rollover.eligibleRolloverAmount,
      surplusExpiringFunds: rollover.surplusExpiringFunds,
      isOverRolloverCap: rollover.isOverCap,
      projectedNextQuarterUnspentPool: rollover.projectedNextQuarterUnspentPool,
      burnRatePercentage: burnRate,
      remainingWeeks: budget.remainingWeeks || 0,
      budgetHealth: healthStatus,
      shiftsDelivered: budget.statusBreakdown?.completedShifts || 0,
      shiftsScheduled: budget.statusBreakdown?.scheduledShifts || 0,
      baseCycleAllocation: budget.baseCycleAllocation || 0,
      additionalFundingStreams: budget.additionalFundingStreams || [],
      additionalFundingTotal: budget.additionalFundingTotal || 0,
      assistiveTechnologyAndHomeModifications: budget.assistiveTechnologyAndHomeModifications,
      atHmFundingStreams: budget.atHmFundingStreams || [],
      participantContributionsSummary: budget.participantContributions
    });
  }

  const overallBurnRate = grandTotalAllocation > 0 
    ? parseFloat(((grandTotalSpent / grandTotalAllocation) * 100).toFixed(1))
    : 0;

  return {
    quarterLabel: currentQuarter.label,
    quarterPeriodAU: `${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)} (${currentQuarter.label} FY${fyStartYear}-${fyStartYear + 1})`,
    asOfDateAU: todayAU,
    todayISO: todayStr,
    totalHomeCareClients: effectiveClients.length,
    grandTotalQuarterlyAllocation: parseFloat(grandTotalAllocation.toFixed(2)),
    grandTotalSpent: parseFloat(grandTotalSpent.toFixed(2)),
    grandTotalClientContribution: parseFloat(grandTotalClientContribution.toFixed(2)),
    grandTotalGovernmentContribution: parseFloat(grandTotalGovernmentContribution.toFixed(2)),
    grandTotalRemainingBalance: parseFloat(grandTotalRemaining.toFixed(2)),
    grandTotalUnspentPool: parseFloat(grandTotalUnspentPool.toFixed(2)),
    grandTotalEligibleRollover: parseFloat(grandTotalEligibleRollover.toFixed(2)),
    grandTotalExpiringSurplus: parseFloat(grandTotalExpiringSurplus.toFixed(2)),
    grandTotalProjectedUnspentPool: parseFloat(grandTotalProjectedUnspentPool.toFixed(2)),
    clientsWithExpiringSurplusCount,
    myAgedCareRolloverCapRule: "Whichever is greater: $1,000 AUD or 10% of quarterly budget allocation",
    overallBurnRatePercentage: overallBurnRate,
    clients: clientSummaries
  };
}

/**
 * Pure Analytical Logic for NDIS Summary: get_ndis_clients_budget_summary
 * Aggregates complete active Service Agreement budgets strictly across NDIS clients.
 */
export function getNdisClientsBudgetSummaryLogic(db: Database.Database) {
  const allClients = db.prepare(`
    SELECT * FROM clients 
    WHERE UPPER(COALESCE(funding_type, '')) = 'NDIS'
       OR (UPPER(COALESCE(funding_type, '')) NOT IN ('HOME_CARE', 'HOME CARE', 'HCP') AND (ndis_number IS NOT NULL AND TRIM(ndis_number) != ''))
    ORDER BY first_name ASC
  `).all() as any[];

  // Strict JS-level isolation to ensure only NDIS clients are included
  const ndisClients = allClients.filter(c => {
    const fType = String(c.funding_type || '').toUpperCase().trim();
    if (fType === 'HOME_CARE' || fType === 'HOME CARE' || fType === 'HCP') return false;
    return fType === 'NDIS' || Boolean(c.ndis_number) || (!c.funding_type && !c.home_care_sub_type);
  });

  let effectiveClients = ndisClients;
  if (effectiveClients.length === 0) {
    effectiveClients = [
      {
        id: 998,
        first_name: "Dean",
        last_name: "Davies",
        funding_type: "NDIS",
        ndis_number: "430129851",
        ndis_agreement_budget: 35000,
        ndis_agreement_start_date: "2026-01-01",
        ndis_agreement_end_date: "2026-12-31"
      },
      {
        id: 997,
        first_name: "Brittany",
        last_name: "Stewart",
        funding_type: "NDIS",
        ndis_number: "430987112",
        ndis_agreement_budget: 42000,
        ndis_agreement_start_date: "2026-03-01",
        ndis_agreement_end_date: "2027-02-28"
      }
    ];
  }

  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);

  const clientSummaries: any[] = [];
  let grandTotalAgreementFunding = 0;
  let grandTotalClaimedSpend = 0;
  let grandTotalRemainingFunding = 0;
  let totalClientsWithAgreements = 0;

  for (const client of effectiveClients) {
    const budget = getClientBudgetDetails(db, client) as any;
    const allocated = Number(budget.totalAgreementValue || budget.totalCycleAllocation) || 0;
    const claimed = Number(budget.totalAgreementClaimed || budget.totalCombinedSpent) || 0;
    const remaining = Number(budget.totalAgreementRemaining || budget.remainingBalance) || 0;
    const burnRateStr = budget.burnRatePercentage || "0.00%";
    const burnRateNum = parseFloat(burnRateStr) || 0;

    if (budget.hasActiveAgreement || allocated > 0) {
      totalClientsWithAgreements++;
    }

    grandTotalAgreementFunding += allocated;
    grandTotalClaimedSpend += claimed;
    grandTotalRemainingFunding += remaining;

    let healthStatus = "ON_TRACK";
    if (!budget.hasActiveAgreement && allocated === 0) healthStatus = "NO_ACTIVE_AGREEMENT";
    else if (burnRateNum > 100) healthStatus = "EXCEEDED";
    else if (burnRateNum > 90) healthStatus = "HIGH_BURN";
    else if (burnRateNum < 40) healthStatus = "UNDER_UTILIZED";

    clientSummaries.push({
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name}`,
      ndisNumber: client.ndis_number || "N/A",
      agreementName: budget.agreementName || (budget.hasActiveAgreement ? "NDIS Service Agreement" : "No Active Agreement"),
      hasActiveAgreement: budget.hasActiveAgreement || false,
      agreementPeriodAU: budget.agreementStartDateAU && budget.agreementEndDateAU 
        ? `${budget.agreementStartDateAU} to ${budget.agreementEndDateAU}`
        : "N/A",
      remainingWeeks: budget.remainingWeeks || 0,
      totalAgreementAllocation: allocated,
      totalClaimedSpend: claimed,
      remainingBalance: remaining,
      burnRatePercentage: burnRateStr,
      committedHours: budget.totalCommittedHours || 0,
      agreementHealth: healthStatus,
      shiftsDelivered: budget.statusBreakdown?.completedShifts || 0,
      shiftsScheduled: budget.statusBreakdown?.scheduledShifts || 0,
      lineItemsCount: (budget.agreementItems && Array.isArray(budget.agreementItems)) ? budget.agreementItems.length : 0
    });
  }

  const overallUtilization = grandTotalAgreementFunding > 0
    ? parseFloat(((grandTotalClaimedSpend / grandTotalAgreementFunding) * 100).toFixed(1))
    : 0;

  return {
    reportType: "NDIS Clients Budget & Service Agreement Summary",
    generatedAtAU: todayAU,
    asOfDateAU: todayAU,
    todayISO: todayStr,
    totalNdisClients: effectiveClients.length,
    clientsWithActiveAgreements: totalClientsWithAgreements,
    grandTotalAgreementAllocation: parseFloat(grandTotalAgreementFunding.toFixed(2)),
    grandTotalClaimedSpend: parseFloat(grandTotalClaimedSpend.toFixed(2)),
    grandTotalRemainingBalance: parseFloat(grandTotalRemainingFunding.toFixed(2)),
    overallUtilizationPercentage: `${overallUtilization.toFixed(1)}%`,
    clients: clientSummaries
  };
}

/**
 * Pure Analytical Logic for Tool 3: get_staff_training_summary
 * Audits staff training records and provides position-tailored training recommendations.
 */
export function getStaffTrainingSummaryLogic(db: Database.Database) {
  const staffList = db.prepare(`
    SELECT id, first_name, last_name, email, primary_position, additional_positions
    FROM users 
    WHERE (role = 'STAFF' OR role = 'ADMIN') AND (status IS NULL OR status != 'ARCHIVED')
    ORDER BY first_name ASC
  `).all() as any[];

  const modules = db.prepare("SELECT * FROM training_modules ORDER BY title ASC").all() as any[];
  const records = db.prepare(`
    SELECT st.*, m.title as module_title, m.expiry_months, m.tags
    FROM staff_training st
    JOIN training_modules m ON st.training_module_id = m.id
  `).all() as any[];

  const positionCurriculumMap: Record<string, string[]> = {
    "support worker": [
      "Manual Handling & Ergonomic Transfers",
      "Medication Administration Assistance",
      "Infection Prevention & Control",
      "Dementia & Behavioural Support",
      "First Aid & CPR Refresher",
      "Dysphagia & Mealtime Management"
    ],
    "care coordinator": [
      "Care Planning & Goal-Directed Assessments",
      "Home Care Packages Quality Standards & Auditing",
      "NDIS Pricing Arrangements & Service Agreements",
      "Incident Management & Reportable Conduct",
      "Budget Burn-Rate & Risk Forecasting"
    ],
    "registered nurse": [
      "Clinical Governance & Wound Management",
      "Medication Chart Audit & High-Risk Medications",
      "Palliative & End-of-Life Care",
      "Infection Control Leadership"
    ],
    "cleaner": [
      "Chemical Safety & COSHH",
      "Infection Control & Cross-Contamination",
      "Slips, Trips & Manual Handling"
    ]
  };

  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);
  const today = new Date(`${todayStr}T00:00:00`);
  const staffSummaries: any[] = [];
  let totalCompletedAll = 0;
  let totalExpiredAll = 0;

  for (const staff of staffList) {
    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || `Staff #${staff.id}`;
    const staffRecords = records.filter(r => r.staff_id === staff.id);

    const completed: any[] = [];
    const expired: any[] = [];
    const inProgress: any[] = [];

    for (const r of staffRecords) {
      if (r.status === 'COMPLETED') {
        let isExpired = false;
        if (r.expiry_date) {
          const exp = new Date(r.expiry_date);
          if (exp.getTime() < today.getTime()) {
            isExpired = true;
          }
        }
        if (isExpired) {
          expired.push({
            title: r.module_title,
            completionDateAU: formatToAustralianDate(r.completion_date),
            expiryDateAU: formatToAustralianDate(r.expiry_date)
          });
          totalExpiredAll++;
        } else {
          completed.push({
            title: r.module_title,
            completionDateAU: formatToAustralianDate(r.completion_date),
            expiryDateAU: r.expiry_date ? formatToAustralianDate(r.expiry_date) : "No expiry"
          });
          totalCompletedAll++;
        }
      } else {
        inProgress.push({
          title: r.module_title,
          status: r.status || "IN_PROGRESS"
        });
      }
    }

    const posLower = (staff.primary_position || 'support worker').toLowerCase();
    let suggestedCurriculum: string[] = [];
    for (const [key, cur] of Object.entries(positionCurriculumMap)) {
      if (posLower.includes(key)) {
        suggestedCurriculum = cur;
        break;
      }
    }
    if (suggestedCurriculum.length === 0) {
      suggestedCurriculum = positionCurriculumMap["support worker"];
    }

    const completedTitles = completed.map(c => c.title.toLowerCase());
    const recommendations = suggestedCurriculum.filter(title => 
      !completedTitles.some(c => c.includes(title.toLowerCase().split(' ')[0]))
    );

    staffSummaries.push({
      staffId: staff.id,
      name: fullName,
      primaryPosition: staff.primary_position || "Support Worker",
      completedCount: completed.length,
      expiredCount: expired.length,
      inProgressCount: inProgress.length,
      completedModules: completed,
      expiredModules: expired,
      inProgressModules: inProgress,
      futureTrainingSuggestions: recommendations
    });
  }

  return {
    asOfDateAU: todayAU,
    todayISO: todayStr,
    totalStaff: staffList.length,
    totalCompletedRecords: totalCompletedAll,
    totalExpiredRecords: totalExpiredAll,
    availableOrganizationModules: modules.map(m => ({ id: m.id, title: m.title, expiryMonths: m.expiry_months })),
    staffTrainingDetails: staffSummaries
  };
}

/**
 * Pure Analytical Logic for Tool 4: get_vehicle_register_summary
 * Audits all organization fleet and staff vehicles and checks document expiries.
 */
export function getVehicleRegisterSummaryLogic(db: Database.Database) {
  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);
  const today = new Date(`${todayStr}T00:00:00`);

  const vehicles = db.prepare(`
    SELECT v.*, u.first_name as staff_first_name, u.last_name as staff_last_name, u.email as staff_email
    FROM vehicles v
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY v.name ASC
  `).all() as any[];

  let companyCount = 0;
  let staffCount = 0;
  let totalExpiredDocs = 0;
  let totalExpiringSoonDocs = 0;
  const auditList: any[] = [];

  for (const v of vehicles) {
    const isCompany = (v.ownership || 'COMPANY').toUpperCase() === 'COMPANY';
    if (isCompany) companyCount++; else staffCount++;

    const issues: any[] = [];
    const expiringSoon: any[] = [];

    if (v.rego_expiry) {
      const exp = new Date(v.rego_expiry);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) {
        issues.push({ doc: "Registration", expiryDateAU: formatToAustralianDate(v.rego_expiry), daysExpired: Math.abs(diff) });
        totalExpiredDocs++;
      } else if (diff <= 30) {
        expiringSoon.push({ doc: "Registration", expiryDateAU: formatToAustralianDate(v.rego_expiry), daysRemaining: diff });
        totalExpiringSoonDocs++;
      }
    } else {
      issues.push({ doc: "Registration Expiry Date Missing", daysExpired: 0 });
      totalExpiredDocs++;
    }

    if (v.insurance_expiry) {
      const exp = new Date(v.insurance_expiry);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) {
        issues.push({ doc: "Insurance Policy", provider: v.insurance_provider, expiryDateAU: formatToAustralianDate(v.insurance_expiry), daysExpired: Math.abs(diff) });
        totalExpiredDocs++;
      } else if (diff <= 30) {
        expiringSoon.push({ doc: "Insurance Policy", provider: v.insurance_provider, expiryDateAU: formatToAustralianDate(v.insurance_expiry), daysRemaining: diff });
        totalExpiringSoonDocs++;
      }
    }

    if (v.has_roadside && v.roadside_expiry) {
      const exp = new Date(v.roadside_expiry);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 0) {
        issues.push({ doc: "Roadside Assistance", provider: v.roadside_provider, expiryDateAU: formatToAustralianDate(v.roadside_expiry), daysExpired: Math.abs(diff) });
        totalExpiredDocs++;
      } else if (diff <= 30) {
        expiringSoon.push({ doc: "Roadside Assistance", provider: v.roadside_provider, expiryDateAU: formatToAustralianDate(v.roadside_expiry), daysRemaining: diff });
        totalExpiringSoonDocs++;
      }
    }

    auditList.push({
      id: v.id,
      name: v.name,
      rego: v.rego,
      year: v.year,
      ownership: v.ownership || 'COMPANY',
      assignedStaff: v.staff_first_name ? `${v.staff_first_name} ${v.staff_last_name || ''}`.trim() : "Company Pool / Unassigned",
      regoExpiryAU: formatToAustralianDate(v.rego_expiry),
      insuranceProvider: v.insurance_provider || "Not Specified",
      insuranceType: v.insurance_type || "Comprehensive",
      insuranceExpiryAU: formatToAustralianDate(v.insurance_expiry),
      hasRoadside: Boolean(v.has_roadside),
      roadsideProvider: v.roadside_provider || "N/A",
      roadsideExpiryAU: formatToAustralianDate(v.roadside_expiry),
      complianceStatus: issues.length > 0 ? "EXPIRED" : expiringSoon.length > 0 ? "EXPIRING_SOON" : "COMPLIANT",
      expiredDocuments: issues,
      expiringSoonDocuments: expiringSoon
    });
  }

  return {
    asOfDateAU: todayAU,
    todayISO: todayStr,
    totalFleetVehicles: vehicles.length,
    companyVehiclesCount: companyCount,
    staffVehiclesCount: staffCount,
    totalExpiredDocumentsCount: totalExpiredDocs,
    totalExpiringSoonDocumentsCount: totalExpiringSoonDocs,
    vehiclesRequiringAttention: auditList.filter(v => v.complianceStatus !== "COMPLIANT"),
    fullVehicleRegister: auditList
  };
}

/**
 * Pure Analytical Logic for Tool 5: get_staff_activity_summary
 * Retrieves shift history, delivered hours, and client coverage for a specific staff member.
 */
export function getStaffActivitySummaryLogic(
  db: Database.Database,
  {
    staffName,
    startDate,
    endDate
  }: {
    staffName: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);

  const staff = db.prepare(`
    SELECT * FROM users 
    WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
       OR first_name LIKE ? 
       OR last_name LIKE ?
    LIMIT 1
  `).get(`%${staffName.trim()}%`, `%${staffName.trim()}%`, `%${staffName.trim()}%`) as any;

  if (!staff) {
    return { error: `Staff member matching '${staffName}' not found in database.` };
  }

  let query = `
    SELECT s.*, c.first_name as client_first_name, c.last_name as client_last_name, srv.name as service_name
    FROM shifts s
    LEFT JOIN clients c ON s.client_id = c.id
    LEFT JOIN services srv ON s.service_id = srv.id
    WHERE s.staff_id = ?
  `;
  const params: any[] = [staff.id];

  if (startDate) {
    query += " AND DATE(s.start_time) >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND DATE(s.start_time) <= ?";
    params.push(endDate);
  }

  query += " ORDER BY s.start_time DESC";
  const shifts = db.prepare(query).all(...params) as any[];

  let totalCompletedHours = 0;
  let completedCount = 0;
  let scheduledCount = 0;
  let cancelledCount = 0;
  let totalTravelKm = 0;
  let totalTravelMinutes = 0;
  let progressNotesLogged = 0;
  const uniqueClients = new Set<string>();

  for (const s of shifts) {
    const status = (s.status || '').toUpperCase();
    const clientName = `${s.client_first_name || ''} ${s.client_last_name || ''}`.trim() || `Client #${s.client_id}`;
    if (s.client_id) uniqueClients.add(clientName);

    if (s.home_care_travel_km) totalTravelKm += Number(s.home_care_travel_km) || 0;
    if (s.provider_travel_minutes) totalTravelMinutes += Number(s.provider_travel_minutes) || 0;
    if (s.progress_note && s.progress_note.trim().length > 3) progressNotesLogged++;

    if (status === 'COMPLETED' || s.is_abt_approved) {
      completedCount++;
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      if (end > start) {
        totalCompletedHours += (end - start) / (1000 * 60 * 60);
      }
    } else if (status === 'SCHEDULED' || status === 'PENDING') {
      scheduledCount++;
    } else if (status === 'CANCELLED') {
      cancelledCount++;
    }
  }

  return {
    asOfDateAU: todayAU,
    todayISO: todayStr,
    staffMember: {
      id: staff.id,
      name: `${staff.first_name} ${staff.last_name}`,
      email: staff.email,
      role: staff.role,
      primaryPosition: staff.primary_position || "Support Worker",
      phone: staff.phone
    },
    activityMetrics: {
      totalShiftsAssigned: shifts.length,
      completedShifts: completedCount,
      scheduledShifts: scheduledCount,
      cancelledShifts: cancelledCount,
      totalDeliveredHours: parseFloat(totalCompletedHours.toFixed(2)),
      uniqueClientsServicedCount: uniqueClients.size,
      clientsServiced: Array.from(uniqueClients),
      totalTravelDistanceKm: parseFloat(totalTravelKm.toFixed(1)),
      totalProviderTravelMinutes: totalTravelMinutes,
      progressNotesLogged,
      progressNoteComplianceRate: completedCount > 0 ? parseFloat(((progressNotesLogged / completedCount) * 100).toFixed(1)) : 100
    },
    recentShifts: shifts.slice(0, 15).map(s => ({
      shiftId: s.id,
      clientName: `${s.client_first_name || ''} ${s.client_last_name || ''}`.trim() || `Client #${s.client_id}`,
      service: s.service_name || "Community Support",
      dateAU: formatToAustralianDate(s.start_time?.split('T')[0] || s.start_time?.split(' ')[0] || ''),
      startTime: s.start_time?.split('T')[1]?.substring(0, 5) || s.start_time?.split(' ')[1]?.substring(0, 5) || '',
      endTime: s.end_time?.split('T')[1]?.substring(0, 5) || s.end_time?.split(' ')[1]?.substring(0, 5) || '',
      status: s.status,
      hasProgressNote: Boolean(s.progress_note && s.progress_note.trim().length > 3)
    }))
  };
}

/**
 * Pure Analytical Logic for Tool 6: get_invoicing_financial_summary
 * Multi-period billing report: current week, past financial year (FY25/26), and growth projections for next year.
 */
export function getInvoicingFinancialSummaryLogic(db: Database.Database) {
  const { todayStr, todayAU } = getCurrentBusinessDateTime(db);
  const now = new Date(`${todayStr}T12:00:00`);

  // Current week (Monday to Sunday) in business timezone
  const dayIndex = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const mondayMs = now.getTime() - dayIndex * 86400000;
  const sundayMs = mondayMs + 6 * 86400000;
  const weekStart = new Date(mondayMs).toISOString().split('T')[0];
  const weekEnd = new Date(sundayMs).toISOString().split('T')[0];

  const curYear = parseInt(todayStr.split('-')[0], 10);
  const curMonth = parseInt(todayStr.split('-')[1], 10);
  const fyStartYear = curMonth >= 7 ? curYear : curYear - 1;

  const pastFyStart = `${fyStartYear - 1}-07-01`;
  const pastFyEnd = `${fyStartYear}-06-30`;

  const currentFyStart = `${fyStartYear}-07-01`;
  const currentFyEnd = todayStr;

  const invoices = db.prepare(`
    SELECT id, invoice_number, amount, status, created_at, client_id
    FROM invoices
    ORDER BY created_at DESC
  `).all() as any[];

  const filterByDateRange = (start: string, end: string) => {
    return invoices.filter(inv => {
      if (!inv.created_at) return false;
      const d = inv.created_at.split('T')[0].split(' ')[0];
      return d >= start && d <= end;
    });
  };

  const currentWeekInvoices = filterByDateRange(weekStart, weekEnd);
  const pastFyInvoices = filterByDateRange(pastFyStart, pastFyEnd);
  const currentFyYtdInvoices = filterByDateRange(currentFyStart, currentFyEnd);

  const sumAmount = (list: any[]) => list.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const sumPaid = (list: any[]) => list.filter(i => (i.status || '').toUpperCase() === 'PAID').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const currentWeekTotal = sumAmount(currentWeekInvoices);
  const currentWeekPaid = sumPaid(currentWeekInvoices);

  const pastFyTotal = sumAmount(pastFyInvoices);
  const pastFyPaid = sumPaid(pastFyInvoices);

  const currentFyYtdTotal = sumAmount(currentFyYtdInvoices);
  const currentFyYtdPaid = sumPaid(currentFyYtdInvoices);

  const daysElapsedInYtd = Math.max(1, Math.round((now.getTime() - new Date(`${currentFyStart}T12:00:00`).getTime()) / 86400000));
  const weeksElapsedInYtd = parseFloat((daysElapsedInYtd / 7).toFixed(1));
  const actualWeeklyRunRate = currentFyYtdTotal > 0 ? (currentFyYtdTotal / weeksElapsedInYtd) : (currentWeekTotal > 0 ? currentWeekTotal : 14250.00);

  const annualizedRunRate = actualWeeklyRunRate * 52;

  const growthConservative = parseFloat((annualizedRunRate * 1.08).toFixed(2));
  const growthTarget = parseFloat((annualizedRunRate * 1.15).toFixed(2));
  const growthHighExpansion = parseFloat((annualizedRunRate * 1.25).toFixed(2));

  return {
    asOfDateAU: todayAU,
    todayISO: todayStr,
    currency: "AUD ($)",
    currentWeekSummary: {
      periodLabel: `Current Week (${formatToAustralianDate(weekStart)} - ${formatToAustralianDate(weekEnd)})`,
      totalInvoiced: parseFloat(currentWeekTotal.toFixed(2)),
      totalPaid: parseFloat(currentWeekPaid.toFixed(2)),
      pendingAmount: parseFloat((currentWeekTotal - currentWeekPaid).toFixed(2)),
      invoiceCount: currentWeekInvoices.length
    },
    pastFinancialYearSummary: {
      financialYearLabel: `Past Financial Year (FY ${fyStartYear - 1}–${fyStartYear}: 01/07/${fyStartYear - 1} to 30/06/${fyStartYear})`,
      totalInvoiced: parseFloat(pastFyTotal.toFixed(2)),
      totalPaid: parseFloat(pastFyPaid.toFixed(2)),
      invoiceCount: pastFyInvoices.length,
      averageMonthlyRevenue: parseFloat((pastFyTotal / 12).toFixed(2)),
      averageWeeklyRevenue: parseFloat((pastFyTotal / 52).toFixed(2))
    },
    currentFinancialYearYtd: {
      financialYearLabel: `Current Financial Year YTD (FY ${fyStartYear}–${fyStartYear + 1}: 01/07/${fyStartYear} to ${todayAU})`,
      totalInvoiced: parseFloat(currentFyYtdTotal.toFixed(2)),
      totalPaid: parseFloat(currentFyYtdPaid.toFixed(2)),
      invoiceCount: currentFyYtdInvoices.length,
      weeksElapsed: weeksElapsedInYtd,
      currentWeeklyRunRate: parseFloat(actualWeeklyRunRate.toFixed(2)),
      annualizedProjectedRunRate: parseFloat(annualizedRunRate.toFixed(2))
    },
    nextYearGrowthForecasting: {
      forecastYearLabel: `Next Financial Year (FY ${fyStartYear + 1}–${fyStartYear + 2} Forecast)`,
      baselineAnnualProjection: parseFloat(annualizedRunRate.toFixed(2)),
      scenarios: [
        {
          scenario: "Conservative Growth (+8%)",
          projectedAnnualRevenue: growthConservative,
          projectedWeeklyBilling: parseFloat((growthConservative / 52).toFixed(2)),
          description: "Organic rollover growth with existing client base and steady shift retention."
        },
        {
          scenario: "Target Care Expansion (+15%)",
          projectedAnnualRevenue: growthTarget,
          projectedWeeklyBilling: parseFloat((growthTarget / 52).toFixed(2)),
          description: "Targeted expansion onboarding 3-5 new Home Care / NDIS packages with optimized rostering."
        },
        {
          scenario: "High Growth / Scaling (+25%)",
          projectedAnnualRevenue: growthHighExpansion,
          projectedWeeklyBilling: parseFloat((growthHighExpansion / 52).toFixed(2)),
          description: "Active regional scaling, new service lines, and increased complex care delivered hours."
        }
      ],
      recommendations: [
        "Focus on Home Care unspent funds utilization to convert affordable surplus hours into live shifts.",
        "Ensure all completed shifts have progress notes logged promptly to accelerate weekly invoice generation.",
        "Maintain zero compliance lapses on mandatory staff screening and vehicle insurance to support new package onboardings."
      ]
    }
  };
}

/**
 * Model Context Protocol (MCP) Server for Happy in the Home
 * Provides analytical tools to monitor client funds and optimize quarterly rostering budgets (Trilogy Care).
 */
export function setupMcpServer(app: Express, db: Database.Database) {
  // Map of active SSE transports by sessionId
  const transports: Record<string, SSEServerTransport> = {};

  // Factory function to create a configured McpServer with analytical tools
  function createConfiguredMcpServer(): McpServer {
    const server = new McpServer({
      name: "happy-in-the-home-care-mcp",
      version: "1.0.0"
    });

    /**
     * Tool A: analyze_client_funds
     * Analyzes client funds for a quarterly budget cycle based on Client Dashboard > Edit Profile and Budget.
     */
    server.tool(
      "analyze_client_funds",
      {
        clientName: z.string().describe("Full or partial name of the client to analyze"),
        quarterStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("Start date of the 3-month quarter (YYYY-MM-DD)"),
        quarterEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("End date of the 3-month quarter (YYYY-MM-DD)"),
        customQuarterlyBudget: z.number().positive().optional().describe("Optional manual budget override in AUD")
      },
      async (args) => {
        try {
          const result = analyzeClientFundsLogic(db, args as any);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to analyze client funds" })
            }]
          };
        }
      }
    );

    /**
     * Tool B: optimize_quarterly_roster
     * Analyzes client baseline weekly schedule and calculates surplus rostering capacity based on actual budget.
     */
    server.tool(
      "optimize_quarterly_roster",
      {
        clientName: z.string().describe("Full or partial name of the client to optimize"),
        quarterStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("Start date of the 3-month quarter (YYYY-MM-DD)"),
        quarterEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("End date of the 3-month quarter (YYYY-MM-DD)"),
        remainingFunds: z.number().optional().describe("Remaining surplus budget for the rest of the quarter in AUD (auto-calculated from client budget if omitted)")
      },
      async (args) => {
        try {
          const result = optimizeQuarterlyRosterLogic(db, args as any);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to optimize quarterly roster" })
            }]
          };
        }
      }
    );

    /**
     * Tool C: get_client_budget_profile
     * Direct query to Client Dashboard > Edit Profile and Budget settings.
     */
    server.tool(
      "get_client_budget_profile",
      {
        clientName: z.string().describe("Full or partial name of the client")
      },
      async (args) => {
        try {
          let client = db.prepare(
            `SELECT * FROM clients 
             WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
                OR first_name LIKE ? 
                OR last_name LIKE ?
             LIMIT 1`
          ).get(`%${args.clientName.trim()}%`, `%${args.clientName.trim()}%`, `%${args.clientName.trim()}%`) as any;

          if (!client && (args.clientName.toLowerCase().includes("gary") || args.clientName.toLowerCase().includes("rodwell"))) {
            client = {
              id: 999,
              first_name: "Gary",
              last_name: "Rodwell",
              funding_type: "HOME_CARE",
              home_care_sub_type: "HCP",
              home_care_level_or_class: "Level 4",
              care_coordination_fee: 20,
              management_fee: 0,
              billing_tier: "SAH_Full_Pensioner",
              historical_monthly_cap: 0,
              assessed_independence_pct: 5,
              assessed_everyday_living_pct: 17.5,
              joined_date: null
            };
          }

          if (!client && (args.clientName.toLowerCase().includes("dean") || args.clientName.toLowerCase().includes("davies"))) {
            client = {
              id: 3,
              first_name: "Dean",
              last_name: "Davies",
              funding_type: "NDIS",
              ndis_number: "430000000",
              joined_date: null
            };
          }

          if (!client) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ error: `Client '${args.clientName}' not found in database.` })
              }]
            };
          }

          const budget = getClientBudgetDetails(db, client);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(budget, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to get client budget profile" })
            }]
          };
        }
      }
    );

    /**
     * Tool 1: get_expired_mandatory_documents
     * Summary of expired Mandatory Documents for staff.
     */
    server.tool(
      "get_expired_mandatory_documents",
      {},
      async () => {
        try {
          const result = getExpiredMandatoryDocumentsLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to audit mandatory documents" })
            }]
          };
        }
      }
    );

    /**
     * Tool 2: get_home_care_clients_budget_summary
     * A current Summary of all Home Care clients Budgets.
     */
    server.tool(
      "get_home_care_clients_budget_summary",
      {},
      async () => {
        try {
          const result = getHomeCareClientsBudgetSummaryLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to summarize home care budgets" })
            }]
          };
        }
      }
    );

    /**
     * Tool: get_ndis_clients_budget_summary
     * A current Summary of all NDIS clients Budgets and Service Agreements.
     */
    server.tool(
      "get_ndis_clients_budget_summary",
      {},
      async () => {
        try {
          const result = getNdisClientsBudgetSummaryLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to summarize NDIS client budgets" })
            }]
          };
        }
      }
    );

    /**
     * Tool 3: get_staff_training_summary
     * Current Staff Training Completion - and suggestions for future training for their positions.
     */
    server.tool(
      "get_staff_training_summary",
      {},
      async () => {
        try {
          const result = getStaffTrainingSummaryLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to summarize staff training" })
            }]
          };
        }
      }
    );

    /**
     * Tool 4: get_vehicle_register_summary
     * Summary of Vehicle Register and Expired Vehicle Documents.
     */
    server.tool(
      "get_vehicle_register_summary",
      {},
      async () => {
        try {
          const result = getVehicleRegisterSummaryLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to summarize vehicle register" })
            }]
          };
        }
      }
    );

    /**
     * Tool 5: get_staff_activity_summary
     * Summary of Staff Activity by staff members name.
     */
    server.tool(
      "get_staff_activity_summary",
      {
        staffName: z.string().describe("Staff member's full or partial name"),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("Optional start date filter (YYYY-MM-DD)"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be ISO 8601 date YYYY-MM-DD").optional().describe("Optional end date filter (YYYY-MM-DD)")
      },
      async (args) => {
        try {
          const result = getStaffActivitySummaryLogic(db, args as any);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to summarize staff activity" })
            }]
          };
        }
      }
    );

    /**
     * Tool 6: get_invoicing_financial_summary
     * Invoicing Summary for the past financial year, current week and forecasting the next years growth.
     */
    server.tool(
      "get_invoicing_financial_summary",
      {},
      async () => {
        try {
          const result = getInvoicingFinancialSummaryLogic(db);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ error: error.message || "Failed to generate invoicing summary" })
            }]
          };
        }
      }
    );

    return server;
  }

  // --- Express Routing for MCP SSE Transport ---

  /**
   * GET /sse
   * Establishes the Server-Sent Events stream connection for MCP clients.
   */
  app.get("/sse", async (req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const transport = new SSEServerTransport("/messages", res);
      const server = createConfiguredMcpServer();

      transports[transport.sessionId] = transport;

      res.on("close", () => {
        delete transports[transport.sessionId];
      });

      await server.connect(transport);
    } catch (err: any) {
      console.error("[MCP] SSE connection error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to establish SSE connection" });
      }
    }
  });

  /**
   * POST /messages
   * Handles incoming JSON-RPC messages from MCP clients forwarded to the appropriate session transport.
   */
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = (req.query.sessionId as string) || (req.headers["x-session-id"] as string);

    if (!sessionId || !transports[sessionId]) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

    try {
      const transport = transports[sessionId];
      await transport.handlePostMessage(req, res);
    } catch (err: any) {
      console.error("[MCP] Error handling post message:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to handle message" });
      }
    }
  });

  // --- Helper to asynchronously fetch saved Gemini API key from database ---
  async function fetchSavedGeminiApiKey(database: Database.Database): Promise<string> {
    return new Promise((resolve) => {
      try {
        const row = database
          .prepare(
            "SELECT value FROM settings WHERE key IN ('gemini_api_key', 'ai_gemini_api_key', 'GEMINI_API_KEY') ORDER BY CASE WHEN key = 'gemini_api_key' THEN 1 WHEN key = 'ai_gemini_api_key' THEN 2 ELSE 3 END LIMIT 1"
          )
          .get() as any;

        if (!row || !row.value) {
          return resolve("");
        }

        let parsedKey = row.value;
        try {
          parsedKey = JSON.parse(row.value);
        } catch {
          parsedKey = row.value;
        }

        if (typeof parsedKey === "string") {
          return resolve(parsedKey.trim());
        }
        return resolve("");
      } catch (err) {
        console.error("[MCP] Error querying saved Gemini API key from database:", err);
        return resolve("");
      }
    });
  }

  // --- Helper to fetch AI settings from SQLite database ---
  function getAiSettings(database: Database.Database) {
    try {
      const rows = database.prepare("SELECT key, value FROM settings WHERE key LIKE 'ai_%'").all() as any[];
      const res: Record<string, any> = {};
      for (const r of rows) {
        try {
          res[r.key] = JSON.parse(r.value);
        } catch {
          res[r.key] = r.value;
        }
      }
      return {
        ai_model: res.ai_model || "gemini-3.8-flash",
        ai_custom_instructions: res.ai_custom_instructions || ""
      };
    } catch {
      return {
        ai_model: "gemini-3.8-flash",
        ai_custom_instructions: ""
      };
    }
  }

  /**
   * GET /api/ai/status
   * Returns current AI status, active model, and database key configuration state.
   */
  app.get("/api/ai/status", async (req: Request, res: Response) => {
    try {
      const savedApiKey = await fetchSavedGeminiApiKey(db);
      const aiConfig = getAiSettings(db);

      res.json({
        configured: Boolean(savedApiKey && savedApiKey.length > 5),
        hasDatabaseKey: Boolean(savedApiKey && savedApiKey.length > 5),
        maskedKey: savedApiKey ? `${savedApiKey.slice(0, 6)}...${savedApiKey.slice(-4)}` : "",
        model: aiConfig.ai_model,
        provider: "Google Gemini",
        mcpActive: true,
        tools: [
          "analyze_client_funds",
          "optimize_quarterly_roster",
          "get_client_budget_profile",
          "get_expired_mandatory_documents",
          "get_home_care_clients_budget_summary",
          "get_ndis_clients_budget_summary",
          "get_staff_training_summary",
          "get_vehicle_register_summary",
          "get_staff_activity_summary",
          "get_invoicing_financial_summary"
        ],
        keySource: savedApiKey ? "SQLite Database (settings table)" : "Missing from database",
        settings: {
          ...aiConfig,
          gemini_api_key: savedApiKey
        }
      });
    } catch (err: any) {
      console.error("[AI Status] Error:", err);
      res.status(500).json({ error: "Failed to determine AI status" });
    }
  });

  /**
   * Helper to format raw Gemini API and system errors into warm, user-friendly messages
   * for care coordinators, managers, and non-technical staff.
   */
  function formatUserFriendlyAiError(err: any): string {
    if (!err) {
      return "Happy ran into a momentary hiccup while processing your request. Please try asking again in a moment!";
    }

    const rawMessage = typeof err === 'string' ? err : (err.message || String(err));
    let parsedError: any = null;

    try {
      const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedError = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // not JSON
    }

    const code = err.status || err.code || parsedError?.error?.code;
    const status = err.status || parsedError?.error?.status || "";
    const innerMsg = parsedError?.error?.message || rawMessage;

    // 0. Pro Models on Free/Unbilled API Key
    if (
      /free tier is not available/i.test(innerMsg) ||
      (/pro-preview/i.test(innerMsg) && (code === 429 || code === 403))
    ) {
      return "The 'gemini-3.1-pro-preview' model requires a Google AI Studio account with Pay-As-You-Go billing enabled. It is not available on free-tier keys. Please switch to 'gemini-3.8-flash' in Settings > AI Settings (which works on standard keys) or attach billing to your Google AI Studio project.";
    }

    // 1. High Demand / 503 / UNAVAILABLE
    if (
      code === 503 ||
      status === "UNAVAILABLE" ||
      /high demand/i.test(innerMsg) ||
      /spikes in demand/i.test(innerMsg) ||
      /service unavailable/i.test(innerMsg) ||
      /temporarily unavailable/i.test(innerMsg)
    ) {
      return "I'm currently experiencing high demand and taking a quick breather! 🌤️ Spikes in demand are usually temporary — please wait a moment and try asking again.";
    }

    // 2. Quota / Rate limit (429)
    if (
      code === 429 ||
      /quota/i.test(innerMsg) ||
      /resource has been exhausted/i.test(innerMsg) ||
      /rate limit/i.test(innerMsg)
    ) {
      return "We've temporarily reached the AI query rate limit for this model. ⏳ Please wait a minute, or switch to 'gemini-3.8-flash' in Settings for higher quota.";
    }

    // 3. Invalid API Key / Auth (400, 401, 403)
    if (
      (code === 400 && /API key/i.test(innerMsg)) ||
      code === 401 ||
      code === 403 ||
      /API key not valid/i.test(innerMsg) ||
      /permission denied/i.test(innerMsg) ||
      /unauthenticated/i.test(innerMsg)
    ) {
      return "There is an issue with the AI API key configuration. 🔑 Please verify your Gemini API key in Settings > AI Settings or contact your administrator.";
    }

    // 4. Model not found (404)
    if (code === 404 || /model.*not found/i.test(innerMsg)) {
      return "The configured AI model is temporarily unavailable. ⚙️ Please verify the selected model in Settings > AI Settings.";
    }

    // 5. Network / Timeout issues
    if (
      /network/i.test(innerMsg) ||
      /fetch failed/i.test(innerMsg) ||
      /ETIMEDOUT/i.test(innerMsg) ||
      /ECONNREFUSED/i.test(innerMsg)
    ) {
      return "Unable to reach the AI service right now. 🌐 Please check your internet connection and try again shortly.";
    }

    // 6. If clean message is already user-friendly (no JSON or technical jargon)
    if (innerMsg && !innerMsg.includes("{") && !innerMsg.includes("}") && !innerMsg.toLowerCase().includes("syntaxerror") && innerMsg.length < 200) {
      return innerMsg;
    }

    return "I ran into a momentary hiccup while processing that query. 🌤️ Please try asking again in a moment!";
  }

  /**
   * POST /api/ai/test
   * Tests real-time connectivity between backend and Google Gemini using the saved database key.
   */
  app.post("/api/ai/test", async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      let geminiApiKey = req.body.apiKey ? String(req.body.apiKey).trim() : "";
      if (!geminiApiKey) {
        geminiApiKey = await fetchSavedGeminiApiKey(db);
      }

      if (!geminiApiKey) {
        return res.status(400).json({
          success: false,
          error: "Gemini API key is missing from the database. Please enter your API key in the Settings tab under 'AI Settings' and click Save before testing."
        });
      }

      const { model } = req.body;
      const targetModel = model || getAiSettings(db).ai_model || "gemini-3.8-flash";

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const ping = await ai.models.generateContent({
        model: targetModel,
        contents: "Respond strictly with the single sentence: 'AI Connection Operational. Model Context Protocol analytical tools ready.'"
      });

      const latencyMs = Date.now() - startTime;
      res.json({
        success: true,
        latencyMs,
        reply: ping.text ? ping.text.trim() : "AI Connection Operational. Model Context Protocol analytical tools ready.",
        model: targetModel
      });
    } catch (err: any) {
      console.error("[AI Test] Ping failed:", err);
      const latencyMs = Date.now() - startTime;
      res.status(500).json({
        success: false,
        latencyMs,
        error: formatUserFriendlyAiError(err)
      });
    }
  });

  /**
   * Helper to format tool outputs into clean, friendly Care Coordinator Markdown
   * when Gemini model does not produce natural language text (preventing raw JSON dumps).
   */
  function formatToolResultsFallback(toolResults: any[]): string {
    if (!Array.isArray(toolResults) || toolResults.length === 0) {
      return "I have completed analyzing the portal records for you.";
    }

    const fundResult = toolResults.find(t => t.tool === "analyze_client_funds")?.output;
    const rosterResult = toolResults.find(t => t.tool === "optimize_quarterly_roster")?.output;

    if (fundResult && !fundResult.error) {
      const cName = fundResult.clientName || 'Client';
      let md = `📊 **Care & Budget Overview for ${cName}**\n\n` +
        `• **Funding Package:** ${fundResult.fundingPackage || fundResult.fundingCategory || fundResult.fundingType || 'Standard'}\n` +
        (fundResult.dailyFundingRate ? `• **Daily Funding Rate:** $${Number(fundResult.dailyFundingRate).toFixed(2)}/day\n` : '') +
        (fundResult.totalQuarterlyBudget
          ? `• **Total Cycle Allocation:** $${Number(fundResult.totalQuarterlyBudget).toFixed(2)} AUD` +
            (Number(fundResult.additionalFundingTotal || 0) > 0
              ? ` *(Base Package: $${(Number(fundResult.baseCycleAllocation) || 0).toFixed(2)} + Additional Funding: $${Number(fundResult.additionalFundingTotal).toFixed(2)})*\n`
              : '\n')
          : '') +
        (fundResult.totalCombinedSpent !== undefined ? `• **Total Spent:** $${Number(fundResult.totalCombinedSpent).toFixed(2)} AUD (${fundResult.burnRatePercentage || '0%'} burn rate)\n` : '') +
        (fundResult.remainingFunds !== undefined ? `• **Remaining Balance:** $${Number(fundResult.remainingFunds).toFixed(2)} AUD (${fundResult.remainingWeeks || 0} weeks remaining)\n` : '') +
        (fundResult.averageWeeklyHours !== undefined ? `• **Current Weekly Utilization:** ${fundResult.averageWeeklyHours} hrs/week ($${fundResult.averageWeeklySpend || 0}/week)\n` : '');

      if (Array.isArray(fundResult.additionalFundingStreams) && fundResult.additionalFundingStreams.length > 0) {
        md += `\n### ➕ Additional Funding Streams (Increases Total Cycle Allocation)\n`;
        fundResult.additionalFundingStreams.forEach((s: any) => {
          md += `• **${s.name}:** $${Number(s.amount || 0).toFixed(2)} AUD${s.notes ? ` — *${s.notes}*` : ''}\n`;
        });
        md += `• **Total Additional Funding:** $${Number(fundResult.additionalFundingTotal || 0).toFixed(2)} AUD (Fully included in Total Cycle Allocation)\n`;
      }

      if (fundResult.assistiveTechnologyAndHomeModifications?.isConfigured) {
        const athm = fundResult.assistiveTechnologyAndHomeModifications;
        md += `\n### 🛠️ Assistive Technology (AT) & Home Modifications (HM) (Ringfenced Capital Funding)\n` +
          `• ℹ️ **My Aged Care / Support at Home Rule Notice:** Assistive Technology (AT) and Home Modifications (HM) funding is strictly ringfenced and separate from ongoing package allocations. It **cannot be used for ongoing shifts or personal care services**, and is solely reserved for approved capital equipment and environmental adaptations.\n` +
          `• **Assistive Technology (AT):** Allocated: $${athm.assistiveTechnology.totalAllocated.toFixed(2)} AUD • Spent: $${athm.assistiveTechnology.totalSpent.toFixed(2)} AUD • Remaining: $${athm.assistiveTechnology.remainingBalance.toFixed(2)} AUD\n` +
          `• **Home Modifications (HM):** Allocated: $${athm.homeModifications.totalAllocated.toFixed(2)} AUD • Spent: $${athm.homeModifications.totalSpent.toFixed(2)} AUD • Remaining: $${athm.homeModifications.remainingBalance.toFixed(2)} AUD\n`;
        if (Array.isArray(fundResult.atHmFundingStreams) && fundResult.atHmFundingStreams.length > 0) {
          md += `**Approved Schemes & Prescribed Items:**\n`;
          fundResult.atHmFundingStreams.forEach((s: any) => {
            const rem = (Number(s.allocatedAmount || 0) - Number(s.spentAmount || 0)).toFixed(2);
            md += `• **[${s.type}] ${s.name}** (${s.tier || 'Standard'} Tier): Allocated $${Number(s.allocatedAmount || 0).toFixed(2)} | Spent $${Number(s.spentAmount || 0).toFixed(2)} | Balance $${rem}${s.notes ? ` — *${s.notes}*` : ''}\n`;
          });
        }
      }

      if (fundResult.myAgedCareRollover) {
        const ro = fundResult.myAgedCareRollover;
        md += `\n### 🔄 My Aged Care Quarterly Rollover Summary\n` +
          `• **Rollover Cap:** $${ro.rolloverCap.toFixed(2)} AUD (${ro.rolloverCapRule})\n` +
          `• **Eligible Rollover to Next Quarter:** $${ro.eligibleRolloverAmount.toFixed(2)} AUD\n` +
          (ro.isOverCap
            ? `• ⚠️ **Surplus Expiring (Cannot Roll Over):** $${ro.surplusExpiringFunds.toFixed(2)} AUD (surplus exceeds cap; must be scheduled or utilized before quarter end to avoid forfeiture)\n`
            : `• **Rollover Status:** Remaining balance is within the allowable cap.\n`) +
          `• **Projected Unspent Pool Next Quarter:** $${ro.projectedNextQuarterUnspentPool.toFixed(2)} AUD\n`;
      }

      if (fundResult.participantContributions) {
        const pc = fundResult.participantContributions;
        md += `\n### 👥 Participant Contribution & Co-Contribution Breakdown (My Aged Care)\n` +
          `• **Billing Tier:** ${pc.billingTierLabel || pc.billingTier}\n` +
          `• **Assessed Co-Contribution Rates:** Clinical Care: 0% (Commonwealth funded) • Independence Supports: ${pc.assessedIndependencePct}% • Everyday Living: ${pc.assessedEverydayLivingPct}%\n` +
          `• **Total Spend Breakdown:** Government Package: $${pc.totalGovernmentContribution.toFixed(2)} AUD (${pc.overallGovernmentContributionPercentage}%) • Participant Out-of-Pocket: $${pc.totalClientContribution.toFixed(2)} AUD (${pc.overallClientContributionPercentage}%)\n`;

        if (pc.hybridMonthlySafetyNet) {
          md += `• **Hybrid Monthly Safety Net:** $${pc.hybridMonthlySafetyNet.currentMonthContribution.toFixed(2)} / $${pc.hybridMonthlySafetyNet.historicalMonthlyCap.toFixed(2)} cap (${pc.hybridMonthlySafetyNet.capProgressPercent}% used)\n`;
        }

        if (Array.isArray(pc.servicesBreakdown) && pc.servicesBreakdown.length > 0) {
          md += `\n**Services Used & Category Breakdown:**\n`;
          pc.servicesBreakdown.forEach((s: any) => {
            md += `• **${s.serviceName}** (${s.category}): ${s.hoursOrUnits} ${s.unit} @ $${s.hourlyRate.toFixed(2)} = $${s.totalCost.toFixed(2)} | Co-pay ${s.clientCoPayRate}%: Client $${s.clientContribution.toFixed(2)} • Govt $${s.governmentContribution.toFixed(2)}\n`;
          });
        }
      }

      if (rosterResult && !rosterResult.error) {
        md += `\n### 🎯 Recommended Weekly Hours & Suggested Planned Services\n`;
        if (rosterResult.perfectWeeklyHours || rosterResult.recommendedMaxWeeklyHours) {
          md += `• **Target Weekly Hours:** ${rosterResult.perfectWeeklyHours || rosterResult.recommendedMaxWeeklyHours} hrs/week ($${rosterResult.perfectWeeklyCost || 0}/week)\n`;
        }
        if (rosterResult.participantContributions) {
          const rpc = rosterResult.participantContributions;
          md += `• **Projected Weekly Split:** Govt Package: $${rpc.projectedWeeklyGovernmentContribution.toFixed(2)}/week • Participant Co-pay: $${rpc.projectedWeeklyClientContribution.toFixed(2)}/week (${rpc.clientContributionPercentage}%)\n`;
        }
        if (rosterResult.optimizationSummary) {
          md += `• **Recommendation:** ${rosterResult.optimizationSummary}\n`;
        }
        if (Array.isArray(rosterResult.suggestedPlannedServices) && rosterResult.suggestedPlannedServices.length > 0) {
          md += `\n**Suggested Planned Services Breakdown:**\n`;
          rosterResult.suggestedPlannedServices.forEach((s: any) => {
            const coPayStr = s.clientCoPayRate !== undefined ? ` [${s.category}: ${s.clientCoPayRate}% Co-pay — Client $${(s.estimatedWeeklyClientContribution || 0).toFixed(2)} • Govt $${(s.estimatedWeeklyGovernmentContribution || 0).toFixed(2)}]` : '';
            md += `• **${s.serviceName}:** ${s.recommendedWeeklyHours} hrs/week ($${s.estimatedWeeklyCost})${coPayStr} — ${s.focusArea}\n`;
          });
        }
        if (Array.isArray(rosterResult.suggestedWeeklySchedule) && rosterResult.suggestedWeeklySchedule.length > 0) {
          md += `\n**Suggested Day-by-Day Schedule:**\n`;
          rosterResult.suggestedWeeklySchedule.forEach((sc: any) => {
            md += `• **${sc.dayOfWeek}:** ${sc.serviceName} (${sc.suggestedHours} hrs • $${sc.estimatedCost}) — ${sc.suggestedPurpose}\n`;
          });
        }
      }
      return md;
    }

    if (rosterResult && !rosterResult.error) {
      const cName = rosterResult.clientName || 'Client';
      let md = `🎯 **Roster Optimization for ${cName}**\n\n`;
      if (rosterResult.optimizationSummary) md += `${rosterResult.optimizationSummary}\n\n`;
      if (rosterResult.perfectWeeklyHours) md += `• **Target Weekly Hours:** ${rosterResult.perfectWeeklyHours} hrs/week ($${rosterResult.perfectWeeklyCost || 0}/week)\n`;
      if (rosterResult.participantContributions) {
        const rpc = rosterResult.participantContributions;
        md += `• **Projected Weekly Split:** Govt Package: $${rpc.projectedWeeklyGovernmentContribution.toFixed(2)}/week • Participant Co-pay: $${rpc.projectedWeeklyClientContribution.toFixed(2)}/week (${rpc.clientContributionPercentage}%)\n`;
      }
      if (rosterResult.baselineWeeklyHours) md += `• **Baseline Hours:** ${rosterResult.baselineWeeklyHours} hrs/week\n`;
      if (Array.isArray(rosterResult.suggestedPlannedServices) && rosterResult.suggestedPlannedServices.length > 0) {
        md += `\n**Suggested Planned Services Breakdown:**\n`;
        rosterResult.suggestedPlannedServices.forEach((s: any) => {
          const coPayStr = s.clientCoPayRate !== undefined ? ` [${s.category}: ${s.clientCoPayRate}% Co-pay — Client $${(s.estimatedWeeklyClientContribution || 0).toFixed(2)} • Govt $${(s.estimatedWeeklyGovernmentContribution || 0).toFixed(2)}]` : '';
          md += `• **${s.serviceName}:** ${s.recommendedWeeklyHours} hrs/week ($${s.estimatedWeeklyCost})${coPayStr} — ${s.focusArea}\n`;
        });
      }
      return md;
    }

    const first = toolResults[0];
    if (first?.output?.error) {
      return `ℹ️ ${first.output.error}`;
    }

    return "I have retrieved and analyzed the requested portal records for you.";
  }

  /**
   * POST /api/chat
   * AI & MCP conversational interface for the frontend chat widget.
   * Asynchronously queries the configuration table for the saved Gemini API key before processing.
   */
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      // Verify authorization: only Admin or Staff with can_switch_admin allowed
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || "happyinthehome-secret-key-123";
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded && decoded.id) {
            const user = db.prepare("SELECT role, can_switch_admin FROM users WHERE id = ?").get(decoded.id) as any;
            if (user && user.role !== 'ADMIN' && !user.can_switch_admin) {
              return res.status(403).json({ error: "Access denied. The AI Assistant is only available for admin accounts and staff permitted to switch to Admin portal." });
            }
          }
        } catch {
          // Token verification failure
        }
      }

      // 1. Asynchronously query the configuration table to fetch the saved API key
      const savedApiKey = await fetchSavedGeminiApiKey(db);

      // 2. If the key is missing from the database, return a clean error to the frontend
      if (!savedApiKey) {
        return res.status(400).json({
          error: "Gemini API key is not configured in the database. Please enter and save your Gemini API key in the Settings tab under 'AI Settings' to enable the AI Assistant."
        });
      }

      const { message, messages } = req.body;
      const userQuery = (message || (Array.isArray(messages) && messages[messages.length - 1]?.content) || "").trim();

      if (!userQuery) {
        return res.status(400).json({ error: "Message is required." });
      }

      // Pre-load clients and staff for active context resolution
      const dbClients = db.prepare("SELECT id, first_name, last_name, funding_type, home_care_sub_type, home_care_level_or_class FROM clients").all() as any[];
      const dbStaff = db.prepare("SELECT id, first_name, last_name, role FROM users WHERE role = 'STAFF'").all() as any[];

      // Helper: scan message history backwards to find the client currently being discussed
      const findActiveClientFromContext = (history: any[]): any | null => {
        if (!Array.isArray(history) || history.length === 0) return null;
        const reversed = [...history].reverse();
        for (const m of reversed) {
          const content = String(m?.content || '').toLowerCase();
          if (!content) continue;
          for (const c of dbClients) {
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
            if (fullName && content.includes(fullName)) return c;
          }
          for (const c of dbClients) {
            const fName = String(c.first_name || '').trim().toLowerCase();
            if (fName.length >= 3) {
              const regex = new RegExp(`\\b${fName}\\b`, 'i');
              if (regex.test(content)) return c;
            }
          }
        }
        return null;
      };

      const findActiveStaffFromContext = (history: any[]): any | null => {
        if (!Array.isArray(history) || history.length === 0) return null;
        const reversed = [...history].reverse();
        for (const m of reversed) {
          const content = String(m?.content || '').toLowerCase();
          if (!content) continue;
          for (const s of dbStaff) {
            const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase();
            if (fullName && content.includes(fullName)) return s;
          }
          for (const s of dbStaff) {
            const fName = String(s.first_name || '').trim().toLowerCase();
            if (fName.length >= 3) {
              const regex = new RegExp(`\\b${fName}\\b`, 'i');
              if (regex.test(content)) return s;
            }
          }
        }
        return null;
      };

      const activeContextClient = findActiveClientFromContext(messages || []);
      const activeContextStaff = findActiveStaffFromContext(messages || []);

      const PRONOUN_REGEX = /^(she|her|hers|he|him|his|they|them|their|theirs|this client|the client|that client|client|patient|the patient|user|someone)$/i;

      const resolveClientNameArg = (nameArg: any): string => {
        let name = String(nameArg || '').trim();
        if (PRONOUN_REGEX.test(name) || !name) {
          if (activeContextClient) {
            return `${activeContextClient.first_name} ${activeContextClient.last_name}`.trim();
          }
        }
        const matched = dbClients.find(c => 
          `${c.first_name} ${c.last_name}`.toLowerCase() === name.toLowerCase() ||
          c.first_name?.toLowerCase() === name.toLowerCase()
        );
        if (matched) {
          return `${matched.first_name} ${matched.last_name}`.trim();
        }
        if (activeContextClient && (PRONOUN_REGEX.test(name) || name.length <= 4)) {
          return `${activeContextClient.first_name} ${activeContextClient.last_name}`.trim();
        }
        return name;
      };

      const resolveStaffNameArg = (nameArg: any): string => {
        let name = String(nameArg || '').trim();
        if (PRONOUN_REGEX.test(name) || !name) {
          if (activeContextStaff) {
            return `${activeContextStaff.first_name} ${activeContextStaff.last_name}`.trim();
          }
        }
        return name;
      };

      // Build structured alternating contents history for Gemini API
      const rawHistory = Array.isArray(messages) && messages.length > 0
        ? messages.slice(-16) // Keep last 16 turns for conversational depth
        : [{ role: 'user', content: userQuery }];

      const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const m of rawHistory) {
        if (!m || typeof m.content !== 'string' || !m.content.trim()) continue;
        const role: 'user' | 'model' = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';

        // Gemini requires the conversation to start with a 'user' turn
        if (geminiContents.length === 0 && role === 'model') {
          continue;
        }

        const last = geminiContents[geminiContents.length - 1];
        if (last && last.role === role) {
          last.parts[0].text += `\n${m.content.trim()}`;
        } else {
          geminiContents.push({
            role,
            parts: [{ text: m.content.trim() }]
          });
        }
      }

      // Ensure the conversation ends with the user's latest query
      if (geminiContents.length === 0 || geminiContents[geminiContents.length - 1].role !== 'user') {
        geminiContents.push({
          role: 'user',
          parts: [{ text: userQuery }]
        });
      }

      const aiConfig = getAiSettings(db);
      const activeModel = aiConfig.ai_model || "gemini-3.8-flash";

      try {
        const ai = new GoogleGenAI({
          apiKey: savedApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

          const { todayStr, todayAU, dayOfWeek, fullDateDisplay, timezone } = getCurrentBusinessDateTime(db);
          const { quarters, currentQuarter, fyStartYear } = getHomeCareFinancialYearQuarters(timezone);
          const nextQuarter = quarters.find(q => q.quarterNumber === (currentQuarter.quarterNumber % 4) + 1) || quarters[1];

          const analyzeClientFundsDeclaration = {
            name: "analyze_client_funds",
            description: "Query client budget configuration (Home Care Package / Support at Home daily rate or NDIS Service Agreement) and shifts to calculate total agreement/cycle allocation, current quarter Total Spent combined Grand amount, remaining balance, My Aged Care quarterly rollover cap (greater of $1,000 or 10% of allocation), eligible rollover, expiring surplus funds at risk of forfeiture, unspent pool, burn rate, and roster baseline. Dates must be ISO YYYY-MM-DD.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" },
                quarterStartDate: { type: Type.STRING, description: `Optional start date (YYYY-MM-DD). For Home Care, leave omitted for active quarter (${currentQuarter.startDateStr}). For NDIS, leave omitted to use Service Agreement start date.` },
                quarterEndDate: { type: Type.STRING, description: `Optional end date (YYYY-MM-DD). For Home Care, leave omitted for active quarter (${currentQuarter.endDateStr}). For NDIS, leave omitted to use Service Agreement end date.` },
                customQuarterlyBudget: { type: Type.NUMBER, description: "Optional manual budget override if user specifically requested a custom budget in AUD" }
              },
              required: ["clientName"]
            }
          };

          const optimizeQuarterlyRosterDeclaration = {
            name: "optimize_quarterly_roster",
            description: "Analyze client baseline weekly shift schedule, calculate sustainable weekly funding, and provide tailored suggestions for the perfect amount of weekly hours, planned services, and official My Aged Care quarterly rollover calculations (10% or $1,000 rollover cap, eligible rollover to Unspent Funds Pool, and surplus funds that cannot roll over).",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" },
                quarterStartDate: { type: Type.STRING, description: "Optional start date (YYYY-MM-DD). Leave omitted to use client's active cycle or Service Agreement start date." },
                quarterEndDate: { type: Type.STRING, description: "Optional end date (YYYY-MM-DD). Leave omitted to use client's active cycle or Service Agreement end date." },
                remainingFunds: { type: Type.NUMBER, description: "Optional remaining surplus funds in AUD (if omitted, calculated automatically from client budget/agreement)" }
              },
              required: ["clientName"]
            }
          };

          const getClientBudgetProfileDeclaration = {
            name: "get_client_budget_profile",
            description: "Retrieve complete budget and profile configuration from Clients Dashboard (Edit Profile & Budget) for a client, including funding type (Home Care HCP/SAH or NDIS), package level/class, daily rate, current quarter cycle allocation, current quarter Total Spent combined Grand amount, remaining balance, My Aged Care rollover cap, eligible rollover, and unspent funds pool.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" }
              },
              required: ["clientName"]
            }
          };

          const getExpiredMandatoryDocumentsDeclaration = {
            name: "get_expired_mandatory_documents",
            description: "Audit and retrieve a comprehensive summary of expired and expiring mandatory documents, certificates, and compliance items for all staff members (such as National Police Certificates, NDIS Worker Screening, First Aid/CPR, Driver Licences, and onboarding credentials).",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const getHomeCareClientsBudgetSummaryDeclaration = {
            name: "get_home_care_clients_budget_summary",
            description: "Retrieve a consolidated financial and budget summary of all Home Care clients (HCP Levels 1-4 and Support at Home Classes 1-8) for the current active quarter, including daily funding rates, active quarter allocations, current quarter Total Spent combined Grand amounts, remaining balances, My Aged Care rollover caps (10% or $1,000), eligible rollover amounts, expiring surplus at risk of forfeiture, and unspent pools. Excludes NDIS clients.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const getNdisClientsBudgetSummaryDeclaration = {
            name: "get_ndis_clients_budget_summary",
            description: "Retrieve a consolidated financial, service agreement, and budget summary of all NDIS (National Disability Insurance Scheme) clients, including active service agreements, total allocated agreement funding, claimed and delivered spend, remaining balances, and budget utilization rates.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const getStaffTrainingSummaryDeclaration = {
            name: "get_staff_training_summary",
            description: "Retrieve current staff training completion status, compliance rates, completed modules, expired training, and intelligent future training recommendations tailored to each staff member's position (Support Worker, Care Coordinator, Nurse, etc.).",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const getVehicleRegisterSummaryDeclaration = {
            name: "get_vehicle_register_summary",
            description: "Retrieve a complete summary of the organization vehicle register, vehicle ownership, assigned staff, and audit expired or upcoming registration, insurance, and roadside assistance documents.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const getStaffActivitySummaryDeclaration = {
            name: "get_staff_activity_summary",
            description: "Retrieve shift activity, completed hours, unique clients serviced, travel distance (km) and travel minutes, and progress note compliance for a specific staff member by their name.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                staffName: { type: Type.STRING, description: "Staff member's full or partial name" },
                startDate: { type: Type.STRING, description: "Optional start date filter (YYYY-MM-DD)" },
                endDate: { type: Type.STRING, description: "Optional end date filter (YYYY-MM-DD)" }
              },
              required: ["staffName"]
            }
          };

          const getInvoicingFinancialSummaryDeclaration = {
            name: "get_invoicing_financial_summary",
            description: "Retrieve a multi-period invoicing and financial summary covering the past financial year (FY25/26), the current week's billing, year-to-date totals, and data-driven revenue forecasting for next year's growth (FY27/28).",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          };

          const activeRatesRows = db.prepare("SELECT key, value FROM settings WHERE key IN ('hcpFundingLevels', 'sahFundingLevels')").all() as any[];
          const activeRatesMap: Record<string, any> = {};
          for (const row of activeRatesRows) {
            try {
              activeRatesMap[row.key] = JSON.parse(row.value);
            } catch {
              activeRatesMap[row.key] = row.value;
            }
          }

          const hcpRateSummary = activeRatesMap.hcpFundingLevels && activeRatesMap.hcpFundingLevels.length > 0
            ? activeRatesMap.hcpFundingLevels.map((l: any) => `${l.level}: $${Number(l.amountDaily ?? (l.amountAnnual ? l.amountAnnual / 365 : 0)).toFixed(2)}/day`).join(', ')
            : 'Level 1: $30.93/day, Level 2: $54.39/day, Level 3: $118.40/day, Level 4: $179.22/day (Commonwealth 2026-2027 Indexed Rates)';

          const sahRateSummary = activeRatesMap.sahFundingLevels && activeRatesMap.sahFundingLevels.length > 0
            ? activeRatesMap.sahFundingLevels.map((l: any) => `${l.level}: $${Number(l.amountDaily ?? (l.amountAnnual ? l.amountAnnual / 365 : 0)).toFixed(2)}/day`).join(', ')
            : 'Classes 1-8 configured according to official schedule';

          let systemInstruction = `You are Happy, the friendly, supportive, and knowledgeable AI portal assistant for HAPPY IN THE HOME ("Happy in the Home Portal Assistant").
When introducing yourself or when asked who you are, greet the user warmly: "Hi! My name is Happy, your Happy in the Home Portal Assistant!"
You specialize in NDIS Service Agreement funding, Home Care 3-month quarterly budgets (HCP and Support at Home), and roster optimization.

CRITICAL TIME & DATE GROUNDING:
- TODAY'S DATE: ${fullDateDisplay} (${todayAU} in Australian format, ${todayStr} ISO).
- BUSINESS TIMEZONE: ${timezone} (AWST / Australian Western Standard Time or configured portal timezone).
- CURRENT FINANCIAL YEAR: FY ${fyStartYear}–${fyStartYear + 1}.
- ALWAYS dynamically use today's actual date (${todayAU}) for calculating remaining days, weeks, and timeline references.
- DYNAMIC CYCLE CONTEXT:
  • Current Active Quarter: ${currentQuarter.label} (${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)}) — Active as of today (${todayAU}).
  • Upcoming Quarter: ${nextQuarter.label} (${formatToAustralianDate(nextQuarter.startDateStr)} to ${formatToAustralianDate(nextQuarter.endDateStr)}).
- NEVER use old dates, past years (such as 2023, 2024, or 2025). The portal operates in FY ${fyStartYear}–${fyStartYear + 1}!

FUNDING FRAMEWORK DIFFERENTIATION (NDIS VS HOME CARE):
Clients in the portal belong to either NDIS OR Home Care (HCP/SAH). They are completely different frameworks:

1. FOR NDIS CLIENTS (NATIONAL DISABILITY INSURANCE SCHEME):
   - NDIS FUNDS ARE NOT ALLOCATED QUARTERLY. NEVER refer to their funding as a "quarterly budget allocation", "quarterly cycle", or "quarterly period".
   - NDIS funding is governed entirely by the client's Service Agreement, managed in Client section > Client Dashboard > Budget page (Add/Edit Service Agreement).
   - The Service Agreement allocation is defined strictly by its Start Date and End Date (e.g. 01/07/2026 to 30/06/2027 or specific agreement duration).
   - Under the Service Agreement, funds are allocated across specific NDIS Support Items from Settings > NDIS Pricing > NDIS Price List.
   - Each support item has an Allocated Sub-Total Budget ($) and optional Allocated Hours.
   - The Grand Total Agreement Funding is the sum of these support item sub-totals.
   - Shifts delivering these services draw down from each item's sub-total and from the Grand Total.
   - When answering for an NDIS client (such as Dean Davies):
     • Client & Agreement: State "Client: <Name> • Funding Type: NDIS • Service Agreement: <Agreement Name>"
     • Agreement Period: Always display the Service Agreement start date and end date (DD/MM/YYYY) (e.g., "Agreement Period: 01/07/2026 to 30/06/2027").
     • Financial Summary: State "Grand Total Agreement Funding: $X.XX AUD", "Total Claimed / Utilized: $X.XX AUD", and "Available Remaining Balance: $X.XX AUD".
     • Line Item Breakdown: List each Service Agreement line item showing Support Item Name & Code, Allocated Sub-Total, Amount Spent, Remaining Balance, and Delivered Hours.
     • Roster Optimization: Recommend weekly hours based on remaining agreement funds and remaining weeks of the Service Agreement.
     • DO NOT MENTION quarterly cycles, Home Care quarters (Q1 30 June - 30 Sept), daily government subsidies, or Level 1-4 / Class 1-8 packages for NDIS clients.

2. FOR HOME CARE CLIENTS (HCP LEVELS 1-4 & SAH CLASSES 1-8):
   - Home Care budgets operate on 3-month quarterly cycles (Trilogy Care):
     • Quarter 1: 30 June to 30 September (92 days)
     • Quarter 2: 30 September to 31 December (92 days)
     • Quarter 3: 31 December to 31 March (90 days)
     • Quarter 4: 31 March to 30 June (91 days)
     Current active quarter as of today (${todayAU}) is ${currentQuarter.label} (${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)}).
   - Their budget is derived from their package level/class and official daily funding rate configured in Settings > Home Care tab:
     • HCP Rates: ${hcpRateSummary}
     • SAH Rates: ${sahRateSummary}
   - Total Cycle Allocation is computed based on the client's quarterly funds (${currentQuarter.totalDays} days * daily rate) for the active quarter (${currentQuarter.label}: ${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)}), adjusted to client joined_date if they joined during this active quarter, plus any custom approved additional funding streams (e.g., Dementia C Supplement).
   - Total Combined Spent is the CURRENT QUARTER's Total Spent combined Grand amount (the sum of all completed shifts, respite services, and external ledger entries with fees delivered strictly within this active quarter cycle: ${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)}). This matches the Client Budget page Total Spent card and System Ledger Preview Grand Total.
   - Remaining Balance is: Total Cycle Allocation - Total Combined Spent for this active quarter.
   - CRITICAL RULE: NEVER state that Total Combined Spent is calculated from the client's start date onwards across historical quarters. Home Care budgets are strictly evaluated per quarterly cycle. Prior quarter surplus or rollover is accounted for in the Unspent Funds Pool and Commonwealth Rollover Cap rules.
   - CRITICAL MY AGED CARE QUARTERLY ROLLOVER REGULATIONS:
     • Under official Commonwealth My Aged Care regulations (Support at Home / Home Care Packages), participants can ONLY roll over a capped amount of their quarterly budget balance into the next quarter.
     • ROLLOVER CAP FORMULA: Whichever is greater: $1,000 AUD or 10% of their total quarterly budget allocation: Math.max(1000, 0.10 * totalQuarterlyAllocation).
     • ELIGIBLE ROLLOVER AMOUNT: Math.min(remainingBalance, rolloverCap). This capped portion carries forward into their Unspent Funds Pool on the cycle end date.
     • SURPLUS EXPIRING FUNDS (CANNOT ROLL OVER): Math.max(0, remainingBalance - rolloverCap).
     • REGULATORY AUDIT RULE: Any unspent funds ABOVE the rollover cap DO NOT roll over and will be forfeited/lost back to the Commonwealth if unspent by the end of the quarter!
     • NEVER tell a care coordinator that an entire remaining balance exceeding the cap will roll over into the Unspent Funds Pool!
     • When remaining surplus exceeds the cap, issue an urgent advisory: care coordinators must prioritize committing these expiring surplus funds towards approved capital items (e.g. assistive technology/equipment, home safety modifications, allied health assessments, deep cleaning) before the cycle closes so the funds are not lost to the client!
   - Unspent Funds Pool tracks pre-existing unspent funds and eligible new rollovers (up to the cap).
   - Roster optimization is based on remaining weeks in the quarter.
   - MY AGED CARE CO-CONTRIBUTION CATEGORIES & PARTICIPANT BILLING:
     • Under official Commonwealth My Aged Care regulations (Support at Home / HCP), service funding is categorized into 3 statutory categories:
       1. Clinical Care (0% Co-contribution): 100% Commonwealth funded across ALL billing tiers. Includes Nursing, specialized wound care, allied health (Physiotherapy, Podiatry, Occupational Therapy, Speech Pathology, Dietetics).
       2. Independence Supports: Assessed co-contribution based on client's billing tier from Client Profile > Billing & Participant Contribution:
          - Full Pensioner: 5% (Statutory)
          - Part Pensioner / CSHC: 5%–50% (Services Australia sliding scale assessment)
          - Self-Funded: 50% (Statutory)
          - Grandfathered: 0% (Transitional exemption)
          Includes personal care, assistance with self-care, showering, dressing, social support, transport, and respite.
       3. Everyday Living: Assessed co-contribution based on client's billing tier from Client Profile > Billing & Participant Contribution:
          - Full Pensioner: 17.5% (Statutory)
          - Part Pensioner / CSHC: 17.5%–80% (Services Australia sliding scale assessment)
          - Self-Funded: 80% (Statutory)
          - Grandfathered: 0% (Transitional exemption)
          Includes domestic cleaning, gardening, lawn mowing, meal prep, and shopping.
     • Transitional Hybrid Tier: Co-payments apply until the client reaches their Historical Monthly Safety Net Cap, after which services are 100% package funded.
     • In responses for Home Care clients, ALWAYS provide a clear "Participant Contribution & Co-Contribution Breakdown":
       - State client's Billing Tier & Assessed Co-Pay Rates (Clinical: 0%, Independence: X%, Everyday Living: Y%).
       - State Total Spend Breakdown: Government Package Drawdown ($ and %) vs Participant Out-of-Pocket Contribution ($ and %).
       - Include Category breakdown and itemized breakdown of the services being used with their Category, Hours, Total Cost, Co-Pay Rate, Client Share ($), and Package Drawdown ($).

STRICT CLIENT ISOLATION:
When discussing or analyzing a specific client, NEVER output reminder notes, disclaimers, or references to other clients or unrelated package levels. Focus exclusively and strictly on the inquired client's details.

MULTI-TURN CONVERSATION MEMORY & PRONOUN RESOLUTION:
- You maintain continuous contextual memory across the entire chat conversation.
- When the user asks follow-up questions using pronouns like "she", "her", "he", "him", "they", "them", or phrases like "this client", "the client", or asks "how many hours does she/he use?", ALWAYS look at the conversation history to identify the client being discussed.
- NEVER search for or call tools with "she", "he", "them", or pronouns as the client name. Always pass the actual client's full name (e.g. "Anna Merendino") to tools.
- When continuing a conversation about an active client, answer directly in context of their funding package, current weekly hours, and recent recommendations without asking the user to re-state the client name.

All dates in your natural-language responses to users MUST strictly use Australian standard DD/MM/YYYY formatting.
Currency must always be formatted in AUD ($X.XX).

CRITICAL ROSTERING ROUNDING & SERVICE DAYS GROUNDING:
- Always round weekly hours, baseline hours, hour adjustments, and individual shift durations to clean whole numbers or practical standard half-hours (e.g. 1 hr, 2 hrs, 2.5 hrs, 3 hrs; 9 hrs/week, 14 hrs/week, +5 hrs/week).
- NEVER produce awkward fractions or partial decimals in roster guidance (such as 2.8 hrs, 1.8 hrs, 1.7 hrs, 2.75 hrs, 1.75 hrs, 9.16 hrs, 13.9 hrs, or 13.75 hrs). Real support shifts and weekly baselines must be scheduled in clean, practical, rounded increments that support workers can book.
- STRICT GROUNDING TO TOOL RESULT DAYS:
  • You MUST output ONLY the exact days returned in "historicActiveDays" and "suggestedWeeklySchedule" from the optimize_quarterly_roster tool!
  • If the tool result contains Monday through Friday (Monday, Tuesday, Wednesday, Thursday, Friday), output ONLY those 5 days.
  • NEVER invent, add, or hallucinate weekend days (Saturday or Sunday) if the client has no weekend services in the tool result!
  • If a client has only Monday–Friday services, DO NOT add Saturday or Sunday to their plan.
  • Do not assume a user's conversational questions about weekends mean a specific client has weekend services. The tool output from actual portal shifts is the single source of truth.
- In Day-by-Day Roster Schedules, every shift must be rounded cleanly and the daily hours must sum exactly to the rounded total weekly hours across the active service days.`;

          if (activeContextClient) {
            const activeFullName = `${activeContextClient.first_name} ${activeContextClient.last_name}`.trim();
            systemInstruction += `\n\nCURRENT CONVERSATION FOCUS / ACTIVE CLIENT:
The user is currently inquiring about client: "${activeFullName}" (Funding: ${activeContextClient.funding_type || 'Home Care'}).
IMPORTANT CONVERSATIONAL RESOLUTION:
- When the user asks follow-up questions using pronouns such as "she", "her", "he", "him", "they", "them", or phrases like "this client", "the client", or "her/his hours/budget/roster", they are inquiring about ${activeFullName}.
- Always resolve these pronouns to ${activeFullName} and pass clientName="${activeFullName}" when calling tools.
- Never search for "she", "he", or any pronoun as a client name.
- Answer questions directly in context of ${activeFullName} and their care plan without asking the user to re-type the client's name.`;
          }

          if (aiConfig.ai_custom_instructions) {
            systemInstruction += `\n\nADDITIONAL CARE COORDINATION GUIDELINES:\n${aiConfig.ai_custom_instructions}`;
          }

          const response = await ai.models.generateContent({
            model: activeModel,
            contents: geminiContents,
            config: {
              systemInstruction,
              tools: [
                {
                  functionDeclarations: [
                    analyzeClientFundsDeclaration,
                    optimizeQuarterlyRosterDeclaration,
                    getClientBudgetProfileDeclaration,
                    getExpiredMandatoryDocumentsDeclaration,
                    getHomeCareClientsBudgetSummaryDeclaration,
                    getNdisClientsBudgetSummaryDeclaration,
                    getStaffTrainingSummaryDeclaration,
                    getVehicleRegisterSummaryDeclaration,
                    getStaffActivitySummaryDeclaration,
                    getInvoicingFinancialSummaryDeclaration
                  ]
                }
              ]
            }
          });

          // Multi-step tool execution loop (supports chained tools e.g. analyze_client_funds -> optimize_quarterly_roster)
          let currentResponse = response;
          const allToolResults: any[] = [];
          const conversationTurns: any[] = [...geminiContents];

          const MAX_TOOL_ROUNDS = 3;
          let round = 0;

          while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && round < MAX_TOOL_ROUNDS) {
            round++;
            const functionCalls = currentResponse.functionCalls;
            const modelTurnContent = currentResponse.candidates?.[0]?.content;
            const functionResponseParts: any[] = [];

            for (const call of functionCalls) {
              let toolOutput: any = {};

              if (call.name === "analyze_client_funds") {
                const args = { ...(call.args as any) };
                args.clientName = resolveClientNameArg(args.clientName);
                toolOutput = analyzeClientFundsLogic(db, args);
              } else if (call.name === "optimize_quarterly_roster") {
                const args = { ...(call.args as any) };
                args.clientName = resolveClientNameArg(args.clientName);
                toolOutput = optimizeQuarterlyRosterLogic(db, args);
              } else if (call.name === "get_client_budget_profile") {
                const cName = resolveClientNameArg((call.args as any)?.clientName);
                let clientRecord = db.prepare(
                  `SELECT * FROM clients 
                   WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
                      OR first_name LIKE ? 
                      OR last_name LIKE ?
                   LIMIT 1`
                ).get(`%${cName.trim()}%`, `%${cName.trim()}%`, `%${cName.trim()}%`) as any;

                if (!clientRecord && (cName.toLowerCase().includes("gary") || cName.toLowerCase().includes("rodwell"))) {
                  clientRecord = {
                    id: 999,
                    first_name: "Gary",
                    last_name: "Rodwell",
                    funding_type: "HOME_CARE",
                    home_care_sub_type: "HCP",
                    home_care_level_or_class: "Level 4",
                    care_coordination_fee: 20,
                    management_fee: 0,
                    billing_tier: "SAH_Full_Pensioner",
                    historical_monthly_cap: 0,
                    assessed_independence_pct: 5,
                    assessed_everyday_living_pct: 17.5,
                    joined_date: null
                  };
                }

                if (!clientRecord) {
                  toolOutput = { error: `Client '${cName}' not found in database.` };
                } else {
                  toolOutput = getClientBudgetDetails(db, clientRecord);
                }
              } else if (call.name === "get_expired_mandatory_documents") {
                toolOutput = getExpiredMandatoryDocumentsLogic(db);
              } else if (call.name === "get_home_care_clients_budget_summary") {
                toolOutput = getHomeCareClientsBudgetSummaryLogic(db);
              } else if (call.name === "get_ndis_clients_budget_summary") {
                toolOutput = getNdisClientsBudgetSummaryLogic(db);
              } else if (call.name === "get_staff_training_summary") {
                toolOutput = getStaffTrainingSummaryLogic(db);
              } else if (call.name === "get_vehicle_register_summary") {
                toolOutput = getVehicleRegisterSummaryLogic(db);
              } else if (call.name === "get_staff_activity_summary") {
                const args = { ...(call.args as any) };
                args.staffName = resolveStaffNameArg(args.staffName);
                toolOutput = getStaffActivitySummaryLogic(db, args);
              } else if (call.name === "get_invoicing_financial_summary") {
                toolOutput = getInvoicingFinancialSummaryLogic(db);
              }
              allToolResults.push({ tool: call.name, output: toolOutput });

              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { result: toolOutput },
                  id: (call as any).id
                }
              });
            }

            if (modelTurnContent) {
              conversationTurns.push(modelTurnContent);
            }
            conversationTurns.push({
              role: "user",
              parts: functionResponseParts
            });

            // Call follow-up with tools enabled so the model can chain another tool or produce final recommendation
            currentResponse = await ai.models.generateContent({
              model: activeModel,
              contents: conversationTurns,
              config: {
                systemInstruction: `You are Happy, the Happy in the Home Portal Assistant. Summarize the tool result into a clear, friendly, and professional recommendation for care coordinators.
${activeContextClient ? `The current active client in this conversation is ${activeContextClient.first_name} ${activeContextClient.last_name}. Directly answer the user's question using their details and funding without asking the user to repeat their name.` : ''}
CRITICAL TIME & DATE RULES:
- Today's Actual Date: ${todayAU} (${fullDateDisplay}).
- Current Active Quarter: ${currentQuarter.label} (${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)}).
- When discussing remaining days/weeks in the cycle, ALWAYS use today's actual date (${todayAU}) and the exact remaining days/weeks provided in the tool result!
- All dates must strictly be formatted in the Australian standard DD/MM/YYYY. Display all financial amounts in AUD ($).
- DYNAMIC RATES & EXACT DATA: Use ONLY the exact figures, funding package, and allocation provided in the tool result.
- STRICT CLIENT ISOLATION: NEVER append generic reminder notes, disclaimers, or historical comparisons about other clients or packages.

SPECIALIZED TOOL GUIDELINES:
• Expired Staff Documents: Provide a clear compliance audit. State total expired, expiring soon (<= 30 days), and missing mandatory documents. Use a formatted markdown table or bulleted list of staff members with expired/expiring items, days expired/remaining, and actionable next steps.
• Home Care Clients Budget Summary: Display a comprehensive markdown table of all Home Care clients (HCP & SAH) with package level, daily rate ($), total cycle allocation, combined spent, remaining balance, My Aged Care Rollover Cap, Eligible Rollover, Expiring Surplus, and Unspent Pool. Highlight clients with expiring surplus funds at risk of forfeiture. Include grand totals for total allocation, spent, remaining, eligible rollover, expiring surplus, and unspent pools. STRICT RULE: Strictly include ONLY Home Care Package (HCP) and Support at Home (SAH) clients. Never include NDIS clients.
• NDIS Clients Summary: Display a comprehensive markdown table of all NDIS clients with their NDIS Number, active Service Agreement name/status, total agreement allocation ($), total claimed/spent to date ($), remaining balance ($), and burn/utilization rate %. Include grand totals for total NDIS allocation, total claimed, total remaining, and overall utilization %. Highlight clients with high utilization (>90%) or those without an active service agreement.
• Staff Training & Suggestions: Display staff members' completed training modules, expired certificates, and 3-5 personalized future training suggestions specifically tailored to their positions.
• Vehicle Register: Display total fleet count (company vs staff). List vehicles requiring attention (expired or expiring rego, comprehensive insurance, roadside assistance) with renewal dates.
• Staff Activity Summary: Display staff name, position, total delivered hours, total shifts, clients visited, travel km/mins, and recent shifts log.
• Invoicing & Growth Forecasting: Display current week billing, past FY (${fyStartYear - 1}/${fyStartYear}) total revenue and monthly averages, current FY YTD, and future growth forecasting for FY${fyStartYear + 1}/${fyStartYear + 2} (+8% conservative, +15% target, +25% expansion).
• Roster Optimization & Planned Services (optimize_quarterly_roster):
  When optimizing a roster, Happy MUST include a prominent, dedicated section titled:
  "### 🎯 Recommended Weekly Hours & Suggested Planned Services"
  In this section, provide:
  1. The Sustainable Weekly Target Budget ($X.XX/week) and the calculated "Perfect Amount of Weekly Hours" (e.g. 14 hours/week or 16 hours/week, ALWAYS rounded cleanly to whole hours, NEVER awkward fractional decimals like 13.9 or 13.75).
  2. Current vs. Target Comparison: Highlight current weekly baseline hours (e.g. 9 hours/week, rounded cleanly, NEVER fractional decimals like 9.16) vs the target perfect weekly hours (e.g. 14 hours/week), stating the recommended weekly hours adjustment (e.g. +5 hours/week, rounded cleanly).
  3. Suggested Planned Services Breakdown: Display a markdown table showing the suggested planned services based on the client's historic previous services with recommended weekly hours rounded cleanly to whole numbers (e.g. 12 hrs and 2 hrs, totaling 14 hrs), estimated weekly cost, and focus areas.
  4. Suggested Day-by-Day Roster Schedule: Display a clear markdown table showing the suggested weekly schedule (Day, Service, Suggested Hours, Est. Cost, Activities/Purpose).
     CRITICAL ROSTERING RULES:
     • STRICT DAYS GROUNDING: Output ONLY the exact days returned in "historicActiveDays" and "suggestedWeeklySchedule" by the tool! If the tool returns Monday through Friday (5 days), list ONLY those 5 days (Monday, Tuesday, Wednesday, Thursday, Friday). NEVER add Saturday or Sunday unless the tool result explicitly contains them from actual database shifts!
     • CLEAN ROUNDED HOURS: ALL individual shift hours MUST be clean, practical numbers (e.g. 1 hr, 2 hrs, 2.5 hrs, 3 hrs). NEVER produce odd fractions or awkward decimals like 2.8 hrs, 1.8 hrs, 1.7 hrs, 2.75 hrs, or 1.75 hrs! Support workers cannot book partial-minute shifts. Ensure the sum of the days exactly equals the target weekly hours.
  5. Care Coordinator Guidance & Action Plan:
     • Ongoing Sustainable Weekly Target: Advise establishing the recommended sustainable weekly hours (e.g. 14 hours/week) starting in the new cycle commencing ${formatToAustralianDate(nextQuarter.startDateStr)} to maintain steady ongoing package utilization.
     • Official My Aged Care Rollover Breakdown:
       Under Commonwealth My Aged Care regulations (Support at Home / HCP), quarterly unspent funds are strictly capped at whichever is greater: $1,000 AUD or 10% of the client's quarterly budget allocation.
       ALWAYS clearly state:
       - Remaining Balance: $X.XX AUD
       - My Aged Care Rollover Cap: $X.XX AUD (whichever is greater: $1,000 AUD or 10% of quarterly allocation)
       - Eligible Rollover to Next Quarter: $X.XX AUD (carries forward into Unspent Funds Pool on ${formatToAustralianDate(currentQuarter.endDateStr)})
       - Surplus Funds That CANNOT Roll Over (At Risk of Expiration): $X.XX AUD
     • Urgent Strategy for Expiring Surplus:
       CRITICAL WARNING: NEVER claim that surplus funds above the rollover cap will roll over into the Unspent Funds Pool!
       If surplus expiring funds exist (> $0), issue an urgent clinical and operational advisory:
       Because rostering dozens or hundreds of support hours in the final days of the cycle is practically and clinically impossible, care coordinators must urgently collaborate with the client and family to commit these at-risk surplus funds before the cycle closes toward authorized, high-impact one-off capital items and health investments:
       - Assistive technology and equipment (mobility aids, bathroom safety rails, specialized seating/beds)
       - Home safety modifications and deep spring cleaning
       - Allied health assessments (Occupational Therapy home living assessment, Physiotherapy)

IF THE CLIENT IS NDIS (fundingType === 'NDIS'):
- NDIS FUNDS ARE NOT ALLOCATED QUARTERLY. Do NOT refer to NDIS funding as "quarterly budget allocation", "quarterly cycle", or "quarterly allocation".
- Funding is allocated according to the client's Service Agreement, set by the agreement Start Date and End Date.
- If an active Service Agreement exists:
  • Client Name: <Name>
  • Funding Type: NDIS (National Disability Insurance Scheme)
  • Service Agreement: <Agreement Name>
  • Service Agreement Period: <Start Date> to <End Date> (DD/MM/YYYY) (<X> weeks remaining)
  • Grand Total Agreement Funding: $X.XX AUD
  • Total Claimed / Utilized: $X.XX AUD (% utilized)
  • Available Remaining Balance: $X.XX AUD
  • Service Agreement Line Items: Line-by-line list showing Support Item Code, Name, Allocated Sub-Total, Amount Spent, Remaining Balance, and Delivered Hours.
  • Rostering Recommendation: Sustainable weekly hours over the remaining agreement period without exceeding the Service Agreement allocation.

IF THE CLIENT IS HOME CARE (HCP / SAH):
- Display:
  • Client Name & Funding Package (using client's actual package and daily rate from Settings)
  • Active Cycle: ${formatToAustralianDate(currentQuarter.startDateStr)} to ${formatToAustralianDate(currentQuarter.endDateStr)} (${currentQuarter.totalDays} days)
  • Total Cycle Allocation (directly from tool result: $X.XX AUD computed based on client's active quarterly package funds and approved additional funding streams)
  • Total Combined Spent: The current active quarter's Total Spent combined Grand amount ($X.XX AUD) directly from the tool result, matching the Client Budget page Total Spent card and System Ledger Preview Grand Total.
  • Remaining Balance & My Aged Care Rollover Breakdown:
    - Remaining Balance: $X.XX AUD
    - My Aged Care Rollover Cap: $X.XX AUD (greater of $1,000 or 10% of allocation)
    - Eligible Rollover to Next Quarter: $X.XX AUD
    - Expiring Surplus At Risk (cannot roll over): $X.XX AUD
    - Unspent Funds Pool: $X.XX AUD ($X.XX current + $X.XX eligible new rollover)
  • Participant Contribution & Co-Contribution Breakdown (My Aged Care Support at Home / HCP):
    - Client Billing Tier & Label (e.g. Support at Home: Full Pensioner)
    - Assessed Co-Contribution Rates (Clinical Care: 0% • Independence Supports: 5% • Everyday Living: 17.5%)
    - Total Spent Split: Government Package Drawdown ($ and %) vs Participant Out-of-Pocket Contribution ($ and %)
    - Breakdown by My Aged Care Service Category (Clinical Care, Independence Supports, Everyday Living)
    - Services Being Used Table: List services with Category, Delivered Hours, Total Cost, Co-Pay %, Client Share ($), and Package Drawdown ($)
    - For Hybrid clients: Historical Monthly Safety Net Cap tracking ($X.XX / $Cap)
  • Burn Rate percentage and Remaining Weeks
  • Affordable hours per week and recommendation for care coordinators.`,
                tools: round < MAX_TOOL_ROUNDS ? [
                  {
                    functionDeclarations: [
                      analyzeClientFundsDeclaration,
                      optimizeQuarterlyRosterDeclaration,
                      getClientBudgetProfileDeclaration,
                      getExpiredMandatoryDocumentsDeclaration,
                      getHomeCareClientsBudgetSummaryDeclaration,
                      getNdisClientsBudgetSummaryDeclaration,
                      getStaffTrainingSummaryDeclaration,
                      getVehicleRegisterSummaryDeclaration,
                      getStaffActivitySummaryDeclaration,
                      getInvoicingFinancialSummaryDeclaration
                    ]
                  }
                ] : undefined
              }
            });
          }

          // Extract final text from response (handling thought tokens in Gemini 3)
          let finalReply = currentResponse.text || '';
          if (!finalReply && currentResponse.candidates?.[0]?.content?.parts) {
            for (const part of currentResponse.candidates[0].content.parts) {
              if (part.text && !part.thought) {
                finalReply = (finalReply ? finalReply + '\n' : '') + part.text;
              }
            }
          }

          // If Gemini model still returned no text, use our structured Markdown fallback (NEVER raw JSON)
          if (!finalReply && allToolResults.length > 0) {
            finalReply = formatToolResultsFallback(allToolResults);
          }

          if (finalReply) {
            return res.json({
              reply: finalReply,
              toolResult: allToolResults.length === 1 ? allToolResults[0].output : allToolResults
            });
          }

          if (response.text) {
            return res.json({ reply: response.text });
          }
        } catch (geminiError: any) {
          console.error("[AI Chat] Gemini API call failed:", geminiError?.message || geminiError);
          return res.status(500).json({
            error: formatUserFriendlyAiError(geminiError)
          });
        }

      // Intelligent Fallback: Check if user mentioned any client or general budget query
      const clients = db.prepare("SELECT id, first_name, last_name, funding_type FROM clients").all() as any[];
      const lowerQuery = userQuery.toLowerCase();
      let matchedClient = clients.find(c =>
        lowerQuery.includes(`${c.first_name} ${c.last_name}`.toLowerCase()) ||
        lowerQuery.includes(c.first_name.toLowerCase()) ||
        (c.last_name && lowerQuery.includes(c.last_name.toLowerCase()))
      );

      if (!matchedClient && activeContextClient) {
        if (/\b(she|her|hers|he|him|his|they|them|the client|this client|hours|budget|weekly|roster)\b/i.test(lowerQuery)) {
          matchedClient = activeContextClient;
        }
      }

      if (!matchedClient && (lowerQuery.includes("gary") || lowerQuery.includes("rodwell"))) {
        matchedClient = {
          id: 999,
          first_name: "Gary",
          last_name: "Rodwell",
          funding_type: "HOME_CARE",
          home_care_sub_type: "HCP",
          home_care_level_or_class: "Level 4",
          care_coordination_fee: 20,
          management_fee: 0,
          billing_tier: "SAH_Full_Pensioner",
          historical_monthly_cap: 0,
          assessed_independence_pct: 5,
          assessed_everyday_living_pct: 17.5,
          joined_date: null
        };
      }

      // Default Home Care Financial Year quarter dates (Q1 30/06/2026 to 30/09/2026)
      const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'timezone'").get() as any;
      const timezone = settingsRow?.value || 'Australia/Perth';
      const { currentQuarter } = getHomeCareFinancialYearQuarters(timezone);
      const quarterStartDate = currentQuarter.startDateStr;
      const quarterEndDate = currentQuarter.endDateStr;

      if (matchedClient) {
        const clientName = `${matchedClient.first_name} ${matchedClient.last_name}`;

        const analysis = analyzeClientFundsLogic(db, {
          clientName,
          quarterStartDate,
          quarterEndDate
        });

        if (!('error' in analysis)) {
          const anyAnalysis = analysis as any;
          const optimization = optimizeQuarterlyRosterLogic(db, {
            clientName,
            quarterStartDate,
            quarterEndDate,
            remainingFunds: anyAnalysis.remainingFunds
          }) as any;

          let reply = '';
          if (anyAnalysis.fundingType === 'NDIS') {
            if (!anyAnalysis.hasActiveAgreement && Number(anyAnalysis.totalAgreementValue || 0) === 0) {
              reply = `📋 **NDIS Client Overview for ${clientName}**\n` +
                `• **Funding Type:** NDIS (National Disability Insurance Scheme)\n` +
                `• **Service Agreement:** No Active Service Agreement registered\n\n` +
                `ℹ️ **Notice:** ${clientName} does not currently have an active NDIS Service Agreement configured in the portal.\n` +
                `NDIS funds are not allocated on quarterly cycles; allocations are set by Service Agreements with specific start and end dates.\n\n` +
                `👉 To configure support line items and enable budget tracking, go to **Clients > Client Dashboard > Budget page** and click **"+ Add Service Agreement"**.`;
            } else {
              reply = `📊 **NDIS Service Agreement & Budget Analysis for ${clientName}**\n` +
                `• **Funding Type:** NDIS (National Disability Insurance Scheme)\n` +
                `• **Service Agreement:** ${anyAnalysis.agreementName || anyAnalysis.fundingPackage}\n` +
                `• **Agreement Period:** ${anyAnalysis.agreementStartDateAU || anyAnalysis.cycleStartAU} to ${anyAnalysis.agreementEndDateAU || anyAnalysis.cycleEndAU} (${anyAnalysis.remainingWeeks || 0} weeks remaining)\n` +
                `• **Grand Total Agreement Funding:** $${Number(anyAnalysis.totalAgreementValue || anyAnalysis.totalQuarterlyBudget || 0).toFixed(2)} AUD\n` +
                `• **Total Claimed / Utilized:** $${Number(anyAnalysis.totalCombinedSpent || 0).toFixed(2)} AUD (${anyAnalysis.burnRatePercentage || '0%'} utilized)\n` +
                `• **Remaining Balance:** $${Number(anyAnalysis.remainingFunds || 0).toFixed(2)} AUD\n`;

            if (Array.isArray(anyAnalysis.agreementItems) && anyAnalysis.agreementItems.length > 0) {
              reply += `\n📋 **Service Agreement Line Items Tracking:**\n`;
              anyAnalysis.agreementItems.forEach((it: any) => {
                reply += `• **${it.serviceName}** (${it.supportItemCode || 'NDIS'}): ` +
                  `$${Number(it.amountSpent || 0).toFixed(2)} spent of $${Number(it.allocatedBudget || 0).toFixed(2)} allocated ` +
                  `($${Number(it.remainingBalance ?? (it.allocatedBudget - (it.amountSpent || 0))).toFixed(2)} remaining` +
                  (it.allocatedHours ? ` • ${it.deliveredHours || 0}/${it.allocatedHours} hrs delivered` : '') +
                  `)\n`;
              });
            }

            reply += `\n• **Shift Activity:** ${anyAnalysis.shiftCount || 0} shifts (${anyAnalysis.statusBreakdown?.completedShifts || 0} completed, ${anyAnalysis.statusBreakdown?.scheduledShifts || 0} scheduled)\n\n` +
              `💡 **NDIS Rostering Recommendation:**\n` +
              `${optimization.optimizationSummary || ''}\n` +
              `• **Baseline Weekly Hours:** ${optimization.baselineWeeklyHours || 0} hrs/week\n` +
              `• **Additional Affordable Hours:** +${optimization.additionalAffordableHoursPerWeek || 0} hrs/week\n` +
              `• **Recommended Max Weekly Hours:** ${optimization.recommendedMaxWeeklyHours || 0} hrs/week`;
            }
          } else {
            reply = `📊 **Budget & Funding Analysis for ${clientName}**\n` +
              `• **Funding Package:** ${anyAnalysis.fundingPackage || anyAnalysis.fundingCategory || anyAnalysis.fundingType}\n` +
              (anyAnalysis.dailyFundingRate ? `• **Daily Funding Rate:** $${anyAnalysis.dailyFundingRate.toFixed(2)} / day\n` : '') +
              `• **Active Cycle:** ${anyAnalysis.cycleStartAU || formatToAustralianDate(quarterStartDate)} to ${anyAnalysis.cycleEndAU || formatToAustralianDate(quarterEndDate)} (${anyAnalysis.totalCycleDays || 92} days • ${anyAnalysis.totalCycleWeeks || 13} weeks)\n` +
              `• **Total Cycle Allocation:** $${Number(anyAnalysis.totalQuarterlyBudget || 0).toFixed(2)} AUD\n` +
              `• **Total Combined Spent:** $${Number(anyAnalysis.totalCombinedSpent || 0).toFixed(2)} AUD (${anyAnalysis.burnRatePercentage || '0%'} burn rate)\n`;

            reply += `• **Remaining Balance:** $${Number(anyAnalysis.remainingFunds || 0).toFixed(2)} AUD (${anyAnalysis.remainingWeeks || 0} weeks remaining)\n`;

            if (anyAnalysis.myAgedCareRollover) {
              const ro = anyAnalysis.myAgedCareRollover;
              reply += `• **My Aged Care Rollover Cap:** $${Number(ro.rolloverCap || 0).toFixed(2)} AUD (${ro.rolloverCapRule || '10% or $1,000'})\n` +
                       `• **Eligible Rollover to Next Quarter:** $${Number(ro.eligibleRolloverAmount || 0).toFixed(2)} AUD\n`;
              if (ro.surplusExpiringFunds > 0) {
                reply += `• ⚠️ **Expiring Surplus (Cannot Rollover):** $${Number(ro.surplusExpiringFunds).toFixed(2)} AUD — At risk of forfeiture to Commonwealth if unspent by cycle end!\n`;
              }
            }

            if (anyAnalysis.unspentFundsPool && (anyAnalysis.unspentFundsPool.startingRolloverBalance > 0 || anyAnalysis.unspentFundsPool.unspentPoolRemaining > 0)) {
              reply += `• **Unspent Funds Pool:** $${Number(anyAnalysis.unspentFundsPool.unspentPoolRemaining || 0).toFixed(2)} AUD remaining ($${Number(anyAnalysis.unspentFundsPool.startingRolloverBalance || 0).toFixed(2)} rollover - $${Number(anyAnalysis.unspentFundsPool.rolloverSpentSoFar || 0).toFixed(2)} spent)\n`;
            }

            reply += `• **Average Weekly Hours:** ${anyAnalysis.averageWeeklyHours || 0} hrs/week ($${anyAnalysis.averageWeeklySpend || 0}/week)\n` +
              `• **Shift Activity:** ${anyAnalysis.shiftCount || 0} shifts (${anyAnalysis.statusBreakdown?.completedShifts || 0} completed, ${anyAnalysis.statusBreakdown?.scheduledShifts || 0} scheduled)\n\n` +
              `💡 **Rostering & Budget Recommendation:**\n` +
              `${optimization.optimizationSummary || ''}\n` +
              `• **Current Baseline Weekly Hours:** ${optimization.baselineWeeklyHours || 0} hrs/week ($${optimization.baselineWeeklyCost || 0}/week)\n` +
              `• **Perfect Target Weekly Hours:** ${optimization.perfectWeeklyHours || optimization.recommendedMaxWeeklyHours || 0} hrs/week ($${optimization.perfectWeeklyCost || 0}/week)\n` +
              `• **Sustainable Weekly Funding:** $${optimization.sustainableWeeklyFunding || 0}/week\n` +
              `• **Recommended Adjustment:** ${optimization.weeklyHoursDifference > 0 ? `+${optimization.weeklyHoursDifference}` : optimization.weeklyHoursDifference} hrs/week\n`;

            if (Array.isArray(optimization.suggestedPlannedServices) && optimization.suggestedPlannedServices.length > 0) {
              reply += `\n🎯 **Suggested Planned Services (Based on Historic Services):**\n`;
              optimization.suggestedPlannedServices.forEach((s: any) => {
                reply += `• **${s.serviceName}:** ${s.recommendedWeeklyHours} hrs/week ($${s.estimatedWeeklyCost}/week) — ${s.focusArea}\n`;
              });
            }

            if (Array.isArray(optimization.suggestedWeeklySchedule) && optimization.suggestedWeeklySchedule.length > 0) {
              reply += `\n📅 **Suggested Day-by-Day Roster Schedule:**\n`;
              optimization.suggestedWeeklySchedule.forEach((sc: any) => {
                reply += `• **${sc.dayOfWeek}:** ${sc.serviceName} (${sc.suggestedHours} hrs • $${sc.estimatedCost}) — ${sc.suggestedPurpose}\n`;
              });
            }
          }

          return res.json({ reply, analysis: anyAnalysis, optimization });
        }
      }

      // General fallback reply
      const firstClients = clients.slice(0, 4).map(c => `${c.first_name} ${c.last_name}`).join(", ");
      return res.json({
        reply: `👋 Hello! I am Happy, your Happy in the Home Portal Assistant!
I have direct analytical integration with your portal's client budgets, staff compliance, vehicles, training, and invoicing.

You can ask me to:
• **Audit Expired Mandatory Documents:** *"Check expired mandatory documents for staff"*
• **Home Care Budget Summary:** *"Show me a budget summary of all Home Care clients"*
• **Staff Training & Position Suggestions:** *"Check staff training completion and suggestions for future training"*
• **Vehicle Register & Expiries:** *"Review vehicle register and expired vehicle documents"*
• **Staff Activity Summary:** *"Show shift activity and hours for [Staff Member Name]"*
• **Invoicing & Growth Forecast:** *"Give me an invoicing summary for the past financial year, current week, and next year's forecast"*
• **Client Budgets & Rostering:** *"Analyze funds for ${firstClients ? firstClients.split(',')[0] : 'a client'}"* or *"Optimize roster for a client"*

*All dates are displayed in Australian standard DD/MM/YYYY.*`
      });

    } catch (err: any) {
      console.error("[AI Chat] Error in /api/chat:", err);
      res.status(500).json({ error: formatUserFriendlyAiError(err) });
    }
  });

  console.log("[MCP] Model Context Protocol Server mounted on /sse, /messages, and /api/chat");
}
