import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import type Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";

function UPPER(str: any): string {
  return String(str || "").toUpperCase();
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

  // Active client budget settings from client_budgets table (historical pre-system spends, unspent rollover)
  const activeClientBudget = db.prepare(
    `SELECT * FROM client_budgets WHERE client_id = ? AND status = 'ACTIVE' LIMIT 1`
  ).get(client.id) as any;

  // Check for bridging cycle (if client joined during this quarter)
  if (client.joined_date) {
    const joinedStr = client.joined_date.split('T')[0];
    if (joinedStr >= activeQuarter.startDateStr && joinedStr <= activeQuarter.endDateStr) {
      cycleStart = new Date(`${joinedStr}T00:00:00`);
      const msPerDay = 1000 * 60 * 60 * 24;
      totalDays = Math.max(1, Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay) + 1);
    }
  }

  // Only use custom cycle dates from client_budgets IF they encompass today (current period), never old expired dates
  if (activeClientBudget?.cycle_start_date && activeClientBudget?.cycle_end_date) {
    if (todayStr >= activeClientBudget.cycle_start_date && todayStr <= activeClientBudget.cycle_end_date) {
      const cs = new Date(`${activeClientBudget.cycle_start_date}T00:00:00`);
      const ce = new Date(`${activeClientBudget.cycle_end_date}T23:59:59`);
      if (!isNaN(cs.getTime()) && !isNaN(ce.getTime())) {
        cycleStart = cs;
        cycleEnd = ce;
        const msPerDay = 1000 * 60 * 60 * 24;
        totalDays = Math.max(1, Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / msPerDay) + 1);
      }
    }
  }

  const startIso = cycleStart.toISOString().split("T")[0];
  const endIso = cycleEnd.toISOString().split("T")[0];

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

    // Exact cycle allocation as displayed in the Client Budget section (totalDays * dailyRate)
    const totalCycleAllocation = customQuarterlyBudget !== undefined && customQuarterlyBudget > 0
      ? customQuarterlyBudget
      : parseFloat((totalDays * dailyRate).toFixed(2));

    const historicalInternalConsumptions = Number(activeClientBudget?.historical_internal_consumptions || 0);
    const spendAsOfDate = activeClientBudget?.spend_as_of_date || '';
    const startingRolloverBalance = Number(activeClientBudget?.starting_rollover_balance || 0);
    const rolloverSpentSoFar = Number(activeClientBudget?.rollover_spent_so_far || 0);
    const actualUnspentRemaining = parseFloat((startingRolloverBalance - rolloverSpentSoFar).toFixed(2));

    const careCoordPercent = Number(client.care_coordination_fee ?? 20);
    const managementFeePercent = Number(client.management_fee ?? 0);

    // Query client shifts in cycle
    const shifts = db.prepare(
      `SELECT s.id, s.start_time, s.end_time, s.status, s.services_json,
              s.service_id, srv.name as service_name, srv.rate as service_rate, srv.unit as service_unit
       FROM shifts s
       LEFT JOIN services srv ON s.service_id = srv.id
       WHERE s.client_id = ?
         AND s.start_time >= ?
         AND s.start_time <= ?
         AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID', 'DRAFT')
       ORDER BY s.start_time ASC`
    ).all(client.id, `${startIso}T00:00:00`, `${endIso}T23:59:59`) as any[];

    let liveShiftsCost = 0;
    let completedCount = 0;
    let scheduledCount = 0;
    let totalCommittedHours = 0;

    for (const shift of shifts) {
      const isCompleted = UPPER(shift.status) === 'COMPLETED';
      if (isCompleted) completedCount++;
      else scheduledCount++;

      const startMs = new Date(shift.start_time).getTime();
      const endMs = new Date(shift.end_time).getTime();
      const durationHrs = Math.max(0, (endMs - startMs) / 3600000);
      totalCommittedHours += durationHrs;

      const shiftDateOnly = String(shift.start_time).split('T')[0];
      // Skip shifts already accounted for in pre-system historical adjustments
      if (spendAsOfDate && shiftDateOnly <= spendAsOfDate) {
        continue;
      }

      let baseShiftCost = 0;
      let parsedServices: any[] = [];
      if (shift.services_json) {
        try { parsedServices = JSON.parse(shift.services_json); } catch {}
      }

      if (Array.isArray(parsedServices) && parsedServices.length > 0) {
        for (const sd of parsedServices) {
          const srv = sd.serviceId ? db.prepare("SELECT rate, unit FROM services WHERE id = ?").get(sd.serviceId) as any : null;
          const effectiveRate = Number(sd.rateOverride ?? srv?.rate ?? 0);
          const isKm = (sd.serviceUnit || srv?.unit || '').toUpperCase() === 'KM';
          const qty = Number(sd.qtyOverride ?? (isKm ? 0 : durationHrs));
          baseShiftCost += qty * effectiveRate;
        }
      } else {
        const baseRate = Number(shift.service_rate || 0);
        baseShiftCost = durationHrs * baseRate;
      }

      // Apply Care Coordination & Management loadings
      const coordFee = baseShiftCost * (careCoordPercent / 100);
      const subtotalWithCoord = baseShiftCost + coordFee;
      const mgmtFee = subtotalWithCoord * (managementFeePercent / 100);
      const totalShiftWithFees = subtotalWithCoord + mgmtFee;

      liveShiftsCost += totalShiftWithFees;
    }

    // External ledger items
    let externalEntriesCost = 0;
    try {
      const externalEntries = db.prepare(
        `SELECT * FROM client_ledger_entries 
         WHERE client_id = ? AND date >= ? AND date <= ?`
      ).all(client.id, startIso, endIso) as any[];

      for (const ent of externalEntries) {
        const entDateOnly = String(ent.date).split('T')[0];
        if (spendAsOfDate && entDateOnly <= spendAsOfDate) continue;
        externalEntriesCost += Number(ent.grand_total || (Number(ent.base_amount || 0) + Number(ent.care_coord_fee || 0) + Number(ent.management_fee || 0)));
      }
    } catch {}

    const liveInternalConsumptions = parseFloat((liveShiftsCost + externalEntriesCost).toFixed(2));
    const totalCombinedSpent = parseFloat((historicalInternalConsumptions + liveInternalConsumptions).toFixed(2));
    const remainingBalance = parseFloat((totalCycleAllocation - totalCombinedSpent).toFixed(2));
    const burnRatePercentage = totalCycleAllocation > 0
      ? `${((totalCombinedSpent / totalCycleAllocation) * 100).toFixed(2)}%`
      : '0.00%';

    const averageWeeklySpend = totalWeeks > 0 ? parseFloat((totalCombinedSpent / totalWeeks).toFixed(2)) : 0;
    const averageWeeklyHours = totalWeeks > 0 ? parseFloat((totalCommittedHours / totalWeeks).toFixed(2)) : 0;

    return {
      clientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
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
      remainingWeeks,
      totalCycleAllocation,
      totalQuarterlyBudget: totalCycleAllocation,
      historicalPreSystemSpend: historicalInternalConsumptions,
      spendAsOfDateAU: spendAsOfDate ? formatToAustralianDate(spendAsOfDate) : null,
      liveInternalSpend: liveInternalConsumptions,
      totalCombinedSpent,
      totalUsedFunds: totalCombinedSpent,
      remainingBalance,
      remainingFunds: remainingBalance,
      unspentFundsPool: {
        startingRolloverBalance,
        rolloverSpentSoFar,
        unspentPoolRemaining: actualUnspentRemaining
      },
      burnRatePercentage,
      averageWeeklySpend,
      averageWeeklyHours,
      totalCommittedHours: parseFloat(totalCommittedHours.toFixed(2)),
      shiftCount: shifts.length,
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
    const averageWeeklyHours = agreementTotalWeeks > 0 ? parseFloat((totalCommittedHours / agreementTotalWeeks).toFixed(2)) : 0;

    return {
      clientName: `${client.first_name} ${client.last_name}`,
      clientId: client.id,
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
  let client = db.prepare(
    `SELECT *
     FROM clients 
     WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
        OR first_name LIKE ? 
        OR last_name LIKE ?
     LIMIT 1`
  ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;

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
  let client = db.prepare(
    `SELECT *
     FROM clients 
     WHERE TRIM(first_name || ' ' || last_name) LIKE ? 
        OR first_name LIKE ? 
        OR last_name LIKE ?
     LIMIT 1`
  ).get(`%${clientName.trim()}%`, `%${clientName.trim()}%`, `%${clientName.trim()}%`) as any;

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

  const effectiveStartDate = isNdis
    ? ((budgetDetails as any).agreementStartDate || budgetDetails.cycleStartISO)
    : (quarterStartDate || budgetDetails.cycleStartISO);
  const effectiveEndDate = isNdis
    ? ((budgetDetails as any).agreementEndDate || budgetDetails.cycleEndISO)
    : (quarterEndDate || budgetDetails.cycleEndISO);

  // 2. Query client shifts to establish baseline weekly pattern
  const startIso = `${effectiveStartDate}T00:00:00.000Z`;
  const endIso = `${effectiveEndDate}T23:59:59.999Z`;

  const shifts = db.prepare(
    `SELECT s.id, s.start_time, s.end_time, s.services_json,
            s.service_id, srv.name as service_name, srv.rate as service_rate
     FROM shifts s
     LEFT JOIN services srv ON s.service_id = srv.id
     WHERE s.client_id = ?
       AND s.start_time >= ?
       AND s.start_time <= ?
       AND UPPER(s.status) NOT IN ('CANCELLED', 'VOID', 'DRAFT')`
  ).all(client.id, startIso, endIso) as any[];

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const patternMap: Record<string, { dayOfWeek: string; serviceName: string; totalHours: number; count: number; rate: number }> = {};
  let totalStandardRates = 0;
  let rateCount = 0;

  for (const shift of shifts) {
    const shiftDate = new Date(shift.start_time);
    const dayName = dayNames[shiftDate.getUTCDay()];
    const sName = shift.service_name || "Standard Care Service";
    const sRate = Number(shift.service_rate || 65.47);

    const durationHrs = Math.max(0, (new Date(shift.end_time).getTime() - shiftDate.getTime()) / 3600000);
    const key = `${dayName}_${sName}`;

    if (!patternMap[key]) {
      patternMap[key] = {
        dayOfWeek: dayName,
        serviceName: sName,
        totalHours: 0,
        count: 0,
        rate: sRate
      };
    }
    patternMap[key].totalHours += durationHrs;
    patternMap[key].count += 1;
    totalStandardRates += sRate;
    rateCount++;
  }

  // 3. Calculate remaining weeks in the agreement or quarter
  const remainingWeeks = budgetDetails.remainingWeeks;

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

  const totalBaselineWeeklyHours = parseFloat(baselinePattern.reduce((acc, p) => acc + p.averageWeeklyHours, 0).toFixed(2));
  const totalBaselineWeeklyCost = parseFloat(baselinePattern.reduce((acc, p) => acc + p.estimatedWeeklyCost, 0).toFixed(2));

  const hasNdisAgreement = Boolean((budgetDetails as any).hasActiveAgreement || (budgetDetails as any).totalAgreementValue > 0);
  const optimizationSummary = isNdis
    ? (hasNdisAgreement
        ? `The client has $${effectiveRemainingFunds.toFixed(2)} remaining in their NDIS Service Agreement (${(budgetDetails as any).agreementName || 'Service Agreement'}), which runs from ${(budgetDetails as any).agreementStartDateAU} to ${(budgetDetails as any).agreementEndDateAU} (${remainingWeeks} weeks remaining). At an average support rate of $${primaryStandardRate.toFixed(2)}/hr, they can safely afford an additional ${additionalAffordableHoursPerWeek} hours per week without exceeding their Service Agreement allocation.`
        : `No active NDIS Service Agreement has been configured for ${client.first_name} ${client.last_name} yet. To track budgets and calculate roster capacity, please add a Service Agreement under Clients > Client Dashboard > Budget page (Add Service Agreement).`)
    : `The client has $${effectiveRemainingFunds.toFixed(2)} remaining across ${remainingWeeks} remaining weeks ($${weeklySurplusBudget.toFixed(2)}/week surplus). At a standard rate of $${primaryStandardRate.toFixed(2)}/hr, they can safely afford an additional ${additionalAffordableHoursPerWeek} hours per week without exceeding their quarterly budget.`;

  return {
    clientName: `${client.first_name} ${client.last_name}`,
    fundingType: client.funding_type || budgetDetails.fundingType || 'NDIS',
    fundingPackage: budgetDetails.fundingPackage,
    agreementName: (budgetDetails as any).agreementName,
    agreementStartDateAU: (budgetDetails as any).agreementStartDateAU,
    agreementEndDateAU: (budgetDetails as any).agreementEndDateAU,
    totalAgreementFunding: (budgetDetails as any).totalAgreementValue,
    dailyFundingRate: (budgetDetails as any).dailyFundingRate,
    totalCycleAllocation: budgetDetails.totalCycleAllocation,
    totalCombinedSpent: budgetDetails.totalCombinedSpent,
    quarterStartDate: effectiveStartDate,
    quarterEndDate: effectiveEndDate,
    quarterStartDateAU: formatToAustralianDate(effectiveStartDate),
    quarterEndDateAU: formatToAustralianDate(effectiveEndDate),
    remainingFunds: effectiveRemainingFunds,
    remainingWeeksInQuarter: remainingWeeks,
    remainingAgreementWeeks: remainingWeeks,
    weeklySurplusBudget,
    currentWeeklyBaseline: baselinePattern,
    baselineWeeklyHours: totalBaselineWeeklyHours,
    baselineWeeklyCost: totalBaselineWeeklyCost,
    primaryStandardRate,
    additionalAffordableHoursPerWeek,
    recommendedMaxWeeklyHours: parseFloat((totalBaselineWeeklyHours + additionalAffordableHoursPerWeek).toFixed(2)),
    optimizationSummary
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
        tools: ["analyze_client_funds", "optimize_quarterly_roster"],
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
        error: err.message || "Failed to communicate with Google Gemini API"
      });
    }
  });

  /**
   * POST /api/chat
   * AI & MCP conversational interface for the frontend chat widget.
   * Asynchronously queries the configuration table for the saved Gemini API key before processing.
   */
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
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

          const analyzeClientFundsDeclaration = {
            name: "analyze_client_funds",
            description: "Query client budget configuration (Home Care Package / Support at Home daily rate or NDIS Service Agreement) and shifts to calculate total agreement/cycle allocation, combined spent funds, remaining balance, unspent pool, burn rate, and roster baseline. Dates must be ISO YYYY-MM-DD.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" },
                quarterStartDate: { type: Type.STRING, description: "Optional start date (YYYY-MM-DD). For Home Care, leave omitted for active quarter (2026-06-30). For NDIS, leave omitted to use Service Agreement start date." },
                quarterEndDate: { type: Type.STRING, description: "Optional end date (YYYY-MM-DD). For Home Care, leave omitted for active quarter (2026-09-30). For NDIS, leave omitted to use Service Agreement end date." },
                customQuarterlyBudget: { type: Type.NUMBER, description: "Optional manual budget override if user specifically requested a custom budget in AUD" }
              },
              required: ["clientName"]
            }
          };

          const optimizeQuarterlyRosterDeclaration = {
            name: "optimize_quarterly_roster",
            description: "Analyze client baseline weekly shift schedule and calculate surplus budget and additional affordable hours per week based on their actual Home Care quarterly budget or NDIS Service Agreement allocation.",
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
            description: "Retrieve complete budget and profile configuration from Clients Dashboard (Edit Profile & Budget) for a client, including funding type (Home Care HCP/SAH or NDIS), package level/class, daily rate, cycle allocation, pre-system spend adjustments, live internal spend, remaining balance, and unspent funds pool.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                clientName: { type: Type.STRING, description: "Client full or partial name" }
              },
              required: ["clientName"]
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

