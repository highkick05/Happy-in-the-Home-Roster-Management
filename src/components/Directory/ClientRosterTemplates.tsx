import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Calendar, AlertCircle, X, History, Download, Edit2, Layers, CheckCircle2, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';
import ClientRosterBuildHistory from './ClientRosterBuildHistory';
import { getCurrentFinancialYearAndQuarter, getFinancialYearQuarters } from './HomeCareBudgetView';

interface ClientRosterTemplatesProps {
  client: any;
}

interface ServiceFormEntry {
  serviceId: string;
  qtyOverride?: number | string;
  rateOverride?: number | string;
  fundingStream?: string;
}

type ScheduleType = 'ONGOING' | 'FIXED' | 'ONE_OFF';

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const STANDARD_FUNDING_STREAM_LABELS: Record<string, string> = {
  ON: 'ON — Ongoing Funds',
  HC: 'HC — Home Care Account',
  RC: 'RC — Restorative Care Pathway',
  EL: 'EL — End-of-Life Pathway',
  AT: 'AT — Assistive Technology',
  HM: 'HM — Home Modifications',
  AS: 'AS — Allied Health & Therapeutic',
  VC: 'VC — Veterans Supplement',
  DC: 'DC — Dementia & Cognition Supplement'
};

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

const formatDisplayDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);
};