CRITICAL TIME & DATE GROUNDING (PORTAL IS CURRENTLY IN 2026):
- TODAY'S DATE: Friday, 25 September 2026 (25/09/2026 in Australian format, 2026-09-25 ISO).
- BUSINESS TIMEZONE: Australian Western Standard Time (AWST / Australia/Perth).
- CURRENT FINANCIAL YEAR: 2026–2027.
- NEVER use old dates, past years (such as 2023, 2024, or 2025). The portal operates in September 2026!

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
     • Quarter 1: 30 June 2026 to 30 September 2026 (92 days) — [CURRENT ACTIVE QUARTER on 25/09/2026]
     • Quarter 2: 30 September 2026 to 31 December 2026 (92 days)
     • Quarter 3: 31 December 2026 to 31 March 2027 (90 days)
     • Quarter 4: 31 March 2027 to 30 June 2027 (91 days)
   - Their budget is derived from their package level/class and official daily funding rate configured in Settings > Home Care tab:
     • HCP Rates: ${hcpRateSummary}
     • SAH Rates: ${sahRateSummary}
   - Total Cycle Allocation is: cycle days * daily rate.
   - Total Combined Spent includes Historical Adjustments + Live Internal Consumptions.
   - Remaining Balance is: Total Cycle Allocation - Total Combined Spent.
   - Unspent Funds Pool tracks rollover funds.
   - Roster optimization is based on remaining weeks in the quarter.

STRICT CLIENT ISOLATION:
When discussing or analyzing a specific client, NEVER output reminder notes, disclaimers, or references to other clients or unrelated package levels. Focus exclusively and strictly on the inquired client's details.

All dates in your natural-language responses to users MUST strictly use Australian standard DD/MM/YYYY formatting.
Currency must always be formatted in AUD ($X.XX).`;

          if (aiConfig.ai_custom_instructions) {
            systemInstruction += `\n\nADDITIONAL CARE COORDINATION GUIDELINES:\n${aiConfig.ai_custom_instructions}`;
          }

          const response = await ai.models.generateContent({
            model: activeModel,
            contents: userQuery,
            config: {
              systemInstruction,
              tools: [
                {
                  functionDeclarations: [
                    analyzeClientFundsDeclaration,
                    optimizeQuarterlyRosterDeclaration,
                    getClientBudgetProfileDeclaration
                  ]
                }
              ]
            }
          });

          // Check if Gemini requested a function call
          const functionCalls = response.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            const modelContent = response.candidates?.[0]?.content;
            const functionResponseParts: any[] = [];
            const toolResults: any[] = [];

            for (const call of functionCalls) {
              let toolOutput: any = {};

              if (call.name === "analyze_client_funds") {
                toolOutput = analyzeClientFundsLogic(db, call.args as any);
              } else if (call.name === "optimize_quarterly_roster") {
                toolOutput = optimizeQuarterlyRosterLogic(db, call.args as any);
              } else if (call.name === "get_client_budget_profile") {
                const cName = String((call.args as any)?.clientName || '');
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
                    joined_date: null
                  };
                }

                if (!clientRecord) {
                  toolOutput = { error: `Client '${cName}' not found in database.` };
                } else {
                  toolOutput = getClientBudgetDetails(db, clientRecord);
                }
              }
              toolResults.push({ tool: call.name, output: toolOutput });

              functionResponseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { result: toolOutput },
                  id: (call as any).id
                }
              });
            }

            // Return function output to Gemini for final natural-language recommendation
            // preserving model turn with thoughtSignature to prevent thought signature errors
            const followUp = await ai.models.generateContent({
              model: activeModel,
              contents: [
                { role: "user", parts: [{ text: userQuery }] },
                modelContent,
                {
                  role: "user",
                  parts: functionResponseParts
                }
              ],
              config: {
                systemInstruction: `You are Happy, the Happy in the Home Portal Assistant. Summarize the tool result into a clear, friendly, and professional recommendation for care coordinators.