export default function ClientRosterTemplates({ client }: ClientRosterTemplatesProps) {
  const clientId = client?.id;
  const { token, user, settings } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSettings, setTemplateSettings] = useState<Record<string, string>>({});
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Home Care Quarterly Budget State
  const [freshClient, setFreshClient] = useState<any>(client);
  const [fundingRates, setFundingRates] = useState<any>(null);
  const [quarterLedgerItems, setQuarterLedgerItems] = useState<any[]>([]);

  const activeClient = freshClient || client;
  const isClientHomeCare =
    activeClient?.funding_type === 'HOME_CARE' ||
    activeClient?.funding_type === 'Home Care' ||
    activeClient?.funding_type === 'HCP';

  const timezone = settings?.timezone || 'Australia/Perth';
  const { currentFyStartYear, currentQuarterId, todayStr } = useMemo(
    () => getCurrentFinancialYearAndQuarter(timezone),
    [timezone]
  );
  const activeQuarter = useMemo(() => {
    const quarters = getFinancialYearQuarters(currentFyStartYear);
    return quarters.find(q => q.id === currentQuarterId) || quarters[0];
  }, [currentFyStartYear, currentQuarterId]);

  // Generate drop down days based on settings start day (default Monday)
  const displayDaysOrder = useMemo(() => {
    const startDayName = settings?.invoicingStartDay || 'Monday';
    const startIndex = DAYS_OF_WEEK.indexOf(startDayName) !== -1 ? DAYS_OF_WEEK.indexOf(startDayName) : 1; // Default 1 (Monday)
    const order = [];
    for (let i = 0; i < 7; i++) {
      order.push((startIndex + i) % 7);
    }
    return order;
  }, [settings]);

  // New template form state
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [activeTemplateName, setActiveTemplateName] = useState('Default Template');
  const [customTemplateNames, setCustomTemplateNames] = useState<string[]>(['Default Template']);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);

  // Schedule Type & Date Range State for Add/Edit Shift Modal
  const [scheduleType, setScheduleType] = useState<ScheduleType>('ONGOING');
  const [shiftStartDate, setShiftStartDate] = useState<string>('');
  const [shiftEndDate, setShiftEndDate] = useState<string>('');
  const [shiftOneOffDate, setShiftOneOffDate] = useState<string>('');

  const templateNames = useMemo(() => {
    const fromData = templates.map(t => t.template_name || 'Default Template');
    const names = Array.from(new Set([...customTemplateNames, ...fromData, activeTemplateName]));
    if (names.length === 0) names.push('Default Template');
    return names;
  }, [templates, activeTemplateName, customTemplateNames]);

  const currentTemplateList = useMemo(() => {
    return templates.filter(t => (t.template_name || 'Default Template') === activeTemplateName);
  }, [templates, activeTemplateName]);

  useEffect(() => {
    if (daysOfWeek.length === 0 && displayDaysOrder.length > 0) {
      setDaysOfWeek([displayDaysOrder[0]]);
    }
  }, [displayDaysOrder]);

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [staffId, setStaffId] = useState('');
  const [servicesData, setServicesData] = useState<ServiceFormEntry[]>([{ serviceId: '', fundingStream: 'ON' }]);

  // Generate roster state
  const [generateDuration, setGenerateDuration] = useState('Month');

  const getTodayInTimezone = (tz?: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch (e) {
      console.error('Timezone formatting error:', e);
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEndOfMonthFromDateStr = (dateStr: string) => {
    const [y, m] = dateStr.split('-');
    const end = new Date(Number(y), Number(m), 0, 12, 0, 0);
    const yEnd = end.getFullYear();
    const mEnd = String(end.getMonth() + 1).padStart(2, '0');
    const dEnd = String(end.getDate()).padStart(2, '0');
    return `${yEnd}-${mEnd}-${dEnd}`;
  };

  const [generateStartDate, setGenerateStartDate] = useState(() => {
    return getTodayInTimezone(settings?.timezone);
  });
  const [generateEndDate, setGenerateEndDate] = useState(() => {
    return getEndOfMonthFromDateStr(getTodayInTimezone(settings?.timezone));
  });

  useEffect(() => {
    if (settings?.timezone && generateStartDate === getTodayInTimezone()) {
      const tzToday = getTodayInTimezone(settings.timezone);
      setGenerateStartDate(tzToday);
      setGenerateEndDate(getEndOfMonthFromDateStr(tzToday));
    }
  }, [settings?.timezone]);

  const handleDurationChange = (val: string) => {
    setGenerateDuration(val);
    if (val === 'Current Quarter') {
      const qStart = todayStr > activeQuarter.startDateStr ? todayStr : activeQuarter.startDateStr;
      setGenerateStartDate(qStart);
      setGenerateEndDate(activeQuarter.endDateStr);
      return;
    }
    if (!generateStartDate) return;
    const [y, m, d] = generateStartDate.split('-');
    const start = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    let end = new Date(start);
    if (val === 'Week') {
      end.setDate(start.getDate() + 6);
    } else if (val === 'Fortnight') {
      end.setDate(start.getDate() + 13);
    } else if (val === 'Month') {
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);
    } else if (val === '2 Months') {
      end = new Date(start.getFullYear(), start.getMonth() + 2, 0, 12, 0, 0);
    } else if (val === '3 Months') {
      end = new Date(start.getFullYear(), start.getMonth() + 3, 0, 12, 0, 0);
    } else if (val === '6 Months') {
      end = new Date(start.getFullYear(), start.getMonth() + 6, 0, 12, 0, 0);
    } else if (val === '9 Months') {
      end = new Date(start.getFullYear(), start.getMonth() + 9, 0, 12, 0, 0);
    } else if (val === '12 Months') {
      end = new Date(start.getFullYear(), start.getMonth() + 12, 0, 12, 0, 0);
    }
    const yEnd = end.getFullYear();
    const mEnd = String(end.getMonth() + 1).padStart(2, '0');
    const dEnd = String(end.getDate()).padStart(2, '0');
    setGenerateEndDate(`${yEnd}-${mEnd}-${dEnd}`);
  };

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<any>(null);

  // Conflicts modal state
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showRunBuilderModal, setShowRunBuilderModal] = useState(false);
  const [runBuilderTemplate, setRunBuilderTemplate] = useState(activeTemplateName);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [existingShiftsCount, setExistingShiftsCount] = useState(0);
  const [clearExisting, setClearExisting] = useState(false);
  const [clientConflictsList, setClientConflictsList] = useState<any[]>([]);
  const [resolvingConflicts, setResolvingConflicts] = useState(false);

  useEffect(() => {
    setFreshClient(client);
  }, [client]);

  useEffect(() => {
    fetchData();
  }, [clientId, token, activeQuarter.startDateStr, activeQuarter.endDateStr]);

  const fetchData = async () => {
    if (!token || !clientId) return;
    setLoading(true);
    try {
      const [templatesRes, allServicesRes, staffRes, settingsRes, clientRes, ratesRes, ledgerRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/roster-templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients/${clientId}/template-settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/clients/${clientId}/budget-ledger?startDate=${activeQuarter.startDateStr}&endDate=${activeQuarter.endDateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settingsMap: Record<string, string> = {};
        settingsData.forEach((s: any) => { settingsMap[s.template_name] = s.frequency; });
        setTemplateSettings(settingsMap);
      }
      if (allServicesRes.ok) setServicesList(await allServicesRes.json());
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData.filter((u: any) => u.role !== 'ADMIN'));
      }
      if (clientRes.ok) {
        setFreshClient(await clientRes.json());
      }
      if (ratesRes.ok) {
        setFundingRates(await ratesRes.json());
      }
      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setQuarterLedgerItems(Array.isArray(ledgerData?.items) ? ledgerData.items : []);
      }

      const tzToday = getTodayInTimezone(settings?.timezone);
      setGenerateStartDate(tzToday);
      setGenerateEndDate(getEndOfMonthFromDateStr(tzToday));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clientPersonalisedServices = useMemo(() => {
    const clientServiceIds = activeClient?.service_ids || [];
    const selectedServiceIds = servicesData.map(s => Number(s.serviceId)).filter(id => !isNaN(id));

    if (isClientHomeCare) {
      const hcServices = servicesList.filter(s =>
        s.type === 'HOME_CARE' || s.type === 'Home Care' || s.type === 'HCP' ||
        (s.rates_json && (typeof s.rates_json === 'string' ? s.rates_json.includes('Weekday') : (s.rates_json?.['Weekday'] !== undefined || s.rates_json?.['Weekday (Non-Standard)'] !== undefined)))
      );

      if (clientServiceIds.length > 0) {
        const assignedHc = hcServices.filter(s =>
          clientServiceIds.includes(s.id) ||
          selectedServiceIds.includes(s.id) ||
          clientServiceIds.some((csId: any) => {
            const rawSrv = servicesList.find(x => x.id === csId);
            return rawSrv && (
              (rawSrv.code && s.code && rawSrv.code.trim().toLowerCase() === s.code.trim().toLowerCase()) ||
              (rawSrv.name && s.name && rawSrv.name.trim().toLowerCase() === s.name.trim().toLowerCase())
            );
          })
        );
        if (assignedHc.length > 0) return assignedHc;
      }
      return hcServices.length > 0 ? hcServices : servicesList;
    } else {
      const ndisServices = servicesList.filter(s => s.type === 'NDIS' || !s.type || selectedServiceIds.includes(s.id));
      if (clientServiceIds.length > 0) {
        const assignedNdis = ndisServices.filter(s => clientServiceIds.includes(s.id) || selectedServiceIds.includes(s.id));
        if (assignedNdis.length > 0) return assignedNdis;
      }
      return ndisServices.length > 0 ? ndisServices : servicesList;
    }
  }, [activeClient, isClientHomeCare, servicesList, servicesData]);

  const shiftHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    let end = new Date(`1970-01-01T${endTime}:00`);
    if (end < start) end = new Date(`1970-01-02T${endTime}:00`);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  }, [startTime, endTime]);

  const getServiceDetails = (serviceId: string, dayOfWeek: number, timeStr?: string) => {
    let service = servicesList.find(x => String(x.id) === String(serviceId));
    if (!service) return { rate: 0, unit: 'Hour', name: '', fundingStream: 'ON' };

    if (isClientHomeCare && service.type !== 'HOME_CARE' && service.type !== 'Home Care' && service.type !== 'HCP') {
      const matchingHc = servicesList.find(s =>
        (s.type === 'HOME_CARE' || s.type === 'Home Care' || s.type === 'HCP' || (s.rates_json && (typeof s.rates_json === 'string' ? s.rates_json.includes('Weekday') : s.rates_json?.['Weekday'] !== undefined))) &&
        ((s.code && service.code && s.code.trim().toLowerCase() === service.code.trim().toLowerCase()) ||
         (s.name && service.name && s.name.trim().toLowerCase() === service.name.trim().toLowerCase()) ||
         (s.name && service.name && (s.name.toLowerCase().includes(service.name.toLowerCase()) || service.name.toLowerCase().includes(s.name.toLowerCase()))))
      );
      if (matchingHc) {
        service = matchingHc;
      }
    }

    let rates: Record<string, any> = {};
    if (typeof service.rates_json === 'string') {
      try {
        rates = JSON.parse(service.rates_json);
      } catch {
        rates = {};
      }
    } else if (service.rates_json && typeof service.rates_json === 'object') {
      rates = service.rates_json;
    }

    let baseRate = Number(service.rate) || 0;
    let finalRate = baseRate;

    const isHomeCareService = service.type === 'HOME_CARE' || service.type === 'Home Care' || service.type === 'HCP' || isClientHomeCare || rates['Weekday'] !== undefined || rates['Weekday (Non-Standard)'] !== undefined;

    if (isHomeCareService && (rates && Object.keys(rates).length > 0)) {
      const findRate = (...keysToFind: string[]): number | undefined => {
        for (const k of keysToFind) {
          if (rates[k] !== undefined && rates[k] !== null && rates[k] !== '' && !isNaN(Number(rates[k]))) {
            return Number(rates[k]);
          }
        }
        for (const k of keysToFind) {
          const lowerK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const [rk, rv] of Object.entries(rates)) {
            if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerK && rv !== undefined && rv !== null && rv !== '' && !isNaN(Number(rv))) {
              return Number(rv);
            }
          }
        }
        return undefined;
      };

      const weekdayRate = findRate('Weekday', 'Weekday (Standard)', 'Standard') ?? (baseRate > 0 ? baseRate : undefined);
      const nonStandardRate = findRate('Weekday (Non-Standard)', 'Non-Standard', 'Weekday Non Standard', 'Evening', 'Night') ?? weekdayRate;
      const saturdayRate = findRate('Saturday', 'Sat') ?? weekdayRate;
      const sundayRate = findRate('Sunday', 'Sun') ?? weekdayRate;

      const checkTime = timeStr || startTime;
      const isEveningOrNight = checkTime ? (checkTime >= '18:00' || checkTime < '06:00') : false;

      if (dayOfWeek === 0) {
        finalRate = sundayRate !== undefined && !isNaN(sundayRate) && sundayRate > 0 ? sundayRate : (weekdayRate ?? baseRate);
      } else if (dayOfWeek === 6) {
        finalRate = saturdayRate !== undefined && !isNaN(saturdayRate) && saturdayRate > 0 ? saturdayRate : (weekdayRate ?? baseRate);
      } else {
        if (isEveningOrNight && nonStandardRate !== undefined && !isNaN(nonStandardRate) && nonStandardRate > 0) {
          finalRate = nonStandardRate;
        } else {
          finalRate = weekdayRate !== undefined && !isNaN(weekdayRate) && weekdayRate > 0 ? weekdayRate : baseRate;
        }
      }
    } else if (service.type === 'NDIS' && rates && Object.keys(rates).length > 0) {
      const region = settings?.ndisRegion || 'NSW';
      if (rates[region] !== undefined && rates[region] !== null && rates[region] !== '') {
        finalRate = Number(rates[region]);
      }
    }

    if (finalRate === 0 && baseRate > 0) {
      finalRate = baseRate;
    }

    const fundingStream = String(service.funding_stream || 'ON').toUpperCase();
    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name, fundingStream };
  };

  // Client fee percentages for Home Care shift drawdown (per-shift service consumption fees)
  const careCoordPercent = useMemo(() => {
    if (!isClientHomeCare) return 0;
    const defaultCC = fundingRates?.defaultCareCoordinationFee !== undefined ? Number(fundingRates.defaultCareCoordinationFee) : 20;
    return activeClient?.care_coordination_fee !== undefined && activeClient?.care_coordination_fee !== null && activeClient?.care_coordination_fee !== ''
      ? Number(activeClient.care_coordination_fee)
      : defaultCC;
  }, [isClientHomeCare, activeClient, fundingRates]);

  const serviceLoadingPercent = useMemo(() => {
    if (!isClientHomeCare) return 0;
    const defaultMgmt = fundingRates?.defaultManagementFee !== undefined ? Number(fundingRates.defaultManagementFee) : 10;
    return activeClient?.management_fee !== undefined && activeClient?.management_fee !== null && activeClient?.management_fee !== ''
      ? Number(activeClient.management_fee)
      : defaultMgmt;
  }, [isClientHomeCare, activeClient, fundingRates]);

  const applyShiftDrawdownFees = (baseAmount: number) => {
    if (!isClientHomeCare) return baseAmount;
    const cc = baseAmount * (careCoordPercent / 100);
    const sub = baseAmount + cc;
    const loading = sub * (serviceLoadingPercent / 100);
    return sub + loading;
  };

  // Helper to count how many times a template shift occurs between rangeStartStr and rangeEndStr
  const countShiftOccurrencesInRange = (
    t: {
      day_of_week: number;
      schedule_type?: string;
      start_date?: string | null;
      end_date?: string | null;
      one_off_date?: string | null;
    },
    rangeStartStr: string,
    rangeEndStr: string,
    frequency: string
  ) => {
    if (!rangeStartStr || !rangeEndStr || rangeStartStr > rangeEndStr) return 0;
    const sType: ScheduleType = (t.schedule_type as ScheduleType) || 'ONGOING';

    if (sType === 'ONE_OFF') {
      const targetDate = t.one_off_date || t.start_date;
      if (!targetDate) return 1;
      return targetDate >= rangeStartStr && targetDate <= rangeEndStr ? 1 : 0;
    }

    const effectiveStartStr = t.start_date && t.start_date > rangeStartStr ? t.start_date : rangeStartStr;
    const effectiveEndStr = sType === 'FIXED' && t.end_date && t.end_date < rangeEndStr ? t.end_date : rangeEndStr;
    if (effectiveStartStr > effectiveEndStr) return 0;

    const [sy, sm, sd] = effectiveStartStr.split('-').map(Number);
    const [ey, em, ed] = effectiveEndStr.split('-').map(Number);
    const anchorStr = t.start_date || rangeStartStr;
    const [ay, am, ad] = anchorStr.split('-').map(Number);

    const startD = new Date(sy, sm - 1, sd, 12, 0, 0);
    const endD = new Date(ey, em - 1, ed, 12, 0, 0);
    const anchorD = new Date(ay, am - 1, ad, 12, 0, 0);

    let count = 0;
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== Number(t.day_of_week)) continue;
      const diffTime = d.getTime() - anchorD.getTime();
      const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      const weekIndex = Math.floor(diffDays / 7);

      let isValidWeek = true;
      if (frequency === 'Fortnightly' && weekIndex % 2 !== 0) isValidWeek = false;
      else if (frequency === '3 Weekly' && weekIndex % 3 !== 0) isValidWeek = false;
      else if (frequency === '1 Monthly' && weekIndex % 4 !== 0) isValidWeek = false;
      else if (frequency === '2 Monthly' && weekIndex % 8 !== 0) isValidWeek = false;
      else if (frequency === '3 Monthly' && weekIndex % 13 !== 0) isValidWeek = false;
      else if (frequency === '6 Monthly' && weekIndex % 26 !== 0) isValidWeek = false;
      else if (frequency === '12 Monthly' && weekIndex % 52 !== 0) isValidWeek = false;

      if (isValidWeek) count++;
    }
    return count;
  };

  // Compute base and drawdown cost of a single occurrence of template shift `t`
  const getTemplateShiftOccurrenceBreakdown = (t: any) => {
    const tStart = new Date(`1970-01-01T${t.start_time}:00`);
    let tEnd = new Date(`1970-01-01T${t.end_time}:00`);
    if (tEnd < tStart) tEnd = new Date(`1970-01-02T${t.end_time}:00`);
    const tShiftHours = Math.max(0, (tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60));

    let baseTotal = 0;
    let drawdownTotal = 0;
    const byStream: Record<string, { base: number; drawdown: number }> = {};

    if (t.servicesData && t.servicesData.length > 0) {
      t.servicesData.forEach((sd: any) => {
        const sDetails = getServiceDetails(String(sd.serviceId), t.day_of_week, t.start_time);
        const effectiveQty =
          sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== ''
            ? Number(sd.qtyOverride)
            : sDetails.unit === 'Hour'
            ? tShiftHours
            : 1;
        const effectiveRate =
          sd.rateOverride !== undefined && sd.rateOverride !== null && sd.rateOverride !== ''
            ? Number(sd.rateOverride)
            : sDetails.rate;
        const streamCode = String(sd.fundingStream || sDetails.fundingStream || 'ON').toUpperCase();
        const srvBase = effectiveRate * effectiveQty;
        const srvDrawdown = applyShiftDrawdownFees(srvBase);
        baseTotal += srvBase;
        drawdownTotal += srvDrawdown;
        if (!byStream[streamCode]) byStream[streamCode] = { base: 0, drawdown: 0 };
        byStream[streamCode].base += srvBase;
        byStream[streamCode].drawdown += srvDrawdown;
      });
    } else if (t.service_id) {
      const sDetails = getServiceDetails(String(t.service_id), t.day_of_week, t.start_time);
      const streamCode = String(sDetails.fundingStream || 'ON').toUpperCase();
      const srvBase = sDetails.rate * tShiftHours;
      const srvDrawdown = applyShiftDrawdownFees(srvBase);
      baseTotal += srvBase;
      drawdownTotal += srvDrawdown;
      byStream[streamCode] = { base: srvBase, drawdown: srvDrawdown };
    }

    return { baseTotal, drawdownTotal, byStream };
  };

  const weeklyTotalAmount = useMemo(() => {
    let total = 0;
    currentTemplateList.forEach(t => {
      const sType: ScheduleType = (t.schedule_type as ScheduleType) || 'ONGOING';
      if (sType === 'ONE_OFF') return; // One-off single date shifts don't recur weekly
      const { baseTotal } = getTemplateShiftOccurrenceBreakdown(t);
      total += baseTotal;
    });
    return total;
  }, [currentTemplateList, servicesList]);

  // Home Care Quarterly Budget & ON -> HC Cascade Summary Calculations (Home Care Clients Only)
  const homeCareQuarterlySummary = useMemo(() => {
    if (!isClientHomeCare) return null;

    // 1. Active Quarter Effective Days (pro-rated if client joined mid-quarter)
    let totalDays = activeQuarter.totalDays;
    let actualStartDateStr = activeQuarter.startDateStr;
    if (activeClient?.joined_date) {
      const joinedClean = String(activeClient.joined_date).split('T')[0];
      const joinedDate = new Date(`${joinedClean}T00:00:00`);
      if (!isNaN(joinedDate.getTime()) && joinedDate > activeQuarter.start && joinedDate <= activeQuarter.end) {
        actualStartDateStr = joinedClean;
        const msPerDay = 1000 * 60 * 60 * 24;
        totalDays = Math.max(1, Math.floor((activeQuarter.end.getTime() - joinedDate.getTime()) / msPerDay) + 1);
      }
    }

    // 2. Daily Subsidy Rate (full precision Annual / 365)
    const subType = activeClient?.home_care_sub_type || 'HCP';
    const levelOrClass = activeClient?.home_care_level_or_class || 'Level 1';
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

    let dailyRate = 0;
    if (subType === 'SAH') {
      const levels = fundingRates?.sahFundingLevels || [
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
      dailyRate = parseDailyRate(match, 10731.00 / 365);
    } else {
      const levels = fundingRates?.hcpFundingLevels || [
        { level: 'Level 1', amountAnnual: 11294.22, amountDaily: 30.94 },
        { level: 'Level 2', amountAnnual: 19860.56, amountDaily: 54.41 },
        { level: 'Level 3', amountAnnual: 43233.21, amountDaily: 118.45 },
        { level: 'Level 4', amountAnnual: 65543.98, amountDaily: 179.57 }
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      dailyRate = parseDailyRate(match, 65543.98 / 365);
    }

    const grossAllocation = totalDays * dailyRate;
    const careMgmtPct =
      fundingRates?.defaultCareManagementFee !== undefined && fundingRates?.defaultCareManagementFee !== null
        ? Number(fundingRates.defaultCareManagementFee)
        : 10;
    const netOngoingSubsidy = grossAllocation - grossAllocation * (careMgmtPct / 100);

    // 3. Parse client's Additional Funding Streams for the active quarter
    let rawStreams: any[] = [];
    try {
      if (activeClient?.additional_funding_streams) {
        rawStreams = typeof activeClient.additional_funding_streams === 'string'
          ? JSON.parse(activeClient.additional_funding_streams)
          : activeClient.additional_funding_streams;
      }
    } catch {
      rawStreams = [];
    }
    if (!Array.isArray(rawStreams)) rawStreams = [];

    const activeQuarterStreams = rawStreams.filter((s: any) => {
      if (s?.fyYear !== undefined && s?.quarterId !== undefined) {
        return Number(s.fyYear) === currentFyStartYear && Number(s.quarterId) === currentQuarterId;
      }
      return true;
    });

    const getEffectiveStreamAmount = (s: any) => {
      const pct = Number(s?.percentageOfOngoing ?? s?.percentage_of_ongoing);
      if (!isNaN(pct) && pct > 0) {
        return round2(grossAllocation * (pct / 100));
      }
      if (
        (String(s?.name || '').toLowerCase().includes('dementia') || String(s?.code || '').toUpperCase() === 'DC') &&
        (Number(s?.amount) === 1896.17 || Number(s?.amount) === 1899.88)
      ) {
        return round2(grossAllocation * 0.115);
      }
      return round2(Number(s?.amount) || 0);
    };

    const addToOngoingTotal = round2(
      activeQuarterStreams
        .filter((s: any) => Boolean(s.addToOngoing))
        .reduce((sum: number, s: any) => sum + getEffectiveStreamAmount(s), 0)
    );

    // Total spendable ON quarterly allocation (strictly after Care Mgmt deduction + addToOngoing supplements)
    const totalOnAllocation = round2(round2(netOngoingSubsidy) + addToOngoingTotal);

    const separateStreams = activeQuarterStreams.filter((s: any) => !s.addToOngoing && s.code && String(s.code).toUpperCase() !== 'ON');
    const separateStreamCodes = new Set(separateStreams.map((s: any) => String(s.code).toUpperCase()));

    // 4. Process live ledger items for the current quarter
    const processedLedger = quarterLedgerItems.map((item: any) => {
      const itemStream = String(item.funding_stream || 'ON').toUpperCase();
      if (item.source_type === 'external' || item.grand_total !== undefined) {
        const baseAmt = Number(item.base_amount ?? item.amount) || 0;
        const ccFee = item.care_coord_fee !== undefined ? Number(item.care_coord_fee) : baseAmt * (careCoordPercent / 100);
        const sub = baseAmt + ccFee;
        const mgmt = item.management_fee !== undefined ? Number(item.management_fee) : sub * (serviceLoadingPercent / 100);
        const gTotal = item.grand_total !== undefined ? Number(item.grand_total) : sub + mgmt;
        return { ...item, funding_stream: itemStream, amount: gTotal };
      }
      const baseAmt = Number(item.base_amount ?? item.amount) || 0;
      return { ...item, funding_stream: itemStream, amount: applyShiftDrawdownFees(baseAmt) };
    });

    const actualOnSpentToDate = round2(
      processedLedger
        .filter((item: any) => !separateStreamCodes.has(String(item.funding_stream || 'ON').toUpperCase()))
        .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
    );

    // 5. Calculate Planned Roster Spend across Active Template (Full Quarter & Remaining Days in Quarter)
    const activeFrequency = templateSettings[activeTemplateName] || 'Weekly';
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const tomorrowD = new Date(ty, tm - 1, td + 1, 12, 0, 0);
    const tomorrowStr = `${tomorrowD.getFullYear()}-${String(tomorrowD.getMonth() + 1).padStart(2, '0')}-${String(tomorrowD.getDate()).padStart(2, '0')}`;
    const remainingStartStr = tomorrowStr > actualStartDateStr ? tomorrowStr : actualStartDateStr;

    let fullQuarterPlannedOnDrawdown = 0;
    let fullQuarterPlannedBase = 0;
    let remainingQuarterPlannedOnDrawdown = 0;
    const plannedDrawdownByStream: Record<string, { fullQuarter: number; remainingQuarter: number }> = {};

    currentTemplateList.forEach(t => {
      const fullOccurrences = countShiftOccurrencesInRange(t, actualStartDateStr, activeQuarter.endDateStr, activeFrequency);
      const remOccurrences = countShiftOccurrencesInRange(t, remainingStartStr, activeQuarter.endDateStr, activeFrequency);
      const { baseTotal, byStream } = getTemplateShiftOccurrenceBreakdown(t);

      fullQuarterPlannedBase += baseTotal * fullOccurrences;

      Object.entries(byStream).forEach(([streamCode, amounts]) => {
        const fullStreamDrawdown = amounts.drawdown * fullOccurrences;
        const remStreamDrawdown = amounts.drawdown * remOccurrences;
        if (!plannedDrawdownByStream[streamCode]) {
          plannedDrawdownByStream[streamCode] = { fullQuarter: 0, remainingQuarter: 0 };
        }
        plannedDrawdownByStream[streamCode].fullQuarter += fullStreamDrawdown;
        plannedDrawdownByStream[streamCode].remainingQuarter += remStreamDrawdown;

        if (!separateStreamCodes.has(streamCode)) {
          fullQuarterPlannedOnDrawdown += fullStreamDrawdown;
          remainingQuarterPlannedOnDrawdown += remStreamDrawdown;
        }
      });
    });

    fullQuarterPlannedOnDrawdown = round2(fullQuarterPlannedOnDrawdown);
    fullQuarterPlannedBase = round2(fullQuarterPlannedBase);
    remainingQuarterPlannedOnDrawdown = round2(remainingQuarterPlannedOnDrawdown);

    const weeklyPlannedOnDrawdown = round2(applyShiftDrawdownFees(weeklyTotalAmount));

    // 6. Days Elapsed & Projected End-of-Quarter Spend
    const startObj = new Date(`${actualStartDateStr}T00:00:00`);
    const todayObj = new Date(`${todayStr}T00:00:00`);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.min(totalDays, Math.max(1, Math.floor((todayObj.getTime() - startObj.getTime()) / msPerDay) + 1));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Schedule Forecast: Actual Spent to Date + Remaining Planned Roster Shifts from Tomorrow to Quarter End
    // If no shifts have been logged yet and we are planning a full quarter template, use max(fullQuarterPlannedOnDrawdown, actual + remaining)
    const scheduleProjectedOnSpend = round2(
      actualOnSpentToDate > 0
        ? actualOnSpentToDate + remainingQuarterPlannedOnDrawdown
        : fullQuarterPlannedOnDrawdown
    );

    // Burn-Rate Forecast based on actual spending pace
    const burnRateProjectedOnSpend = round2((actualOnSpentToDate / daysElapsed) * totalDays);

    // 7. Linked HC (Home Care Account) Reserve & ON -> HC Overflow Cascade
    const hcStreams = separateStreams.filter((s: any) => String(s.code || '').toUpperCase() === 'HC');
    const hcAllocated = round2(hcStreams.reduce((sum: number, s: any) => sum + getEffectiveStreamAmount(s), 0));
    const hcManualSpent = round2(hcStreams.reduce((sum: number, s: any) => sum + (Number(s.spentAmount) || 0), 0));
    const hcLedgerSpent = round2(
      processedLedger
        .filter((item: any) => String(item.funding_stream || '').toUpperCase() === 'HC')
        .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
    );
    const hcPlannedRemaining = round2(plannedDrawdownByStream['HC']?.remainingQuarter || 0);
    const hcPlannedFullQuarter = round2(plannedDrawdownByStream['HC']?.fullQuarter || 0);
    const hcDirectSpent = round2(hcManualSpent + hcLedgerSpent);
    const hcDirectProjected = round2(hcDirectSpent + hcPlannedRemaining);
    const hcAvailableBeforeOverflow = Math.max(0, round2(hcAllocated - hcDirectProjected));

    // Calculate ON Overrun -> HC Cascade for Projected Spend (Schedule Forecast)
    const projectedOnOverrun = Math.max(0, round2(scheduleProjectedOnSpend - totalOnAllocation));
    const projectedHcOverflowUsed = hcAllocated > 0 ? Math.min(hcAvailableBeforeOverflow, projectedOnOverrun) : 0;
    const projectedUnfundedDeficit = Math.max(0, round2(projectedOnOverrun - projectedHcOverflowUsed));
    const projectedOnRemaining = projectedOnOverrun > 0
      ? (projectedUnfundedDeficit > 0 ? -projectedUnfundedDeficit : 0)
      : round2(totalOnAllocation - scheduleProjectedOnSpend);
    const projectedHcRemainingAfterOverflow = Math.max(0, round2(hcAvailableBeforeOverflow - projectedHcOverflowUsed));

    // Also calculate Full-Quarter Planned Roster vs ON + HC Allocation
    const plannedOnOverrun = Math.max(0, round2(fullQuarterPlannedOnDrawdown - totalOnAllocation));
    const hcAvailableForPlanned = Math.max(0, round2(hcAllocated - hcDirectSpent - hcPlannedFullQuarter));
    const plannedHcOverflowUsed = hcAllocated > 0 ? Math.min(hcAvailableForPlanned, plannedOnOverrun) : 0;
    const plannedUnfundedDeficit = Math.max(0, round2(plannedOnOverrun - plannedHcOverflowUsed));

    // 8. Build Additional Funding Streams Summary List (all configured separate streams + any extra streams used in Builder)
    const allAdditionalCodes = Array.from(
      new Set([
        ...separateStreams.map((s: any) => String(s.code).toUpperCase()),
        ...Object.keys(plannedDrawdownByStream).filter(code => code !== 'ON')
      ])
    );

    const additionalStreamsSummary = allAdditionalCodes.map(code => {
      const matchingStreams = separateStreams.filter((s: any) => String(s.code).toUpperCase() === code);
      const allocated = round2(matchingStreams.reduce((sum: number, s: any) => sum + getEffectiveStreamAmount(s), 0));
      const manualSpent = round2(matchingStreams.reduce((sum: number, s: any) => sum + (Number(s.spentAmount) || 0), 0));
      const ledgerSpent = round2(
        processedLedger
          .filter((item: any) => String(item.funding_stream || '').toUpperCase() === code)
          .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
      );
      const actualSpent = round2(manualSpent + ledgerSpent);
      const plannedFullQuarter = round2(plannedDrawdownByStream[code]?.fullQuarter || 0);
      const plannedRemaining = round2(plannedDrawdownByStream[code]?.remainingQuarter || 0);
      const onOverflowDraw = code === 'HC' ? projectedHcOverflowUsed : 0;
      const projectedRemaining = round2(allocated - actualSpent - plannedRemaining - onOverflowDraw);
      const streamName = matchingStreams[0]?.name || STANDARD_FUNDING_STREAM_LABELS[code] || `${code} Funding Stream`;

      return {
        code,
        name: streamName,
        isConfigured: matchingStreams.length > 0,
        allocated,
        actualSpent,
        plannedFullQuarter,
        plannedRemaining,
        onOverflowDraw,
        projectedRemaining
      };
    });

    return {
      actualStartDateStr,
      totalDays,
      daysElapsed,
      daysRemaining,
      totalOnAllocation,
      hcAllocated,
      hcDirectSpent,
      hcAvailableBeforeOverflow,
      combinedSpendablePool: round2(totalOnAllocation + hcAvailableBeforeOverflow),
      weeklyPlannedBase: round2(weeklyTotalAmount),
      weeklyPlannedOnDrawdown,
      fullQuarterPlannedBase,
      fullQuarterPlannedOnDrawdown,
      remainingQuarterPlannedOnDrawdown,
      actualOnSpentToDate,
      scheduleProjectedOnSpend,
      burnRateProjectedOnSpend,
      projectedOnOverrun,
      projectedHcOverflowUsed,
      projectedUnfundedDeficit,
      projectedOnRemaining,
      projectedHcRemainingAfterOverflow,
      plannedOnOverrun,
      plannedHcOverflowUsed,
      plannedUnfundedDeficit,
      additionalStreamsSummary
    };
  }, [
    isClientHomeCare,
    activeQuarter,
    activeClient,
    fundingRates,
    currentFyStartYear,
    currentQuarterId,
    quarterLedgerItems,
    careCoordPercent,
    serviceLoadingPercent,
    templateSettings,
    activeTemplateName,
    todayStr,
    currentTemplateList,
    weeklyTotalAmount,
    servicesList
  ]);

  // Available funding stream choices for the Add/Edit Shift Modal dropdown
  const availableFundingStreamOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();
    Object.entries(STANDARD_FUNDING_STREAM_LABELS).forEach(([code, label]) => {
      optionsMap.set(code, label);
    });
    if (homeCareQuarterlySummary?.additionalStreamsSummary) {
      homeCareQuarterlySummary.additionalStreamsSummary.forEach(s => {
        if (!optionsMap.has(s.code)) {
          optionsMap.set(s.code, `${s.code} — ${s.name}`);
        }
      });
    }
    return Array.from(optionsMap.entries()).map(([code, label]) => ({ code, label }));
  }, [homeCareQuarterlySummary]);

  // Modal live cost projection over selected dates / active quarter
  const modalShiftProjection = useMemo(() => {
    const activeFrequency = templateSettings[activeTemplateName] || 'Weekly';
    const targetDays = scheduleType === 'ONE_OFF'
      ? (shiftOneOffDate ? [new Date(`${shiftOneOffDate}T12:00:00`).getDay()] : [daysOfWeek[0] ?? 1])
      : (daysOfWeek.length > 0 ? daysOfWeek : [1]);

    // Determine projection date window
    const projStartStr = scheduleType === 'ONE_OFF'
      ? (shiftOneOffDate || todayStr)
      : (shiftStartDate || homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr);
    const projEndStr = scheduleType === 'ONE_OFF'
      ? (shiftOneOffDate || todayStr)
      : scheduleType === 'FIXED' && shiftEndDate
      ? shiftEndDate
      : activeQuarter.endDateStr;

    let perShiftBase = 0;
    let perShiftDrawdown = 0;
    let totalOccurrences = 0;
    let totalProjectedBase = 0;
    let totalProjectedDrawdown = 0;
    const byStreamProjected: Record<string, number> = {};

    targetDays.forEach((dayIdx, dIdx) => {
      let dayBase = 0;
      let dayDrawdown = 0;

      servicesData.forEach(s => {
        if (!s.serviceId) return;
        const sDetails = getServiceDetails(s.serviceId, dayIdx, startTime);
        const effectiveQty =
          s.qtyOverride !== undefined && s.qtyOverride !== null && s.qtyOverride !== ''
            ? Number(s.qtyOverride)
            : sDetails.unit === 'Hour'
            ? shiftHours
            : 1;
        const isManuallyOverridden =
          s.rateOverride !== undefined &&
          s.rateOverride !== null &&
          s.rateOverride !== '' &&
          Number(s.rateOverride) !== getServiceDetails(s.serviceId, daysOfWeek[0] ?? 1, startTime).rate;
        const effectiveRate = isManuallyOverridden
          ? Number(s.rateOverride)
          : s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== '' && dIdx === 0
          ? Number(s.rateOverride)
          : sDetails.rate;

        const streamCode = String(s.fundingStream || sDetails.fundingStream || 'ON').toUpperCase();
        const srvBase = effectiveRate * effectiveQty;
        const srvDrawdown = applyShiftDrawdownFees(srvBase);
        dayBase += srvBase;
        dayDrawdown += srvDrawdown;

        const occ = countShiftOccurrencesInRange(
          {
            day_of_week: dayIdx,
            schedule_type: scheduleType,
            start_date: shiftStartDate || null,
            end_date: shiftEndDate || null,
            one_off_date: shiftOneOffDate || null
          },
          projStartStr,
          projEndStr,
          activeFrequency
        );
        byStreamProjected[streamCode] = (byStreamProjected[streamCode] || 0) + (isClientHomeCare ? srvDrawdown : srvBase) * occ;
      });

      if (dIdx === 0) {
        perShiftBase = dayBase;
        perShiftDrawdown = dayDrawdown;
      }

      const dayOccurrences = countShiftOccurrencesInRange(
        {
          day_of_week: dayIdx,
          schedule_type: scheduleType,
          start_date: shiftStartDate || null,
          end_date: shiftEndDate || null,
          one_off_date: shiftOneOffDate || null
        },
        projStartStr,
        projEndStr,
        activeFrequency
      );
      totalOccurrences += dayOccurrences;
      totalProjectedBase += dayBase * dayOccurrences;
      totalProjectedDrawdown += dayDrawdown * dayOccurrences;
    });

    return {
      projStartStr,
      projEndStr,
      perShiftBase: round2(perShiftBase),
      perShiftDrawdown: round2(perShiftDrawdown),
      totalOccurrences,
      totalProjectedBase: round2(totalProjectedBase),
      totalProjectedDrawdown: round2(totalProjectedDrawdown),
      byStreamProjected
    };
  }, [
    templateSettings,
    activeTemplateName,
    scheduleType,
    shiftStartDate,
    shiftEndDate,
    shiftOneOffDate,
    daysOfWeek,
    todayStr,
    homeCareQuarterlySummary,
    activeQuarter,
    servicesData,
    startTime,
    shiftHours,
    isClientHomeCare,
    careCoordPercent,
    serviceLoadingPercent,
    servicesList
  ]);

  const handleAddServiceEntry = () => {
    setServicesData(prev => [...prev, { serviceId: '', fundingStream: 'ON' }]);
  };

  const handleRemoveServiceEntry = (index: number) => {
    setServicesData(prev => prev.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, newServiceId: string) => {
    setServicesData(prev => {
      const copy = [...prev];
      if (!newServiceId) {
        copy[index] = { ...copy[index], serviceId: '', rateOverride: '', qtyOverride: '', fundingStream: 'ON' };
        return copy;
      }
      const sDetails = getServiceDetails(newServiceId, daysOfWeek[0] ?? 1, startTime);
      const effectiveRate = sDetails.rate > 0 ? sDetails.rate.toFixed(2) : '';
      const effectiveQty = sDetails.unit === 'Hour' ? shiftHours : 1;
      copy[index] = {
        ...copy[index],
        serviceId: newServiceId,
        rateOverride: effectiveRate,
        qtyOverride: copy[index].qtyOverride || (effectiveQty % 1 === 0 ? effectiveQty : Number(effectiveQty.toFixed(2))),
        fundingStream: sDetails.fundingStream || 'ON'
      };
      return copy;
    });
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    const day = daysOfWeek[0] ?? 1;
    setServicesData(prev => prev.map(s => {
      if (!s.serviceId) return s;
      const oldDetails = getServiceDetails(s.serviceId, day, startTime);
      const newDetails = getServiceDetails(s.serviceId, day, newStartTime);
      if (!s.rateOverride || Number(s.rateOverride) === oldDetails.rate) {
        return { ...s, rateOverride: newDetails.rate > 0 ? newDetails.rate.toFixed(2) : '' };
      }
      return s;
    }));
  };

  const handleDayToggle = (idx: number) => {
    if (scheduleType === 'ONE_OFF') return; // Day of week is auto-determined by one_off_date
    let newDays: number[];
    if (editingTemplateId) {
      newDays = [idx];
    } else {
      if (daysOfWeek.includes(idx)) {
        newDays = daysOfWeek.filter(d => d !== idx);
      } else {
        newDays = [...daysOfWeek, idx];
      }
    }
    const oldDay = daysOfWeek[0] ?? 1;
    const targetDay = newDays.length > 0 ? newDays[0] : 1;
    setDaysOfWeek(newDays);

    if (oldDay !== targetDay) {
      setServicesData(prev => prev.map(s => {
        if (!s.serviceId) return s;
        const oldDetails = getServiceDetails(s.serviceId, oldDay, startTime);
        const newDetails = getServiceDetails(s.serviceId, targetDay, startTime);
        if (!s.rateOverride || Number(s.rateOverride) === oldDetails.rate) {
          return { ...s, rateOverride: newDetails.rate > 0 ? newDetails.rate.toFixed(2) : '' };
        }
        return s;
      }));
    }
  };

  const handleOneOffDateChange = (dateVal: string) => {
    setShiftOneOffDate(dateVal);
    if (dateVal) {
      const [y, m, d] = dateVal.split('-').map(Number);
      const parsed = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(parsed.getTime())) {
        const newDay = parsed.getDay();
        const oldDay = daysOfWeek[0] ?? 1;
        setDaysOfWeek([newDay]);
        if (oldDay !== newDay) {
          setServicesData(prev => prev.map(s => {
            if (!s.serviceId) return s;
            const oldDetails = getServiceDetails(s.serviceId, oldDay, startTime);
            const newDetails = getServiceDetails(s.serviceId, newDay, startTime);
            if (!s.rateOverride || Number(s.rateOverride) === oldDetails.rate) {
              return { ...s, rateOverride: newDetails.rate > 0 ? newDetails.rate.toFixed(2) : '' };
            }
            return s;
          }));
        }
      }
    }
  };

  const updateServiceEntry = (index: number, field: keyof ServiceFormEntry, value: string) => {
    setServicesData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!staffId) {
      alert('Please select a Pref. Staff member.');
      return;
    }

    if (scheduleType === 'ONE_OFF' && !shiftOneOffDate) {
      alert('Please select the date for this One-Off shift.');
      return;
    }

    if (scheduleType === 'FIXED' && (!shiftStartDate || !shiftEndDate)) {
      alert('Please select both a Start Date and End Date for a Fixed range shift.');
      return;
    }

    if (scheduleType === 'FIXED' && shiftStartDate > shiftEndDate) {
      alert('Shift Start Date cannot be after End Date.');
      return;
    }

    if (daysOfWeek.length === 0) {
      alert('Please select at least one day of the week.');
      return;
    }

    if (servicesData.length === 0) {
      alert('Please add at least one service.');
      return;
    }

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (start >= end) {
      alert('Start time must be before end time.');
      return;
    }

    for (const s of servicesData) {
      if (!s.serviceId) {
        alert('Please select a service for all entries.');
        return;
      }
    }

    if (editingTemplateId) {
      const targetDay = scheduleType === 'ONE_OFF' && shiftOneOffDate
        ? new Date(`${shiftOneOffDate}T12:00:00`).getDay()
        : (daysOfWeek[0] ?? 1);
      const finalServicesData = servicesData.map(s => {
        const sDetails = getServiceDetails(s.serviceId, targetDay, startTime);
        const effectiveRate =
          s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== ''
            ? Number(s.rateOverride)
            : sDetails.rate;
        const effectiveQty =
          s.qtyOverride !== undefined && s.qtyOverride !== null && s.qtyOverride !== ''
            ? Number(s.qtyOverride)
            : sDetails.unit === 'Hour'
            ? shiftHours
            : 1;
        return {
          serviceId: s.serviceId,
          rateOverride: effectiveRate > 0 ? Number(effectiveRate.toFixed(2)) : (sDetails.rate > 0 ? Number(sDetails.rate.toFixed(2)) : 0),
          qtyOverride: effectiveQty,
          fundingStream: String(s.fundingStream || sDetails.fundingStream || 'ON').toUpperCase()
        };
      });

      try {
        const res = await fetch(`/api/client-roster-templates/${editingTemplateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            dayOfWeek: targetDay,
            startTime,
            endTime,
            staffId: parseInt(staffId),
            servicesData: finalServicesData,
            scheduleType,
            startDate: scheduleType !== 'ONE_OFF' ? (shiftStartDate || null) : null,
            endDate: scheduleType === 'FIXED' ? (shiftEndDate || null) : null,
            oneOffDate: scheduleType === 'ONE_OFF' ? (shiftOneOffDate || null) : null
          })
        });
        if (res.ok) {
          fetchData();
          setShowAddTemplateModal(false);
          setEditingTemplateId(null);
        } else {
          alert('Failed to update template shift.');
        }
      } catch (e) {
        console.error(e);
        alert('Error occurred.');
      }
    } else {
      try {
        const targetDays = scheduleType === 'ONE_OFF' && shiftOneOffDate
          ? [new Date(`${shiftOneOffDate}T12:00:00`).getDay()]
          : daysOfWeek;

        for (const day of targetDays) {
          const dayServicesData = servicesData.map(s => {
            const sDetails = getServiceDetails(s.serviceId, day, startTime);
            const isManuallyOverridden =
              s.rateOverride !== undefined &&
              s.rateOverride !== null &&
              s.rateOverride !== '' &&
              Number(s.rateOverride) !== getServiceDetails(s.serviceId, targetDays[0] ?? 1, startTime).rate;
            const effectiveRate = isManuallyOverridden ? Number(s.rateOverride) : sDetails.rate;
            const effectiveQty =
              s.qtyOverride !== undefined && s.qtyOverride !== null && s.qtyOverride !== ''
                ? Number(s.qtyOverride)
                : sDetails.unit === 'Hour'
                ? shiftHours
                : 1;
            return {
              serviceId: s.serviceId,
              rateOverride: effectiveRate > 0 ? Number(effectiveRate.toFixed(2)) : (sDetails.rate > 0 ? Number(sDetails.rate.toFixed(2)) : 0),
              qtyOverride: effectiveQty,
              fundingStream: String(s.fundingStream || sDetails.fundingStream || 'ON').toUpperCase()
            };
          });

          await fetch(`/api/clients/${clientId}/roster-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              dayOfWeek: day,
              startTime,
              endTime,
              staffId: parseInt(staffId),
              servicesData: dayServicesData,
              templateName: activeTemplateName,
              scheduleType,
              startDate: scheduleType !== 'ONE_OFF' ? (shiftStartDate || null) : null,
              endDate: scheduleType === 'FIXED' ? (shiftEndDate || null) : null,
              oneOffDate: scheduleType === 'ONE_OFF' ? (shiftOneOffDate || null) : null
            })
          });
        }
        fetchData();
        setShowAddTemplateModal(false);
      } catch (e) {
        console.error(e);
        alert('Error occurred.');
      }
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const res = await fetch(`/api/client-roster-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFrequencyChange = async (newFrequency: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/template-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateName: activeTemplateName, frequency: newFrequency })
      });
      if (res.ok) {
        setTemplateSettings(prev => ({ ...prev, [activeTemplateName]: newFrequency }));
      } else {
        alert('Failed to update template frequency.');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred.');
    }
  };

  const handleClearTemplate = async () => {
    if (!confirm(`Are you sure you want to clear all template shifts for "${activeTemplateName}"?`)) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/clear?templateName=${encodeURIComponent(activeTemplateName)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        setDaysOfWeek([]);
        setStartTime('09:00');
        setEndTime('17:00');
        setStaffId('');
        setServicesData([{ serviceId: '', fundingStream: 'ON' }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameTemplate = async (oldName: string) => {
    const newName = prompt(`Enter new name for "${oldName}":`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;

    if (newName.trim() === 'Default Template') {
      alert('Cannot rename to Default Template.');
      return;
    }

    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldName, newName: newName.trim() })
      });
      if (res.ok) {
        setCustomTemplateNames(prev => [...prev.filter(n => n !== oldName), newName.trim()]);
        if (activeTemplateName === oldName) setActiveTemplateName(newName.trim());
        fetchData();
      } else {
        alert('Failed to rename template.');
      }
    } catch (e) {
      console.error(e);
      alert('Error occurred.');
    }
  };

  const handleDeleteTemplateTab = async (name: string) => {
    if (!confirm(`Are you sure you want to completely delete the template "${name}"? This removes all its shifts.`)) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/clear?templateName=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCustomTemplateNames(prev => prev.filter(n => n !== name));
        if (activeTemplateName === name) setActiveTemplateName('Default Template');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditTemplate = (t: any) => {
    setEditingTemplateId(t.id);
    setDaysOfWeek([t.day_of_week]);
    setStartTime(t.start_time);
    setEndTime(t.end_time);
    setStaffId(String(t.staff_id));
    const sType: ScheduleType = (t.schedule_type as ScheduleType) || 'ONGOING';
    setScheduleType(sType);
    setShiftStartDate(t.start_date || activeQuarter.startDateStr);
    setShiftEndDate(t.end_date || activeQuarter.endDateStr);
    setShiftOneOffDate(t.one_off_date || todayStr);

    if (t.servicesData && t.servicesData.length > 0) {
      setServicesData(
        t.servicesData.map((sd: any) => {
          const sDetails = getServiceDetails(String(sd.serviceId), t.day_of_week, t.start_time);
          return {
            ...sd,
            fundingStream: String(sd.fundingStream || sDetails.fundingStream || 'ON').toUpperCase()
          };
        })
      );
    } else if (t.service_id) {
      const sDetails = getServiceDetails(String(t.service_id), t.day_of_week, t.start_time);
      setServicesData([{ serviceId: String(t.service_id), fundingStream: sDetails.fundingStream || 'ON' }]);
    } else {
      setServicesData([{ serviceId: '', fundingStream: 'ON' }]);
    }
    setShowAddTemplateModal(true);
  };

  const [staffConflictsList, setStaffConflictsList] = useState<any[]>([]);

  const handleGenerateRoster = async () => {
    if (!generateStartDate || !generateEndDate) {
      alert('Please select start and end dates.');
      return;
    }
    setGenerating(true);
    setGenerateResult(null);

    if (clearExisting) {
      executeGenerateRoster('all');
      return;
    }

    try {
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: true, templateName: runBuilderTemplate, clearExisting: false })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.existingShiftsCount > 0 || (data.conflicts && data.conflicts.length > 0)) {
          setExistingShiftsCount(data.existingShiftsCount || 0);
          setClientConflictsList(data.existingClientShifts || []);
          setStaffConflictsList(data.conflicts || []);
          setShowConflictsModal(true);
          setGenerating(false);
        } else {
          executeGenerateRoster('all');
        }
      } else {
        alert(data.error || 'Failed to check roster.');
        setGenerating(false);
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to server.');
      setGenerating(false);
    }
  };

  const executeGenerateRoster = async (overwriteParam: any) => {
    setResolvingConflicts(true);
    setGenerating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: false, overwriteConflicts: overwriteParam, templateName: runBuilderTemplate, clearExisting })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setGenerateResult(data);
        setShowConflictsModal(false);
        setShowRunBuilderModal(false);
        fetchData();
        window.dispatchEvent(new CustomEvent('offline-sync-completed'));
      } else {
        alert(data.error || 'Failed to generate roster.');
      }
    } catch (e) {
      console.error(e);
      alert('Error generating roster.');
    } finally {
      setResolvingConflicts(false);
      setGenerating(false);
    }
  };

  const handleResolveConflicts = async () => {
    executeGenerateRoster('all');
  };

  if (loading) return <div className="p-4 text-zinc-400">Loading templates...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-white/[0.08] bg-[#121214] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-white">Current Roster Templates</h3>
            {isClientHomeCare && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                {activeQuarter.shortLabel} ({activeQuarter.displayRange})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-3 py-1.5 bg-[#121214] hover:bg-zinc-800 text-white border border-white/[0.08] rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                <History className="w-4 h-4 mr-2" />
                Build History
              </button>
            )}
            {currentTemplateList.length > 0 && (
              <button
                onClick={handleClearTemplate}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/20 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Home Care Quarterly Budget & ON -> HC Cascade Summary Panel (Strictly Home Care Clients Only, Zero Mention of Care Mgmt Fee) */}
        {isClientHomeCare && homeCareQuarterlySummary && (
          <div className="px-4 py-2.5 bg-[#0d1117] border-b border-white/[0.08] shrink-0 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Card 1: Total Quarterly Allocated Funds (ON + Linked HC Reserve) */}
              <div className="bg-[#121214] border border-white/[0.08] rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Quarterly Allocated Funds
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                      ON — Ongoing Funds
                    </span>
                  </div>
                  <div className="text-base font-bold text-white tracking-tight">
                    {formatCurrency(homeCareQuarterlySummary.totalOnAllocation)}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1.5 pt-1 border-t border-white/[0.05] flex items-center justify-between gap-1">
                  {homeCareQuarterlySummary.hcAllocated > 0 ? (
                    <>
                      <span className="text-sky-300 font-sans font-medium truncate" title="If ON quarterly funds are exhausted, excess automatically draws from the linked HC Home Care Account">
                        🔗 Linked HC Reserve: <strong>{formatCurrency(homeCareQuarterlySummary.hcAvailableBeforeOverflow)}</strong>
                      </span>
                      <span className="text-zinc-400 truncate" title="Total Combined ON + HC Spendable Pool">
                        Pool: <strong className="text-zinc-200">{formatCurrency(homeCareQuarterlySummary.combinedSpendablePool)}</strong>
                      </span>
                    </>
                  ) : (
                    <span>{activeQuarter.shortLabel} • {homeCareQuarterlySummary.totalDays} Days</span>
                  )}
                </div>
              </div>

              {/* Card 2: Planned Roster Spend (Weekly & Full Quarter) */}
              <div className="bg-[#121214] border border-white/[0.08] rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Planned Roster ({activeTemplateName})
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {templateSettings[activeTemplateName] || 'Weekly'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-base font-bold text-white tracking-tight">
                      {formatCurrency(homeCareQuarterlySummary.fullQuarterPlannedOnDrawdown)}
                      <span className="text-[10px] font-normal text-zinc-400 ml-1">/ qtr (ON)</span>
                    </div>
                    <div className="text-xs font-semibold text-brand-teal">
                      {formatCurrency(homeCareQuarterlySummary.weeklyPlannedOnDrawdown)}/wk
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono mt-1.5 pt-1 border-t border-white/[0.05] flex items-center justify-between gap-1">
                  {homeCareQuarterlySummary.plannedUnfundedDeficit > 0 ? (
                    <span className="text-red-400 font-sans font-medium truncate">
                      Over Combined ON + HC by {formatCurrency(homeCareQuarterlySummary.plannedUnfundedDeficit)}
                    </span>
                  ) : homeCareQuarterlySummary.plannedHcOverflowUsed > 0 ? (
                    <span className="text-amber-300 font-sans font-medium truncate">
                      ⚡ Uses 100% ON + {formatCurrency(homeCareQuarterlySummary.plannedHcOverflowUsed)} from HC
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-sans font-medium truncate">
                      ✓ Within ON Budget ({formatCurrency(Math.max(0, homeCareQuarterlySummary.totalOnAllocation - homeCareQuarterlySummary.fullQuarterPlannedOnDrawdown))} buffer)
                    </span>
                  )}
                </div>
              </div>

              {/* Card 3: Actual Spent vs Remaining Planned in Current Quarter */}
              <div className="bg-[#121214] border border-white/[0.08] rounded-lg p-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Actual Spent vs Remaining
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Day {homeCareQuarterlySummary.daysElapsed}/{homeCareQuarterlySummary.totalDays}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 mr-1">Spent:</span>
                      <span className="text-base font-bold text-white tracking-tight">
                        {formatCurrency(homeCareQuarterlySummary.actualOnSpentToDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 mr-1">Rem. Planned:</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {formatCurrency(homeCareQuarterlySummary.remainingQuarterPlannedOnDrawdown)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1.5 pt-1 border-t border-white/[0.05] flex items-center justify-between gap-1">
                  <span>{homeCareQuarterlySummary.daysRemaining} days left in {activeQuarter.shortLabel}</span>
                  <span>
                    Pace: <strong className="text-zinc-200">{formatCurrency(homeCareQuarterlySummary.burnRateProjectedOnSpend)}</strong>
                  </span>
                </div>
              </div>

              {/* Card 4: Projected End-of-Quarter Spend & ON -> HC Cascade Status */}
              <div
                className={`bg-[#121214] border rounded-lg p-2.5 flex flex-col justify-between ${
                  homeCareQuarterlySummary.projectedUnfundedDeficit > 0
                    ? 'border-red-500/40'
                    : homeCareQuarterlySummary.projectedHcOverflowUsed > 0
                    ? 'border-amber-500/40'
                    : 'border-brand-green/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Projected E.O.Q. Spend
                    </span>
                    {homeCareQuarterlySummary.projectedUnfundedDeficit > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                        <Flame className="w-2.5 h-2.5" /> Over ON + HC
                      </span>
                    ) : homeCareQuarterlySummary.projectedHcOverflowUsed > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        ⚡ Drawing from HC
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green border border-brand-green/30">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Within ON
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <div
                      className={`text-base font-bold tracking-tight ${
                        homeCareQuarterlySummary.projectedUnfundedDeficit > 0
                          ? 'text-red-400'
                          : homeCareQuarterlySummary.projectedHcOverflowUsed > 0
                          ? 'text-amber-300'
                          : 'text-brand-green'
                      }`}
                    >
                      {formatCurrency(homeCareQuarterlySummary.scheduleProjectedOnSpend)}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-300">
                      ON Rem: <strong>{formatCurrency(homeCareQuarterlySummary.projectedOnRemaining)}</strong>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono mt-1.5 pt-1 border-t border-white/[0.05] flex items-center justify-between gap-1">
                  {homeCareQuarterlySummary.projectedUnfundedDeficit > 0 ? (
                    <span className="text-red-400 font-sans font-medium truncate">
                      Deficit: -{formatCurrency(homeCareQuarterlySummary.projectedUnfundedDeficit)} (after {formatCurrency(homeCareQuarterlySummary.projectedHcOverflowUsed)} HC)
                    </span>
                  ) : homeCareQuarterlySummary.projectedHcOverflowUsed > 0 ? (
                    <>
                      <span className="text-amber-300 font-sans font-medium truncate">
                        ⚡ HC Draw: -{formatCurrency(homeCareQuarterlySummary.projectedHcOverflowUsed)}
                      </span>
                      <span className="text-sky-300 truncate">
                        HC Left: <strong>{formatCurrency(homeCareQuarterlySummary.projectedHcRemainingAfterOverflow)}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-400 truncate">
                      Projected ON Surplus: <strong className="text-brand-green">+{formatCurrency(homeCareQuarterlySummary.projectedOnRemaining)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Funding Streams Summary Strip (HC, AT, HM, RC, EL, etc.) */}
            {homeCareQuarterlySummary.additionalStreamsSummary.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-0.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0 pr-1">
                  <Layers className="w-3 h-3 text-sky-400" />
                  <span>Additional Streams:</span>
                </div>
                {homeCareQuarterlySummary.additionalStreamsSummary.map(s => (
                  <div
                    key={s.code}
                    className={`flex items-center gap-2.5 px-2.5 py-1 rounded-md border text-[11px] shrink-0 ${
                      s.onOverflowDraw > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-[#121214] border-white/[0.08] text-zinc-300'
                    }`}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-semibold">
                      {s.code}
                    </span>
                    <span className="font-medium text-zinc-200 truncate max-w-[150px]" title={s.name}>
                      {s.name.replace(new RegExp(`^${s.code}\\s*[-—]?\\s*`, 'i'), '')}
                    </span>
                    {s.code === 'HC' && (
                      <span className="text-[10px] text-sky-300/90 font-medium" title="Linked to ON Ongoing Funds for automatic overflow">
                        🔗 Linked to ON
                      </span>
                    )}
                    <span className="text-zinc-400 font-mono">
                      Alloc: <strong className="text-zinc-200">{formatCurrency(s.allocated)}</strong>
                    </span>
                    <span className="text-zinc-400 font-mono">
                      Spent: <strong className="text-zinc-200">{formatCurrency(s.actualSpent)}</strong>
                    </span>
                    {s.plannedFullQuarter > 0 && (
                      <span className="text-indigo-300 font-mono">
                        Planned: <strong>{formatCurrency(s.plannedFullQuarter)}</strong>
                      </span>
                    )}
                    {s.onOverflowDraw > 0 && (
                      <span className="text-amber-300 font-mono">
                        ⚡ ON Overflow: <strong>-{formatCurrency(s.onOverflowDraw)}</strong>
                      </span>
                    )}
                    <span
                      className={`font-mono font-semibold ${
                        s.projectedRemaining < 0 ? 'text-red-400' : s.onOverflowDraw > 0 ? 'text-amber-300' : 'text-sky-400'
                      }`}
                    >
                      Rem: {formatCurrency(s.projectedRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template Tabs */}
        <div className="bg-[#121214] border-b border-white/[0.08] px-4 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 pt-1 pb-1">
          {templateNames.map((name: string) => (
            <div key={name} className={`group flex items-center border-b-2 transition-colors ${activeTemplateName === name ? 'border-brand-teal' : 'border-transparent'}`}>
              <button
                onClick={() => setActiveTemplateName(name)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTemplateName === name ? 'text-brand-teal' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {name}
              </button>
              {name !== 'Default Template' && (
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2 space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameTemplate(name);
                    }}
                    className="text-zinc-500 hover:text-brand-teal p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplateTab(name);
                    }}
                    className="text-zinc-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const newName = prompt('Enter a name for the new template:');
              if (newName && newName.trim()) {
                const trimmedName = newName.trim();
                setCustomTemplateNames(prev => Array.from(new Set([...prev, trimmedName])));
                setActiveTemplateName(trimmedName);
              }
            }}
            className="px-3 py-1.5 ml-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-md flex items-center shrink-0 whitespace-nowrap transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Template
          </button>
        </div>

        {/* 7-Day Columns Grid */}
        <div className="flex-1 overflow-x-auto p-4 flex gap-4 custom-scrollbar items-stretch bg-[#121214]/10 h-full">
          {currentTemplateList.length === 0 ? (
            <div className="text-zinc-500 text-sm py-8 w-full text-center bg-[#09090b] rounded-lg border border-white/[0.08] border-dashed h-fit">
              No shifts defined for this template yet.
            </div>
          ) : (
            displayDaysOrder.map(dayIdx => {
              const dayTemplates = currentTemplateList
                .filter(t => t.day_of_week === dayIdx)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

              return (
                <div key={dayIdx} className="flex-1 min-w-[165px] flex flex-col gap-3 h-full overflow-hidden">
                  <div className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">{DAYS_OF_WEEK[dayIdx]}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-brand-teal">
                      {dayTemplates.length} SHIFT{dayTemplates.length === 1 ? '' : 'S'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                    {dayTemplates.length === 0 ? null : dayTemplates.map(t => {
                      const sType: ScheduleType = (t.schedule_type as ScheduleType) || 'ONGOING';
                      const activeFrequency = templateSettings[activeTemplateName] || 'Weekly';
                      const qStart = homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr;
                      const qOccurrences = countShiftOccurrencesInRange(t, qStart, activeQuarter.endDateStr, activeFrequency);
                      const { drawdownTotal } = getTemplateShiftOccurrenceBreakdown(t);

                      return (
                        <div key={t.id} className="flex flex-col justify-between p-3 bg-[#09090b] border border-white/[0.08] rounded-lg hover:border-white/[0.12] transition-colors group">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 pr-2">
                              <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                <div className="text-sm font-medium text-zinc-100">{t.start_time} - {t.end_time}</div>
                                {sType === 'ONE_OFF' ? (
                                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    ONE OFF {t.one_off_date ? `• ${formatDisplayDate(t.one_off_date)}` : ''}
                                  </span>
                                ) : sType === 'FIXED' ? (
                                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    FIXED {t.start_date && t.end_date ? `• ${formatDisplayDate(t.start_date)}–${formatDisplayDate(t.end_date)}` : ''}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    ONGOING{t.start_date ? ` • From ${formatDisplayDate(t.start_date)}` : ''}
                                  </span>
                                )}
                              </div>
                              <div className="mb-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-800/50 border border-white/[0.12]/50 text-[11px] text-zinc-300">
                                  Staff: {t.staff_first_name} {t.staff_last_name}
                                </span>
                              </div>
                            </div>
                            {user?.role === 'ADMIN' && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => handleEditTemplate(t)} className="p-1.5 text-zinc-400 hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors rounded-md hover:bg-white/[0.04]">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5 mt-auto">
                            {t.servicesData && t.servicesData.length > 0 ? (
                              t.servicesData.map((sd: any, idx: number) => {
                                const { rate, unit, name, fundingStream } = getServiceDetails(String(sd.serviceId), t.day_of_week, t.start_time);
                                const streamCode = String(sd.fundingStream || fundingStream || 'ON').toUpperCase();

                                const tStart = new Date(`1970-01-01T${t.start_time}:00`);
                                let tEnd = new Date(`1970-01-01T${t.end_time}:00`);
                                if (tEnd < tStart) tEnd = new Date(`1970-01-02T${t.end_time}:00`);
                                const tShiftHours = Math.max(0, (tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60));

                                const effectiveQty =
                                  sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== ''
                                    ? Number(sd.qtyOverride)
                                    : unit === 'Hour'
                                    ? tShiftHours
                                    : 1;
                                const effectiveRate =
                                  sd.rateOverride !== undefined && sd.rateOverride !== null && sd.rateOverride !== ''
                                    ? Number(sd.rateOverride)
                                    : rate;
                                const qtyText =
                                  sd.qtyOverride !== undefined && sd.qtyOverride !== null && sd.qtyOverride !== ''
                                    ? Number(sd.qtyOverride)
                                    : unit === 'Hour'
                                    ? `Auto Hrs (${tShiftHours.toFixed(2)})`
                                    : 1;
                                const totalAmount = effectiveRate * effectiveQty;

                                return (
                                  <div key={idx} className="bg-[#121214] border border-white/[0.08] rounded-md p-2">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                      <div className="flex items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 mr-2"></div>
                                        <div className="text-zinc-200 text-xs font-medium leading-tight">{name || 'Service'}</div>
                                      </div>
                                      {isClientHomeCare && (
                                        <span
                                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 border ${
                                            streamCode === 'ON'
                                              ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/30'
                                              : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                          }`}
                                          title={`Funding Stream: ${STANDARD_FUNDING_STREAM_LABELS[streamCode] || streamCode}`}
                                        >
                                          {streamCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center bg-black/30 rounded-md p-2">
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Unit</span>
                                        <span className="text-xs font-medium text-zinc-300">{unit}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Qty</span>
                                        <span className="text-xs font-medium text-zinc-300">{qtyText}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Rate</span>
                                        <span className="text-xs font-medium text-zinc-300">${effectiveRate.toFixed(2)}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Total</span>
                                        <span className="text-xs font-medium text-brand-teal">${totalAmount.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="bg-[#121214] border border-white/[0.08] rounded-md p-2 flex items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mr-2"></div>
                                <span className="text-zinc-300 text-sm font-medium">{t.service_name || 'Legacy Service'}</span>
                              </div>
                            )}

                            {isClientHomeCare && (
                              <div className="pt-1.5 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                <span>{qOccurrences} shift{qOccurrences === 1 ? '' : 's'} in {activeQuarter.shortLabel}</span>
                                <span className="text-zinc-200 font-semibold">
                                  Qtr Est: {formatCurrency(drawdownTotal * qOccurrences)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Weekly & Quarterly Total Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#09090b] flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center flex-wrap gap-5">
            <div>
              <span className="text-[12px] font-medium text-zinc-400 mr-2">Total Weekly Value</span>
              <span className="text-base font-semibold text-brand-green">{formatCurrency(weeklyTotalAmount)}</span>
            </div>
            {isClientHomeCare && homeCareQuarterlySummary && (
              <>
                <div className="h-4 w-[1px] bg-white/[0.1] hidden sm:block" />
                <div>
                  <span className="text-[12px] font-medium text-zinc-400 mr-2">
                    Planned {activeQuarter.shortLabel} Total (incl. fees)
                  </span>
                  <span className="text-base font-semibold text-brand-teal">
                    {formatCurrency(homeCareQuarterlySummary.fullQuarterPlannedOnDrawdown)}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'ADMIN' && (
              <>
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm text-zinc-400 font-medium">Frequency:</span>
                  <select
                    value={templateSettings[activeTemplateName] || 'Weekly'}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    className="bg-[#121214] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="3 Weekly">3 Weekly</option>
                    <option value="1 Monthly">1 Monthly</option>
                    <option value="2 Monthly">2 Monthly</option>
                    <option value="3 Monthly">3 Monthly</option>
                    <option value="6 Monthly">6 Monthly</option>
                    <option value="12 Monthly">12 Monthly</option>
                  </select>
                </div>
                <a
                  href={`/api/clients/${clientId}/roster-templates/pdf?token=${token}&templateName=${encodeURIComponent(activeTemplateName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#121214] hover:bg-zinc-800 text-white border border-white/[0.08] rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </a>
                <button
                  onClick={() => {
                    setRunBuilderTemplate(activeTemplateName);
                    setShowRunBuilderModal(true);
                  }}
                  className="px-3 py-1.5 bg-brand-green/80 hover:bg-brand-green text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Run Builder
                </button>
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    setDaysOfWeek(displayDaysOrder.length > 0 ? [displayDaysOrder[0]] : []);
                    setStartTime('09:00');
                    setEndTime('17:00');
                    setStaffId('');
                    setScheduleType('ONGOING');
                    setShiftStartDate(homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr);
                    setShiftEndDate(activeQuarter.endDateStr);
                    setShiftOneOffDate(todayStr);
                    setServicesData([{ serviceId: '', fundingStream: 'ON' }]);
                    setShowAddTemplateModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-brand-blue text-white rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shift
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Template Shift Modal */}
      {showAddTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl max-w-[82vw] w-[82vw] h-[84vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214]">
              <div>
                <h3 className="text-xl font-semibold text-white">{editingTemplateId ? 'Edit Template Shift' : 'Add Template Shift'}</h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Multiple services on the same day/time will belong to ONE shift.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setDaysOfWeek(displayDaysOrder.length > 0 ? [displayDaysOrder[0]] : []);
                    setStartTime('09:00');
                    setEndTime('17:00');
                    setStaffId('');
                    setScheduleType('ONGOING');
                    setShiftStartDate(homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr);
                    setShiftEndDate(activeQuarter.endDateStr);
                    setShiftOneOffDate(todayStr);
                    setServicesData([{ serviceId: '', fundingStream: 'ON' }]);
                  }}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/20 transition-colors"
                >
                  Clear All
                </button>
                <button onClick={() => setShowAddTemplateModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              <form id="add-template-form" onSubmit={handleAddTemplate} className="space-y-6 h-full flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  {/* Left Column: Schedule Type, Dates, Days, Time, Staff */}
                  <div className="space-y-4 border-r border-white/[0.08] pr-5">
                    {/* Schedule Type Selector: ONGOING / FIXED / ONE OFF */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Schedule Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleType('ONGOING')}
                          className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors text-left ${
                            scheduleType === 'ONGOING'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:bg-zinc-800'
                          }`}
                        >
                          <div className="font-bold">ONGOING</div>
                          <div className="text-[10px] opacity-80 font-normal mt-0.5">Start date, no end date</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleType('FIXED');
                            if (!shiftStartDate) setShiftStartDate(homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr);
                            if (!shiftEndDate) setShiftEndDate(activeQuarter.endDateStr);
                          }}
                          className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors text-left ${
                            scheduleType === 'FIXED'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                              : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:bg-zinc-800'
                          }`}
                        >
                          <div className="font-bold">FIXED</div>
                          <div className="text-[10px] opacity-80 font-normal mt-0.5">Start & end dates</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleType('ONE_OFF');
                            const targetDate = shiftOneOffDate || todayStr;
                            handleOneOffDateChange(targetDate);
                          }}
                          className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors text-left ${
                            scheduleType === 'ONE_OFF'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:bg-zinc-800'
                          }`}
                        >
                          <div className="font-bold">ONE OFF</div>
                          <div className="text-[10px] opacity-80 font-normal mt-0.5">Single date only</div>
                        </button>
                      </div>
                    </div>

                    {/* Date Pickers based on Schedule Type */}
                    {scheduleType === 'ONGOING' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Start Date <span className="text-zinc-500">(Ongoing — no end date)</span>
                        </label>
                        <CustomDatePicker
                          position="bottom"
                          value={shiftStartDate}
                          onChange={e => setShiftStartDate(e.target.value)}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                    )}

                    {scheduleType === 'FIXED' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date *</label>
                          <CustomDatePicker
                            position="bottom"
                            value={shiftStartDate}
                            onChange={e => setShiftStartDate(e.target.value)}
                            className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date *</label>
                          <CustomDatePicker
                            position="bottom"
                            value={shiftEndDate}
                            onChange={e => setShiftEndDate(e.target.value)}
                            className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {scheduleType === 'ONE_OFF' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">One-Off Shift Date *</label>
                        <CustomDatePicker
                          position="bottom"
                          value={shiftOneOffDate}
                          onChange={e => handleOneOffDateChange(e.target.value)}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                    )}

                    {/* Days of Week */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">
                        {scheduleType === 'ONE_OFF'
                          ? 'Day of Week (Auto-matched to One-Off Date)'
                          : editingTemplateId
                          ? 'Day of Week'
                          : 'Days of Week'}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {displayDaysOrder.map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={scheduleType === 'ONE_OFF'}
                            onClick={() => handleDayToggle(idx)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                              daysOfWeek.includes(idx)
                                ? 'bg-indigo-500/20 text-brand-teal border-brand-teal/30'
                                : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:bg-zinc-800'
                            } ${scheduleType === 'ONE_OFF' ? 'opacity-75 cursor-not-allowed' : ''}`}
                          >
                            {DAYS_OF_WEEK[idx].substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Time</label>
                        <CustomTimePicker
                          required
                          value={startTime}
                          onChange={e => handleStartTimeChange(e.target.value)}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Time</label>
                        <CustomTimePicker
                          required
                          value={endTime}
                          onChange={e => setEndTime(e.target.value)}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pref. Staff Member *</label>
                      <select
                        required
                        value={staffId}
                        onChange={e => setStaffId(e.target.value)}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                      >
                        <option value="">Select Staff</option>
                        {staff.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column: Services Provided, Funding Stream & Projected Cost Summary */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-zinc-400">Services Provided</label>
                        {isClientHomeCare && (
                          <span className="text-[11px] text-zinc-400">
                            Funding Stream linked from Home Care Pricing
                          </span>
                        )}
                      </div>

                      {servicesData.map((s, index) => {
                        const { rate, unit, fundingStream } = getServiceDetails(s.serviceId, daysOfWeek[0] ?? 1, startTime);
                        const effectiveQty =
                          s.qtyOverride !== undefined && s.qtyOverride !== null && s.qtyOverride !== ''
                            ? Number(s.qtyOverride)
                            : unit === 'Hour'
                            ? shiftHours
                            : 1;
                        const effectiveRate =
                          s.rateOverride !== undefined && s.rateOverride !== null && s.rateOverride !== ''
                            ? Number(s.rateOverride)
                            : rate;
                        const totalAmount = effectiveRate * effectiveQty;
                        const activeStream = String(s.fundingStream || fundingStream || 'ON').toUpperCase();

                        return (
                          <div key={index} className="bg-[#121214] border border-white/[0.08] rounded-md p-3">
                            <select
                              required
                              value={String(s.serviceId || '')}
                              onChange={e => handleServiceChange(index, e.target.value)}
                              className="w-full bg-[#09090b] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm text-white focus:border-brand-teal outline-none mb-2"
                            >
                              <option value="">-- Choose Service --</option>
                              {clientPersonalisedServices.map(cs => (
                                <option key={cs.id} value={String(cs.id)} className="truncate">
                                  {cs.name}
                                  {isClientHomeCare && cs.funding_stream ? ` [${String(cs.funding_stream).toUpperCase()}]` : ''}
                                </option>
                              ))}
                            </select>

                            {s.serviceId && (
                              <div className="space-y-2.5 mt-2 pt-2 border-t border-white/[0.08]">
                                {isClientHomeCare && (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                      Funding Stream
                                    </span>
                                    <select
                                      value={activeStream}
                                      onChange={e => updateServiceEntry(index, 'fundingStream', e.target.value)}
                                      className="bg-[#09090b] border border-white/[0.12] rounded px-2 py-1 text-xs font-mono text-brand-teal focus:border-brand-teal outline-none"
                                    >
                                      {availableFundingStreamOptions.map(opt => (
                                        <option key={opt.code} value={opt.code}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Rate</span>
                                      <input
                                        type="number"
                                        min="0.00"
                                        step="0.01"
                                        value={s.rateOverride !== undefined && s.rateOverride !== null ? s.rateOverride : (rate > 0 ? rate.toFixed(2) : '')}
                                        onChange={(e) => updateServiceEntry(index, 'rateOverride', e.target.value)}
                                        placeholder={`$${rate.toFixed(2)}`}
                                        className="w-24 bg-[#09090b] border border-white/[0.08] rounded px-1.5 py-1 text-sm text-zinc-200 focus:border-brand-teal outline-none"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{unit === 'Hour' ? 'Hrs' : 'Qty'}</span>
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={s.qtyOverride !== undefined && s.qtyOverride !== null ? s.qtyOverride : (unit === 'Hour' ? shiftHours : 1)}
                                        onChange={(e) => updateServiceEntry(index, 'qtyOverride', e.target.value)}
                                        placeholder={String(effectiveQty)}
                                        className="w-16 bg-[#09090b] border border-white/[0.08] rounded px-1.5 py-1 text-sm text-zinc-200 focus:border-brand-teal outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-brand-teal">${totalAmount.toFixed(2)}</span>
                                    {servicesData.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveServiceEntry(index)}
                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-md"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={handleAddServiceEntry}
                        className="w-full py-2 bg-[#121214] hover:bg-zinc-800 border border-white/[0.08] border-dashed text-zinc-300 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Service
                      </button>
                    </div>

                    {/* Live Cost Projection Box over Selected Dates / Quarter */}
                    <div className="bg-[#121214] border border-brand-teal/25 rounded-lg p-3.5 mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
                          Projected Shift Cost ({scheduleType === 'ONE_OFF' ? 'One-Off Date' : scheduleType === 'FIXED' ? 'Fixed Range' : `${activeQuarter.shortLabel} Projection`})
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {scheduleType === 'ONE_OFF'
                            ? formatDisplayDate(modalShiftProjection.projStartStr)
                            : `${formatDisplayDate(modalShiftProjection.projStartStr)} – ${formatDisplayDate(modalShiftProjection.projEndStr)}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-black/40 border border-white/[0.06] rounded p-2">
                          <div className="text-[10px] text-zinc-400 uppercase">Cost Per Shift</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {formatCurrency(isClientHomeCare ? modalShiftProjection.perShiftDrawdown : modalShiftProjection.perShiftBase)}
                          </div>
                          {isClientHomeCare && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Base: {formatCurrency(modalShiftProjection.perShiftBase)}
                            </div>
                          )}
                        </div>

                        <div className="bg-black/40 border border-white/[0.06] rounded p-2">
                          <div className="text-[10px] text-zinc-400 uppercase">Projected Shifts</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {modalShiftProjection.totalOccurrences} shift{modalShiftProjection.totalOccurrences === 1 ? '' : 's'}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {templateSettings[activeTemplateName] || 'Weekly'}
                          </div>
                        </div>

                        <div className="bg-black/40 border border-brand-teal/20 rounded p-2">
                          <div className="text-[10px] text-brand-teal uppercase font-semibold">Projected Total</div>
                          <div className="text-sm font-bold text-brand-teal mt-0.5">
                            {formatCurrency(isClientHomeCare ? modalShiftProjection.totalProjectedDrawdown : modalShiftProjection.totalProjectedBase)}
                          </div>
                          {isClientHomeCare && Object.keys(modalShiftProjection.byStreamProjected).length > 0 && (
                            <div className="text-[10px] text-zinc-400 font-mono truncate">
                              {Object.entries(modalShiftProjection.byStreamProjected)
                                .map(([code, amt]) => `${code}: ${formatCurrency(amt)}`)
                                .join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#121214] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-white rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-template-form"
                className="px-5 py-2 bg-indigo-500 hover:bg-brand-blue text-white rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
              >
                {editingTemplateId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingTemplateId ? 'Update Shift' : 'Save Shift Template'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Run Builder Modal */}
      {showRunBuilderModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl max-w-md w-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214] rounded-t-xl">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-brand-teal mr-2.5" />
                <h3 className="text-xl font-semibold text-white">Run Roster Builder</h3>
              </div>
              <button onClick={() => setShowRunBuilderModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Template to Build</label>
                <select
                  value={runBuilderTemplate}
                  onChange={(e) => setRunBuilderTemplate(e.target.value)}
                  className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                >
                  <option value="All Templates">All Templates</option>
                  {templateNames.map((name: string) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Duration Preset</label>
                <select
                  value={generateDuration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                >
                  {isClientHomeCare && (
                    <option value="Current Quarter">Current Quarter ({activeQuarter.shortLabel}: {activeQuarter.displayRange})</option>
                  )}
                  <option value="Week">1 Week</option>
                  <option value="Fortnight">1 Fortnight</option>
                  <option value="Month">1 Month</option>
                  <option value="2 Months">2 Months</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="9 Months">9 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
                  <CustomDatePicker
                    position="bottom"
                    value={generateStartDate}
                    onChange={e => {
                      const newStartStr = e.target.value;
                      setGenerateStartDate(newStartStr);
                      if (!newStartStr || generateDuration === 'Current Quarter') return;
                      const [y, m, d] = newStartStr.split('-');
                      const start = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
                      let end = new Date(start);
                      if (generateDuration === 'Week') end.setDate(start.getDate() + 6);
                      else if (generateDuration === 'Fortnight') end.setDate(start.getDate() + 13);
                      else if (generateDuration === 'Month') end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0);
                      else if (generateDuration === '2 Months') end = new Date(start.getFullYear(), start.getMonth() + 2, 0, 12, 0, 0);
                      else if (generateDuration === '3 Months') end = new Date(start.getFullYear(), start.getMonth() + 3, 0, 12, 0, 0);
                      else if (generateDuration === '6 Months') end = new Date(start.getFullYear(), start.getMonth() + 6, 0, 12, 0, 0);
                      else if (generateDuration === '9 Months') end = new Date(start.getFullYear(), start.getMonth() + 9, 0, 12, 0, 0);
                      else if (generateDuration === '12 Months') end = new Date(start.getFullYear(), start.getMonth() + 12, 0, 12, 0, 0);
                      const yEnd = end.getFullYear();
                      const mEnd = String(end.getMonth() + 1).padStart(2, '0');
                      const dEnd = String(end.getDate()).padStart(2, '0');
                      setGenerateEndDate(`${yEnd}-${mEnd}-${dEnd}`);
                    }}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
                  <CustomDatePicker
                    position="bottom"
                    value={generateEndDate}
                    onChange={e => setGenerateEndDate(e.target.value)}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4 pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="clearExisting"
                    checked={clearExisting}
                    onChange={(e) => setClearExisting(e.target.checked)}
                    className="w-4 h-4 bg-transparent border-white/[0.2] rounded text-brand-teal focus:ring-brand-teal focus:ring-offset-bg-black"
                  />
                  <label htmlFor="clearExisting" className="text-sm font-medium text-zinc-300 select-none cursor-pointer">
                    Clear all existing client shifts in this period
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 ml-6">
                  Completed, In-Progress, and Cancelled shifts will remain intact.
                </p>
              </div>

              <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3 text-sm text-brand-blue">
                This will automatically create draft shifts for this client based on their active templates (respecting ONGOING, FIXED, and ONE OFF dates) for the selected period.
              </div>

              {generateResult && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-green-400 text-sm font-medium">Created {generateResult.createdCount} draft shifts successfully.</h4>
                  </div>
                  {generateResult.conflicts && generateResult.conflicts.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center text-amber-500 mb-2 text-xs font-medium tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                        Conflicts & Warnings
                      </div>
                      <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {generateResult.conflicts.map((c: any, i: number) => (
                          <li key={i} className="text-[11px] text-zinc-300 bg-black/40 p-2 rounded-md border border-white/[0.05] leading-snug">
                            <strong className="text-white block mb-0.5">{c.date} ({c.startTime}-{c.endTime})</strong>
                            <span className="text-zinc-400">{c.message}</span>
                            <div className="text-zinc-500 mt-1">✓ Unassigned draft created.</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#121214] rounded-b-xl flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowRunBuilderModal(false)}
                className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] text-white rounded-md text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleGenerateRoster}
                disabled={generating || templates.length === 0}
                className="px-5 py-2 bg-brand-green/80 hover:bg-brand-green text-white disabled:bg-zinc-800 disabled:text-zinc-500 rounded-md text-sm font-bold transition-all shadow-md flex items-center justify-center shrink-0 active:scale-[0.98]"
              >
                {generating ? 'Generating...' : 'Build Shifts'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showConflictsModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mr-2.5" />
                <h3 className="text-xl font-bold text-white tracking-tight">Roster Conflicts Warning</h3>
              </div>
              <button onClick={() => setShowConflictsModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-[#09090b]">
              <div className="text-sm text-zinc-300">
                Please review the items below. Proceeding will overwrite existing scheduled shifts in the selected date range.
              </div>

              {staffConflictsList.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                    Staff Booking Conflicts ({staffConflictsList.length})
                  </h4>
                  <div className="bg-[#121214] border border-white/[0.05] rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-3 leading-snug">
                      The following staff members are already booked or unavailable. Overwritten shifts will be created as <strong>Unassigned</strong>.
                    </p>
                    <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {staffConflictsList.map((c: any, i: number) => (
                        <li key={i} className="flex flex-col bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md">
                          <span className="text-sm font-medium text-amber-100">{c.date} ({c.startTime} - {c.endTime})</span>
                          <span className="text-xs text-amber-300/80 mt-0.5">{c.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {existingShiftsCount > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center">
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Direct Client Shift Clashes ({existingShiftsCount})
                  </h4>
                  <div className="bg-[#121214] border border-white/[0.05] rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-3 leading-snug">
                      The following scheduled shifts clash (overlap in time) with the shifts being built. Overwriting will replace <strong>only these conflicting shifts</strong>. Shifts from your other templates remain completely safe and untouched.
                    </p>
                    {clientConflictsList.length > 0 && (
                      <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {clientConflictsList.map((s: any) => (
                          <li key={s.id} className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-md">
                            <span className="text-sm font-medium text-rose-100">{s.date} ({s.startTime} - {s.endTime})</span>
                            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">Overlaps Slot</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/[0.08] bg-[#18181b] rounded-b-xl flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowConflictsModal(false)}
                disabled={resolvingConflicts}
                className="px-5 py-2 hover:bg-white/[0.04] text-zinc-300 hover:text-white rounded-md text-sm font-medium transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveConflicts}
                disabled={resolvingConflicts}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-sm font-medium transition-all flex items-center shadow-md active:scale-95"
                type="button"
              >
                {resolvingConflicts ? 'Overwriting...' : 'Overwrite Clashing Shifts & Build'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Build History Modal */}
      <ClientRosterBuildHistory
        clientId={clientId}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onRevertSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