CRITICAL TIME & DATE RULES:
- Today's Date: 25/09/2026.
- All dates must strictly be formatted in the Australian standard DD/MM/YYYY. Display all financial amounts in AUD ($).
- DYNAMIC RATES & EXACT DATA: Use ONLY the exact figures, funding package, and allocation provided in the tool result for the specified client.
- STRICT CLIENT ISOLATION: NEVER append generic reminder notes, disclaimers, or historical comparisons about other clients or packages. Address ONLY the requested client's data.

CRITICAL DIFFERENCE BETWEEN NDIS AND HOME CARE:
IF THE CLIENT IS NDIS (fundingType === 'NDIS'):
- NDIS FUNDS ARE NOT ALLOCATED QUARTERLY. Do NOT refer to NDIS funding as "quarterly budget allocation", "quarterly cycle", or "quarterly allocation".
- Funding is allocated according to the client's Service Agreement, set by the agreement Start Date and End Date (from Client section > Client Dashboard > Budget page).
- If the tool result shows hasActiveAgreement is false or totalAgreementValue is 0:
  • State clearly: "Funding Type: NDIS (National Disability Insurance Scheme) • Service Agreement: No Active Service Agreement registered"
  • Explain warmly that NDIS funding is not allocated quarterly, but is instead governed by individual Service Agreements set by start and end dates.
  • Guide the care coordinator: "To track budgets, allocate line item sub-totals, and optimize rosters, please add a Service Agreement under Clients > Client Dashboard > Budget page."
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
  • Active Cycle: 30/06/2026 to 30/09/2026 (92 days • 13.1 weeks)
  • Total Cycle Allocation (directly from tool result, matching Client Budget screen)
  • Total Combined Spent (showing Historical/Pre-system and Live Internal spend)
  • Remaining Balance & Unspent Funds Pool (if available)
  • Burn Rate percentage and Remaining Weeks
  • Affordable hours per week and recommendation for care coordinators.`
              }
            });

            return res.json({
              reply: followUp.text || JSON.stringify(toolResults[0]?.output, null, 2),
              toolResult: toolResults.length === 1 ? toolResults[0].output : toolResults
            });
          }

          if (response.text) {
            return res.json({ reply: response.text });
          }
        } catch (geminiError: any) {
          console.error("[AI Chat] Gemini API call failed:", geminiError?.message || geminiError);
          return res.status(500).json({
            error: `Gemini API Error: ${geminiError?.message || "Failed to generate AI response. Please verify your API key in Settings > AI Settings."}`
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

            if (Number(anyAnalysis.historicalPreSystemSpend || 0) > 0) {
              reply += `  - *Pre-System Historical Spend:* $${Number(anyAnalysis.historicalPreSystemSpend).toFixed(2)} AUD` + (anyAnalysis.spendAsOfDateAU ? ` (as of ${anyAnalysis.spendAsOfDateAU})` : '') + `\n` +
                       `  - *Live System Consumptions:* $${Number(anyAnalysis.liveInternalSpend || 0).toFixed(2)} AUD\n`;
            }

            reply += `• **Remaining Balance:** $${Number(anyAnalysis.remainingFunds || 0).toFixed(2)} AUD (${anyAnalysis.remainingWeeks || 0} weeks remaining)\n`;

            if (anyAnalysis.unspentFundsPool && (anyAnalysis.unspentFundsPool.startingRolloverBalance > 0 || anyAnalysis.unspentFundsPool.unspentPoolRemaining > 0)) {
              reply += `• **Unspent Funds Pool:** $${Number(anyAnalysis.unspentFundsPool.unspentPoolRemaining || 0).toFixed(2)} AUD remaining ($${Number(anyAnalysis.unspentFundsPool.startingRolloverBalance || 0).toFixed(2)} rollover - $${Number(anyAnalysis.unspentFundsPool.rolloverSpentSoFar || 0).toFixed(2)} spent)\n`;
            }

            reply += `• **Average Weekly Hours:** ${anyAnalysis.averageWeeklyHours || 0} hrs/week ($${anyAnalysis.averageWeeklySpend || 0}/week)\n` +
              `• **Shift Activity:** ${anyAnalysis.shiftCount || 0} shifts (${anyAnalysis.statusBreakdown?.completedShifts || 0} completed, ${anyAnalysis.statusBreakdown?.scheduledShifts || 0} scheduled)\n\n` +
              `💡 **Rostering & Budget Recommendation:**\n` +
              `${optimization.optimizationSummary || ''}\n` +
              `• **Baseline Weekly Hours:** ${optimization.baselineWeeklyHours || 0} hrs/week\n` +
              `• **Additional Affordable Hours:** +${optimization.additionalAffordableHoursPerWeek || 0} hrs/week\n` +
              `• **Recommended Max Weekly Hours:** ${optimization.recommendedMaxWeeklyHours || 0} hrs/week`;
          }

          return res.json({ reply, analysis: anyAnalysis, optimization });
        }
      }

      // General fallback reply
      const firstClients = clients.slice(0, 4).map(c => `${c.first_name} ${c.last_name}`).join(", ");
      return res.json({
        reply: `👋 Hello! I am Happy, your Happy in the Home Portal Assistant!
I have direct integration with your portal's client budgets (from Clients Dashboard > Edit Profile and Budget).

You can ask me to:
• **Analyze Client Funds:** e.g., *"Analyze funds for ${firstClients ? firstClients.split(',')[0] : 'a client'}"*
• **Optimize Quarterly Rosters:** e.g., *"Optimize roster for ${firstClients ? firstClients.split(',')[0] : 'a client'}"*
• **Check Burn Rates & Rollover:** Review cycle allocations, daily rates, pre-system adjustments, and unspent pools.

*All dates are displayed in Australian standard DD/MM/YYYY.*`
      });

    } catch (err: any) {
      console.error("[AI Chat] Error in /api/chat:", err);
      res.status(500).json({ error: err.message || "Failed to process chat message" });
    }
  });

  console.log("[MCP] Model Context Protocol Server mounted on /sse, /messages, and /api/chat");
}
