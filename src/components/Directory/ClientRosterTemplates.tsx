import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Calendar, AlertCircle, X, History, Download, Edit2, Layers, CheckCircle2, Flame, ChevronLeft, ChevronRight, ChevronDown, RotateCcw, Copy, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';
import CustomTimePicker from '../ui/CustomTimePicker';
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

interface TemplateSettingItem {
  template_name: string;
  frequency: string;
  is_active: number;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  sort_order?: number;
  created_at?: string | null;
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

const SHIFT_FREQUENCY_OPTIONS = [
  'Weekly',
  'Fortnightly',
  '3 Weekly',
  '1 Monthly',
  '2 Monthly',
  '3 Monthly',
  '6 Monthly',
  '12 Monthly'
];

const getWeeklyFrequencyMultiplier = (freq: string) => {
  if (freq === 'Fortnightly') return 1 / 2;
  if (freq === '3 Weekly') return 1 / 3;
  if (freq === '1 Monthly') return 1 / 4;
  if (freq === '2 Monthly') return 1 / 8;
  if (freq === '3 Monthly') return 1 / 13;
  if (freq === '6 Monthly') return 1 / 26;
  if (freq === '12 Monthly') return 1 / 52;
  return 1;
};

const getFrequencyBadgeStyle = (freq: string) => {
  if (freq === 'Weekly') return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  if (freq === 'Fortnightly') return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  if (freq === '3 Weekly') return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30';
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

const parseFundingStreamCodes = (raw?: string | null): string[] => {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean);
};

const getPrimaryFundingStreamCode = (raw?: string | null): string => {
  const codes = parseFundingStreamCodes(raw);
  if (codes.length === 0 || codes.includes('ON')) return 'ON';
  return codes.find(c => c !== 'HC') || codes[0] || 'ON';
};

const resolveShiftServiceFundingStream = (
  shiftSavedStream?: string | null,
  serviceDefaultStream?: string | null
): string => {
  const srvStream = String(serviceDefaultStream || 'ON,HC').toUpperCase();
  const savedStream = String(shiftSavedStream || '').trim().toUpperCase();
  if (!savedStream) return srvStream;
  if (savedStream === 'ON' && parseFundingStreamCodes(srvStream).includes('ON')) {
    return srvStream;
  }
  return savedStream;
};

export default function ClientRosterTemplates({ client }: ClientRosterTemplatesProps) {
  const clientId = client?.id;
  const { token, user, settings } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSettings, setTemplateSettings] = useState<Record<string, string>>({});
  const [templateSettingsList, setTemplateSettingsList] = useState<TemplateSettingItem[]>([]);
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
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);

  // Visual Template History & New Template Modal State
  const [showTemplateHistoryMenu, setShowTemplateHistoryMenu] = useState(false);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState('');
  const [newTemplateEffectiveDate, setNewTemplateEffectiveDate] = useState('');
  const [newTemplateCopyCards, setNewTemplateCopyCards] = useState(true);
  const [creatingNewTemplate, setCreatingNewTemplate] = useState(false);
  const [updatingEffectiveDate, setUpdatingEffectiveDate] = useState(false);

  // Ordered list of visual Monday-Sunday templates (oldest on left -> current active on right)
  const visualTemplatesList = useMemo<TemplateSettingItem[]>(() => {
    const map = new Map<string, TemplateSettingItem>();
    templateSettingsList.forEach(item => {
      map.set(item.template_name, {
        template_name: item.template_name,
        frequency: item.frequency || 'Weekly',
        is_active: Number(item.is_active) === 1 ? 1 : 0,
        effective_start_date: item.effective_start_date || null,
        effective_end_date: item.effective_end_date || null,
        sort_order: Number(item.sort_order) || 0,
        created_at: item.created_at || null
      });
    });
    templates.forEach(t => {
      const tName = t.template_name || 'Default Template';
      if (!map.has(tName)) {
        map.set(tName, {
          template_name: tName,
          frequency: 'Weekly',
          is_active: map.size === 0 ? 1 : 0,
          effective_start_date: null,
          effective_end_date: null,
          sort_order: map.size + 1,
          created_at: null
        });
      }
    });
    if (map.size === 0) {
      map.set('Default Template', {
        template_name: 'Default Template',
        frequency: 'Weekly',
        is_active: 1,
        effective_start_date: null,
        effective_end_date: null,
        sort_order: 1,
        created_at: null
      });
    }
    const list = Array.from(map.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!list.some(x => x.is_active === 1) && list.length > 0) {
      list[list.length - 1].is_active = 1;
    }
    return list;
  }, [templateSettingsList, templates]);

  const liveActiveTemplateObj = useMemo(() => {
    return visualTemplatesList.find(t => t.is_active === 1) || visualTemplatesList[visualTemplatesList.length - 1];
  }, [visualTemplatesList]);

  const viewedTemplateIndex = useMemo(() => {
    const idx = visualTemplatesList.findIndex(t => t.template_name === activeTemplateName);
    return idx !== -1 ? idx : Math.max(0, visualTemplatesList.length - 1);
  }, [visualTemplatesList, activeTemplateName]);

  const viewedTemplateObj = useMemo(() => {
    return visualTemplatesList[viewedTemplateIndex] || liveActiveTemplateObj;
  }, [visualTemplatesList, viewedTemplateIndex, liveActiveTemplateObj]);

  const isViewingHistorical = Boolean(
    viewedTemplateObj &&
      liveActiveTemplateObj &&
      viewedTemplateObj.template_name !== liveActiveTemplateObj.template_name &&
      visualTemplatesList.length > 1
  );

  // Schedule Type, Frequency & Date Range State for Add/Edit Shift Modal
  const [scheduleType, setScheduleType] = useState<ScheduleType>('ONGOING');
  const [shiftFrequency, setShiftFrequency] = useState<string>('Weekly');
  const [shiftStartDate, setShiftStartDate] = useState<string>('');
  const [shiftEndDate, setShiftEndDate] = useState<string>('');
  const [shiftOneOffDate, setShiftOneOffDate] = useState<string>('');

  const getShiftFrequency = (t: any) => {
    return t?.frequency || templateSettings[t?.template_name || 'Default Template'] || 'Weekly';
  };

  const currentTemplateList = useMemo(() => {
    const targetName = viewedTemplateObj?.template_name || activeTemplateName || 'Default Template';
    return templates.filter(t => (t.template_name || 'Default Template') === targetName);
  }, [templates, viewedTemplateObj, activeTemplateName]);

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
        if (Array.isArray(settingsData)) {
          settingsData.forEach((s: any) => {
            settingsMap[s.template_name] = s.frequency;
          });
          setTemplateSettingsList(settingsData);
          const activeRow =
            settingsData.find((s: any) => Number(s.is_active) === 1) ||
            settingsData[settingsData.length - 1];
          if (activeRow?.template_name) {
            setActiveTemplateName(prev => {
              const stillExists = settingsData.some((s: any) => s.template_name === prev);
              return stillExists && prev !== 'Default Template' ? prev : activeRow.template_name;
            });
          }
        }
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
    if (!service) return { rate: 0, unit: 'Hour', name: '', fundingStream: 'ON,HC' };

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

    const rawFundingStream = service.funding_stream
      ? String(service.funding_stream).trim().toUpperCase()
      : finalRate > 0 || baseRate > 0
      ? 'ON,HC'
      : 'ON';
    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name, fundingStream: rawFundingStream };
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
        const effectiveStreamStr = resolveShiftServiceFundingStream(sd.fundingStream, sDetails.fundingStream);
        const streamCode = getPrimaryFundingStreamCode(effectiveStreamStr);
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
      const streamCode = getPrimaryFundingStreamCode(sDetails.fundingStream);
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
      const shiftFreq = getShiftFrequency(t);
      const { baseTotal } = getTemplateShiftOccurrenceBreakdown(t);
      total += baseTotal * getWeeklyFrequencyMultiplier(shiftFreq);
    });
    return round2(total);
  }, [currentTemplateList, servicesList, templateSettings]);

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

    // Helper to normalize any ledger date (DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD) to YYYY-MM-DD
    const normalizeLedgerDateYmd = (rawDate?: string | null): string => {
      if (!rawDate) return '';
      const clean = String(rawDate).trim().split('T')[0];
      if (clean.includes('/')) {
        const p = clean.split('/');
        if (p.length === 3) {
          return p[0].length === 4
            ? `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`
            : `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
      }
      const p = clean.split('-');
      if (p.length === 3) {
        return p[0].length === 4
          ? `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`
          : `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return clean;
    };

    // 4. Process live ledger items for the current quarter
    const processedLedger = quarterLedgerItems.map((item: any) => {
      const itemStream = getPrimaryFundingStreamCode(item.funding_stream || 'ON');
      const dateYmd = normalizeLedgerDateYmd(item.date);
      if (item.source_type === 'external' || item.grand_total !== undefined) {
        const baseAmt = Number(item.base_amount ?? item.amount) || 0;
        const ccFee = item.care_coord_fee !== undefined ? Number(item.care_coord_fee) : baseAmt * (careCoordPercent / 100);
        const sub = baseAmt + ccFee;
        const mgmt = item.management_fee !== undefined ? Number(item.management_fee) : sub * (serviceLoadingPercent / 100);
        const gTotal = item.grand_total !== undefined ? Number(item.grand_total) : sub + mgmt;
        return { ...item, dateYmd, baseAmt, funding_stream: itemStream, amount: gTotal };
      }
      const baseAmt = Number(item.base_amount ?? item.amount) || 0;
      return { ...item, dateYmd, baseAmt, funding_stream: itemStream, amount: applyShiftDrawdownFees(baseAmt) };
    });

    const actualOnSpentToDate = round2(
      processedLedger
        .filter((item: any) => !separateStreamCodes.has(getPrimaryFundingStreamCode(item.funding_stream)))
        .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
    );

    // Latest performed shift date in the active quarter (for fresh-slate cutoff discovery)
    const latestPerformedShiftDateStr = processedLedger
      .filter((item: any) => item.source_type === 'shift' && item.dateYmd)
      .reduce((maxD: string, item: any) => (item.dateYmd > maxD ? item.dateYmd : maxD), '');

    // 5. Determine the Active/Viewed Template's Effective Date Window inside the Active Quarter
    // Always evaluate the budget summary against the currently viewed template (or liveActiveTemplateObj)
    const targetBudgetTemplateObj = viewedTemplateObj || liveActiveTemplateObj;
    const targetBudgetShifts = currentTemplateList;

    // Infer template effective start date if set on template settings OR if ONGOING shifts have a start_date inside the quarter
    let rawTemplateStartStr = targetBudgetTemplateObj?.effective_start_date
      ? String(targetBudgetTemplateObj.effective_start_date).split('T')[0]
      : '';
    if (!rawTemplateStartStr && targetBudgetShifts.length > 0) {
      const ongoingStarts = targetBudgetShifts
        .filter(t => ((t.schedule_type as ScheduleType) || 'ONGOING') === 'ONGOING' && t.start_date)
        .map(t => String(t.start_date).split('T')[0])
        .filter(Boolean)
        .sort();
      if (ongoingStarts.length > 0) {
        rawTemplateStartStr = ongoingStarts[0];
      }
    }

    const templateEffectiveStartStr =
      rawTemplateStartStr && rawTemplateStartStr > actualStartDateStr && rawTemplateStartStr <= activeQuarter.endDateStr
        ? rawTemplateStartStr
        : actualStartDateStr;

    const rawTemplateEndStr = targetBudgetTemplateObj?.effective_end_date
      ? String(targetBudgetTemplateObj.effective_end_date).split('T')[0]
      : '';
    const templateEffectiveEndStr =
      rawTemplateEndStr && rawTemplateEndStr >= templateEffectiveStartStr && rawTemplateEndStr < activeQuarter.endDateStr
        ? rawTemplateEndStr
        : activeQuarter.endDateStr;

    const hasMidQuarterCutover = templateEffectiveStartStr > actualStartDateStr;

    // 5a. Locked-in historical spend before templateEffectiveStartStr (plus any one-off external consumable purchases in the quarter when cutover is active)
    let lockedPriorOnDrawdown = 0;
    let lockedPriorOnBase = 0;
    const plannedDrawdownByStream: Record<string, { fullQuarter: number; remainingQuarter: number }> = {};

    if (hasMidQuarterCutover) {
      processedLedger.forEach((item: any) => {
        const isBeforeTemplateStart = Boolean(item.dateYmd && item.dateYmd < templateEffectiveStartStr);
        const isExternalOneOffOnOrAfter =
          Boolean(item.source_type === 'external' && item.dateYmd && item.dateYmd >= templateEffectiveStartStr);
        if (!isBeforeTemplateStart && !isExternalOneOffOnOrAfter) return;

        const streamCode = getPrimaryFundingStreamCode(item.funding_stream);
        const itemDrawdown = Number(item.amount) || 0;
        const itemBase = Number(item.baseAmt) || 0;

        if (!plannedDrawdownByStream[streamCode]) {
          plannedDrawdownByStream[streamCode] = { fullQuarter: 0, remainingQuarter: 0 };
        }
        plannedDrawdownByStream[streamCode].fullQuarter += itemDrawdown;

        if (!separateStreamCodes.has(streamCode)) {
          lockedPriorOnDrawdown += itemDrawdown;
          lockedPriorOnBase += itemBase;
        }
      });
    }

    // 5b. Calculate Planned Roster Spend across Template Shifts (from templateEffectiveStartStr to templateEffectiveEndStr, and Remaining Days from Tomorrow)
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const tomorrowD = new Date(ty, tm - 1, td + 1, 12, 0, 0);
    const tomorrowStr = `${tomorrowD.getFullYear()}-${String(tomorrowD.getMonth() + 1).padStart(2, '0')}-${String(tomorrowD.getDate()).padStart(2, '0')}`;
    const remainingStartStr = tomorrowStr > templateEffectiveStartStr ? tomorrowStr : templateEffectiveStartStr;

    let templatePlannedOnDrawdown = 0;
    let templatePlannedBase = 0;
    let remainingQuarterPlannedOnDrawdown = 0;

    // Group ONGOING weekly/recurring services by service+stream when mid-quarter cutover is active so daily pro-rata (Weekly / 7 * Days) matches Trilogy Care to the cent
    const ongoingWeeklyBaseByGroup: Record<string, { weeklyBase: number; streamCode: string; startStr: string; endStr: string }> = {};

    targetBudgetShifts.forEach(t => {
      const sType: ScheduleType = (t.schedule_type as ScheduleType) || 'ONGOING';
      const shiftFreq = getShiftFrequency(t);
      const effectiveShiftStart =
        t.start_date && String(t.start_date).split('T')[0] > templateEffectiveStartStr
          ? String(t.start_date).split('T')[0]
          : templateEffectiveStartStr;
      const effectiveShiftEnd =
        sType === 'FIXED' && t.end_date && String(t.end_date).split('T')[0] < templateEffectiveEndStr
          ? String(t.end_date).split('T')[0]
          : templateEffectiveEndStr;

      const remOccurrences = countShiftOccurrencesInRange(
        { ...t, start_date: effectiveShiftStart },
        remainingStartStr,
        effectiveShiftEnd,
        shiftFreq
      );
      const { baseTotal, byStream } = getTemplateShiftOccurrenceBreakdown(t);

      // Remaining quarter projection (from tomorrow forward) always counts upcoming occurrences
      Object.entries(byStream).forEach(([streamCode, amounts]) => {
        const remStreamDrawdown = amounts.drawdown * remOccurrences;
        if (!plannedDrawdownByStream[streamCode]) {
          plannedDrawdownByStream[streamCode] = { fullQuarter: 0, remainingQuarter: 0 };
        }
        plannedDrawdownByStream[streamCode].remainingQuarter += remStreamDrawdown;
        if (!separateStreamCodes.has(streamCode)) {
          remainingQuarterPlannedOnDrawdown += remStreamDrawdown;
        }
      });

      // Full-quarter / active-window planned calculation
      if (hasMidQuarterCutover && sType === 'ONGOING') {
        const freqMult = getWeeklyFrequencyMultiplier(shiftFreq);
        const tStart = new Date(`1970-01-01T${t.start_time}:00`);
        let tEnd = new Date(`1970-01-01T${t.end_time}:00`);
        if (tEnd < tStart) tEnd = new Date(`1970-01-02T${t.end_time}:00`);
        const tShiftHours = Math.max(0, (tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60));

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
            const effectiveStreamStr = resolveShiftServiceFundingStream(sd.fundingStream, sDetails.fundingStream);
            const streamCode = getPrimaryFundingStreamCode(effectiveStreamStr);
            const srvWeeklyBase = effectiveRate * effectiveQty * freqMult;
            const groupKey = `${sd.serviceId}|${streamCode}|${effectiveShiftStart}|${effectiveShiftEnd}`;
            if (!ongoingWeeklyBaseByGroup[groupKey]) {
              ongoingWeeklyBaseByGroup[groupKey] = {
                weeklyBase: 0,
                streamCode,
                startStr: effectiveShiftStart,
                endStr: effectiveShiftEnd
              };
            }
            ongoingWeeklyBaseByGroup[groupKey].weeklyBase += srvWeeklyBase;
          });
        } else if (t.service_id) {
          const sDetails = getServiceDetails(String(t.service_id), t.day_of_week, t.start_time);
          const streamCode = getPrimaryFundingStreamCode(sDetails.fundingStream);
          const srvWeeklyBase = sDetails.rate * tShiftHours * freqMult;
          const groupKey = `${t.service_id}|${streamCode}|${effectiveShiftStart}|${effectiveShiftEnd}`;
          if (!ongoingWeeklyBaseByGroup[groupKey]) {
            ongoingWeeklyBaseByGroup[groupKey] = {
              weeklyBase: 0,
              streamCode,
              startStr: effectiveShiftStart,
              endStr: effectiveShiftEnd
            };
          }
          ongoingWeeklyBaseByGroup[groupKey].weeklyBase += srvWeeklyBase;
        }
      } else {
        const fullOccurrences = countShiftOccurrencesInRange(
          { ...t, start_date: effectiveShiftStart },
          effectiveShiftStart,
          effectiveShiftEnd,
          shiftFreq
        );
        templatePlannedBase += baseTotal * fullOccurrences;
        Object.entries(byStream).forEach(([streamCode, amounts]) => {
          const fullStreamDrawdown = amounts.drawdown * fullOccurrences;
          if (!plannedDrawdownByStream[streamCode]) {
            plannedDrawdownByStream[streamCode] = { fullQuarter: 0, remainingQuarter: 0 };
          }
          plannedDrawdownByStream[streamCode].fullQuarter += fullStreamDrawdown;
          if (!separateStreamCodes.has(streamCode)) {
            templatePlannedOnDrawdown += fullStreamDrawdown;
          }
        });
      }
    });

    // Finalize pro-rated ONGOING groups when mid-quarter cutover is active (Weekly / 7 -> rounded daily rate * days + fees)
    Object.values(ongoingWeeklyBaseByGroup).forEach(grp => {
      if (grp.startStr > grp.endStr) return;
      const sD = new Date(`${grp.startStr}T00:00:00`);
      const eD = new Date(`${grp.endStr}T00:00:00`);
      const periodDays = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const dailyRate = round2(grp.weeklyBase / 7);
      const periodBase = round2(dailyRate * periodDays);
      const ccFee = round2(periodBase * (careCoordPercent / 100));
      const loadingFee = round2((periodBase + ccFee) * (serviceLoadingPercent / 100));
      const periodDrawdown = round2(periodBase + ccFee + loadingFee);

      templatePlannedBase += periodBase;
      if (!plannedDrawdownByStream[grp.streamCode]) {
        plannedDrawdownByStream[grp.streamCode] = { fullQuarter: 0, remainingQuarter: 0 };
      }
      plannedDrawdownByStream[grp.streamCode].fullQuarter += periodDrawdown;
      if (!separateStreamCodes.has(grp.streamCode)) {
        templatePlannedOnDrawdown += periodDrawdown;
      }
    });

    lockedPriorOnDrawdown = round2(lockedPriorOnDrawdown);
    lockedPriorOnBase = round2(lockedPriorOnBase);
    templatePlannedOnDrawdown = round2(templatePlannedOnDrawdown);
    templatePlannedBase = round2(templatePlannedBase);

    const fullQuarterPlannedOnDrawdown = round2(lockedPriorOnDrawdown + templatePlannedOnDrawdown);
    const fullQuarterPlannedBase = round2(lockedPriorOnBase + templatePlannedBase);
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

    // 8. Build Additional Funding Streams Summary List (HC first, followed by any other configured/used separate streams)
    const allAdditionalCodes = Array.from(
      new Set([
        ...separateStreams.map((s: any) => String(s.code).toUpperCase()),
        ...Object.keys(plannedDrawdownByStream).filter(code => code !== 'ON')
      ])
    ).sort((a, b) => {
      if (a === 'HC') return -1;
      if (b === 'HC') return 1;
      return a.localeCompare(b);
    });

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
      templateEffectiveStartStr,
      templateEffectiveEndStr,
      hasMidQuarterCutover,
      lockedPriorOnDrawdown,
      templatePlannedOnDrawdown,
      latestPerformedShiftDateStr,
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
    viewedTemplateObj,
    liveActiveTemplateObj,
    todayStr,
    currentTemplateList,
    weeklyTotalAmount,
    servicesList
  ]);

  // Available funding stream choices for the Add/Edit Shift Modal dropdown
  const availableFundingStreamOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();
    optionsMap.set('ON,HC', 'ON + HC — Ongoing Funds + Home Care Account (Linked)');
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
    const activeFrequency = scheduleType === 'ONE_OFF' ? 'One-Off' : shiftFrequency;
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

        const effectiveStreamStr = resolveShiftServiceFundingStream(s.fundingStream, sDetails.fundingStream);
        const streamCode = getPrimaryFundingStreamCode(effectiveStreamStr);
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
    shiftFrequency,
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
            frequency: scheduleType === 'ONE_OFF' ? 'One-Off' : shiftFrequency,
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
              frequency: scheduleType === 'ONE_OFF' ? 'One-Off' : shiftFrequency,
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

  const handleClearTemplate = async () => {
    const targetName = viewedTemplateObj?.template_name || activeTemplateName || 'Default Template';
    if (!confirm(`Are you sure you want to clear all template shifts in "${targetName}"?`)) return;
    try {
      const res = await fetch(
        `/api/clients/${clientId}/roster-templates/clear?templateName=${encodeURIComponent(targetName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
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

  // Open the "+ New Template" modal with auto-detected fresh-slate start date
  const handleOpenNewTemplateModal = () => {
    const nextIdx = visualTemplatesList.length + 1;
    setNewTemplateNameInput(`Template ${nextIdx}`);
    // Auto-detect fresh-slate start date: day after latest performed shift in the quarter, or todayStr
    let suggestedStart = todayStr;
    if (homeCareQuarterlySummary?.latestPerformedShiftDateStr) {
      const [ly, lm, ld] = homeCareQuarterlySummary.latestPerformedShiftDateStr.split('-').map(Number);
      const nextD = new Date(ly, lm - 1, ld + 1, 12, 0, 0);
      suggestedStart = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-${String(nextD.getDate()).padStart(2, '0')}`;
    }
    setNewTemplateEffectiveDate(suggestedStart);
    setNewTemplateCopyCards(true);
    setShowNewTemplateModal(true);
  };

  // Execute "+ New Template": revert uncompleted calendar shifts, archive previous template, create & switch to new active template
  const handleCreateNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !clientId) return;
    setCreatingNewTemplate(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/new-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          newTemplateName: newTemplateNameInput.trim() || `Template ${visualTemplatesList.length + 1}`,
          sourceTemplateName: viewedTemplateObj?.template_name || activeTemplateName,
          effectiveStartDate: newTemplateEffectiveDate || todayStr,
          previousStartDate:
            viewedTemplateObj?.effective_start_date ||
            homeCareQuarterlySummary?.actualStartDateStr ||
            activeQuarter.startDateStr,
          copyCurrentShifts: newTemplateCopyCards,
          revertUncompletedShifts: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowNewTemplateModal(false);
        setActiveTemplateName(data.newTemplateName);
        await fetchData();
        window.dispatchEvent(new CustomEvent('offline-sync-completed'));
      } else {
        alert(data.error || 'Failed to create new template.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating new template.');
    } finally {
      setCreatingNewTemplate(false);
    }
  };

  // Update the viewed template's effective start date directly from the header date picker
  const handleUpdateTemplateEffectiveDate = async (newDateStr: string) => {
    if (!token || !clientId || !viewedTemplateObj) return;
    setUpdatingEffectiveDate(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/template-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          templateName: viewedTemplateObj.template_name,
          frequency: viewedTemplateObj.frequency || 'Weekly',
          effectiveStartDate: newDateStr || null,
          effectiveEndDate: viewedTemplateObj.effective_end_date || null
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to update template effective date:', err);
    } finally {
      setUpdatingEffectiveDate(false);
    }
  };

  // Activate a historical template as the live active template
  const handleActivateVisualTemplate = async (templateName: string) => {
    if (!token || !clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-templates/activate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateName })
      });
      if (res.ok) {
        setActiveTemplateName(templateName);
        setShowTemplateHistoryMenu(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to activate template:', err);
    }
  };

  // Delete a specific visual template from template history
  const handleDeleteVisualTemplate = async (templateName: string) => {
    if (!token || !clientId) return;
    if (visualTemplatesList.length <= 1) {
      handleClearTemplate();
      return;
    }
    if (!confirm(`Delete template "${templateName}" and its shift cards from template history?`)) return;
    try {
      const res = await fetch(
        `/api/clients/${clientId}/roster-templates/template?templateName=${encodeURIComponent(templateName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        const remaining = visualTemplatesList.filter(t => t.template_name !== templateName);
        if (remaining.length > 0) {
          setActiveTemplateName(remaining[remaining.length - 1].template_name);
        }
        setShowTemplateHistoryMenu(false);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete visual template:', err);
    }
  };

  const handleStepTemplate = (direction: 'prev' | 'next') => {
    if (visualTemplatesList.length <= 1) return;
    const nextIndex =
      direction === 'prev'
        ? Math.max(0, viewedTemplateIndex - 1)
        : Math.min(visualTemplatesList.length - 1, viewedTemplateIndex + 1);
    const target = visualTemplatesList[nextIndex];
    if (target) {
      setActiveTemplateName(target.template_name);
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
    const resolvedFreq = getShiftFrequency(t);
    setShiftFrequency(resolvedFreq === 'One-Off' ? 'Weekly' : resolvedFreq);
    setShiftStartDate(t.start_date || activeQuarter.startDateStr);
    setShiftEndDate(t.end_date || activeQuarter.endDateStr);
    setShiftOneOffDate(t.one_off_date || todayStr);

    if (t.servicesData && t.servicesData.length > 0) {
      setServicesData(
        t.servicesData.map((sd: any) => {
          const sDetails = getServiceDetails(String(sd.serviceId), t.day_of_week, t.start_time);
          return {
            ...sd,
            fundingStream: resolveShiftServiceFundingStream(sd.fundingStream, sDetails.fundingStream)
          };
        })
      );
    } else if (t.service_id) {
      const sDetails = getServiceDetails(String(t.service_id), t.day_of_week, t.start_time);
      setServicesData([{ serviceId: String(t.service_id), fundingStream: sDetails.fundingStream || 'ON,HC' }]);
    } else {
      setServicesData([{ serviceId: '', fundingStream: 'ON,HC' }]);
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
      const targetGenTemplate = viewedTemplateObj?.template_name || activeTemplateName || 'Default Template';
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: true, templateName: targetGenTemplate, clearExisting: false })
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
      const targetGenTemplate = viewedTemplateObj?.template_name || activeTemplateName || 'Default Template';
      const res = await fetch(`/api/clients/${clientId}/generate-roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: generateStartDate, endDate: generateEndDate, dryRun: false, overwriteConflicts: overwriteParam, templateName: targetGenTemplate, clearExisting })
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

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handleDownloadPdf = async () => {
    if (!token || !clientId) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/roster-templates/pdf?templateName=${encodeURIComponent(activeTemplateName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        alert('Failed to generate PDF schedule.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const firstName = (activeClient?.first_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      const lastName = (activeClient?.last_name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `Service_Schedule_${firstName}_${lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading PDF:', e);
      alert('Error generating PDF schedule.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <div className="p-4 text-zinc-400">Loading templates...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#121214] flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center flex-wrap gap-2.5">
            <h3 className="text-lg font-medium text-white">
              {isViewingHistorical ? 'Historical Roster Template' : 'Current Roster Templates'}
            </h3>
            {isClientHomeCare && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                {activeQuarter.shortLabel} ({activeQuarter.displayRange})
              </span>
            )}
            {/* Template Effective Start Date Pill / Quick Selector */}
            {user?.role === 'ADMIN' && (
              <div className="flex items-center gap-1.5 bg-[#09090b] border border-white/[0.1] rounded-md px-2 py-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  {isViewingHistorical ? 'Template Period:' : 'Effective From:'}
                </span>
                {isViewingHistorical ? (
                  <span className="text-xs font-mono text-amber-300">
                    {formatDisplayDate(
                      viewedTemplateObj?.effective_start_date ||
                        homeCareQuarterlySummary?.actualStartDateStr ||
                        activeQuarter.startDateStr
                    )}{' '}
                    –{' '}
                    {formatDisplayDate(viewedTemplateObj?.effective_end_date || activeQuarter.endDateStr)}
                  </span>
                ) : (
                  <div className="w-[125px]">
                    <CustomDatePicker
                      position="bottom"
                      value={
                        homeCareQuarterlySummary?.templateEffectiveStartStr ||
                        viewedTemplateObj?.effective_start_date ||
                        activeQuarter.startDateStr
                      }
                      onChange={e => handleUpdateTemplateEffectiveDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono text-brand-teal font-semibold outline-none cursor-pointer"
                    />
                  </div>
                )}
                {homeCareQuarterlySummary?.hasMidQuarterCutover && !isViewingHistorical && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    title={`Prior spend locked in (${formatCurrency(homeCareQuarterlySummary.lockedPriorOnDrawdown)}) + Active template forward (${formatCurrency(homeCareQuarterlySummary.templatePlannedOnDrawdown)})`}
                  >
                    Prior Spent Locked: {formatCurrency(homeCareQuarterlySummary.lockedPriorOnDrawdown)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Visual Template History Dropdown Switcher (Replaces old Build History button) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateHistoryMenu(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  isViewingHistorical
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-[#09090b] hover:bg-zinc-800 text-white border-white/[0.12]'
                }`}
                title="View and switch between past and current Monday–Sunday roster templates"
              >
                <Layers className="w-3.5 h-3.5 text-brand-teal" />
                <span className="font-semibold">
                  {viewedTemplateObj?.template_name || 'Default Template'}
                </span>
                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                    isViewingHistorical
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isViewingHistorical ? 'Past' : 'Active'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ({viewedTemplateIndex + 1}/{visualTemplatesList.length})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {showTemplateHistoryMenu && (
                <div className="absolute right-0 mt-1.5 w-80 bg-[#09090b] border border-white/[0.12] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-[#121214] border-b border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-brand-teal" />
                      Visual Template History ({visualTemplatesList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTemplateHistoryMenu(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-white/[0.06]">
                    {visualTemplatesList.map((tmpl, idx) => {
                      const isCurrentViewed = tmpl.template_name === viewedTemplateObj?.template_name;
                      const isLiveActive = tmpl.is_active === 1;
                      const shiftCount = templates.filter(
                        t => (t.template_name || 'Default Template') === tmpl.template_name
                      ).length;
                      const startLabel = formatDisplayDate(
                        tmpl.effective_start_date ||
                          homeCareQuarterlySummary?.actualStartDateStr ||
                          activeQuarter.startDateStr
                      );
                      const endLabel = tmpl.effective_end_date
                        ? formatDisplayDate(tmpl.effective_end_date)
                        : 'Ongoing';

                      return (
                        <div
                          key={tmpl.template_name}
                          className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                            isCurrentViewed ? 'bg-brand-teal/10' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTemplateName(tmpl.template_name);
                              setShowTemplateHistoryMenu(false);
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white truncate">
                                #{idx + 1} • {tmpl.template_name}
                              </span>
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                                  isLiveActive
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isLiveActive ? 'Active' : 'Past'}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              {startLabel} – {endLabel} • {shiftCount} shift{shiftCount === 1 ? '' : 's'}
                            </div>
                          </button>

                          {user?.role === 'ADMIN' && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!isLiveActive && (
                                <button
                                  type="button"
                                  onClick={() => handleActivateVisualTemplate(tmpl.template_name)}
                                  className="px-2 py-1 text-[10px] font-medium bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded transition-colors"
                                  title="Make this the active template"
                                >
                                  Set Active
                                </button>
                              )}
                              {visualTemplatesList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVisualTemplate(tmpl.template_name)}
                                  className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                                  title="Delete this template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* + New Template Button (Automatically reverts uncompleted calendar shifts & starts fresh template) */}
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={handleOpenNewTemplateModal}
                className="px-3 py-1.5 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Create a new template, automatically reverting uncompleted calendar shifts while locking in Completed/In-Progress/Cancelled shifts as Spent"
              >
                <Sparkles className="w-3.5 h-3.5" />
                + New Template
              </button>
            )}

            {currentTemplateList.length > 0 && (
              <button
                onClick={handleClearTemplate}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/20 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Historical Template Banner (shown when scrolling back to a past template via < or dropdown) */}
        {isViewingHistorical && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <History className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Viewing Historical Template:{' '}
                <strong className="text-white">{viewedTemplateObj?.template_name}</strong> (
                {formatDisplayDate(
                  viewedTemplateObj?.effective_start_date ||
                    homeCareQuarterlySummary?.actualStartDateStr ||
                    activeQuarter.startDateStr
                )}{' '}
                – {formatDisplayDate(viewedTemplateObj?.effective_end_date || activeQuarter.endDateStr)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => viewedTemplateObj && handleActivateVisualTemplate(viewedTemplateObj.template_name)}
                  className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Make This Template Active
                </button>
              )}
              {liveActiveTemplateObj && (
                <button
                  type="button"
                  onClick={() => setActiveTemplateName(liveActiveTemplateObj.template_name)}
                  className="px-2.5 py-1 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal border border-brand-teal/40 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  Go to Active Template ({liveActiveTemplateObj.template_name}) →
                </button>
              )}
            </div>
          </div>
        )}

        {/* 7-Day Columns Grid with Left (<) and Right (>) Horizontal Template Navigation Arrows */}
        <div className="flex-1 flex items-stretch overflow-hidden bg-[#121214]/10 h-full relative">
          {/* Far-Left (<) Previous Template Navigation Button (Screenshot 2) */}
          <div className="flex items-center pl-2 pr-0.5 shrink-0">
            <button
              type="button"
              disabled={viewedTemplateIndex <= 0}
              onClick={() => handleStepTemplate('prev')}
              title={
                viewedTemplateIndex > 0
                  ? `Previous Template: ${visualTemplatesList[viewedTemplateIndex - 1]?.template_name}`
                  : 'No older template in history'
              }
              className={`h-24 w-7 rounded-lg border flex flex-col items-center justify-center transition-all ${
                viewedTemplateIndex > 0
                  ? 'bg-[#121214] hover:bg-brand-teal/20 text-brand-teal border-brand-teal/40 shadow-md cursor-pointer active:scale-95'
                  : 'bg-[#09090b]/60 text-zinc-600 border-white/[0.06] cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* 7-Day Columns Container */}
          <div className="flex-1 overflow-x-auto p-3 flex gap-3.5 custom-scrollbar items-stretch h-full">
            {currentTemplateList.length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 w-full text-center bg-[#09090b] rounded-lg border border-white/[0.08] border-dashed h-fit">
                No shifts defined in "{viewedTemplateObj?.template_name || activeTemplateName}" yet.
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
                        const shiftFreq = getShiftFrequency(t);
                        const qStart =
                          homeCareQuarterlySummary?.templateEffectiveStartStr ||
                          homeCareQuarterlySummary?.actualStartDateStr ||
                          activeQuarter.startDateStr;
                        const qEnd =
                          homeCareQuarterlySummary?.templateEffectiveEndStr ||
                          activeQuarter.endDateStr;
                        const qOccurrences = countShiftOccurrencesInRange(t, qStart, qEnd, shiftFreq);
                        const { drawdownTotal } = getTemplateShiftOccurrenceBreakdown(t);

                        return (
                          <div key={t.id} className="flex flex-col justify-between p-3 bg-[#09090b] border border-white/[0.08] rounded-lg hover:border-white/[0.12] transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                  <div className="text-sm font-medium text-zinc-100">{t.start_time} - {t.end_time}</div>
                                  {sType !== 'ONE_OFF' && (
                                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${getFrequencyBadgeStyle(shiftFreq)}`}>
                                      {shiftFreq}
                                    </span>
                                  )}
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
                                  const resolvedStreamStr = resolveShiftServiceFundingStream(sd.fundingStream, fundingStream);
                                  const streamCodesList = parseFundingStreamCodes(resolvedStreamStr);

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
                                          <div className="flex items-center gap-1 shrink-0">
                                            {(streamCodesList.length > 0 ? streamCodesList : ['ON']).map(code => (
                                              <span
                                                key={code}
                                                className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 border ${
                                                  code === 'ON'
                                                    ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/30'
                                                    : code === 'HC'
                                                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                                }`}
                                                title={`Funding Stream: ${STANDARD_FUNDING_STREAM_LABELS[code] || code}`}
                                              >
                                                {code}
                                              </span>
                                            ))}
                                          </div>
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

          {/* Far-Right (>) Next / Current Template Navigation Button (Screenshot 2) */}
          <div className="flex items-center pr-2 pl-0.5 shrink-0">
            <button
              type="button"
              disabled={viewedTemplateIndex >= visualTemplatesList.length - 1}
              onClick={() => handleStepTemplate('next')}
              title={
                viewedTemplateIndex < visualTemplatesList.length - 1
                  ? `Next Template: ${visualTemplatesList[viewedTemplateIndex + 1]?.template_name}`
                  : 'Currently viewing latest template'
              }
              className={`h-24 w-7 rounded-lg border flex flex-col items-center justify-center transition-all ${
                viewedTemplateIndex < visualTemplatesList.length - 1
                  ? 'bg-[#121214] hover:bg-brand-teal/20 text-brand-teal border-brand-teal/40 shadow-md cursor-pointer active:scale-95'
                  : 'bg-[#09090b]/60 text-zinc-600 border-white/[0.06] cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Home Care Low-Profile Horizontal Bar-Graph Funding Stream Cards (ON Card -> HC Card -> Other Additional Stream Cards) */}
        {isClientHomeCare && homeCareQuarterlySummary && (
          <div className="px-4 py-2 bg-[#0d1117] border-t border-white/[0.08] shrink-0">
            <div className="flex items-stretch gap-3 overflow-x-auto custom-scrollbar">
              {/* Card 1: ON — Ongoing Funds Summary Card */}
              {(() => {
                const alloc = Math.max(0.01, homeCareQuarterlySummary.totalOnAllocation);
                const plannedVal = homeCareQuarterlySummary.fullQuarterPlannedOnDrawdown;
                const spentVal = homeCareQuarterlySummary.actualOnSpentToDate;
                const remVal = homeCareQuarterlySummary.projectedOnRemaining;
                const projVal = homeCareQuarterlySummary.scheduleProjectedOnSpend;

                const plannedPct = Math.min(100, Math.max(0, Math.round((plannedVal / alloc) * 100)));
                const spentPct = Math.min(100, Math.max(0, Math.round((spentVal / alloc) * 100)));
                const remPct = Math.min(100, Math.max(0, Math.round((Math.max(0, remVal) / alloc) * 100)));
                const projPct = Math.min(100, Math.max(0, Math.round((projVal / alloc) * 100)));

                const projBarColor =
                  homeCareQuarterlySummary.projectedUnfundedDeficit > 0
                    ? 'bg-red-400'
                    : homeCareQuarterlySummary.projectedHcOverflowUsed > 0
                    ? 'bg-amber-400'
                    : 'bg-brand-green';

                return (
                  <div
                    className={`w-[355px] shrink-0 bg-[#121214] border rounded-lg px-3 py-2 flex flex-col justify-between ${
                      homeCareQuarterlySummary.projectedUnfundedDeficit > 0
                        ? 'border-red-500/40'
                        : homeCareQuarterlySummary.projectedHcOverflowUsed > 0
                        ? 'border-amber-500/40'
                        : 'border-brand-teal/30'
                    }`}
                  >
                    {/* Top Row: Stream Title on Left, Total Allocated on Top-Right */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30 text-[9px] font-mono font-bold shrink-0">
                          ON
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200 truncate">
                          Ongoing Funds ({activeQuarter.shortLabel})
                        </span>
                        {homeCareQuarterlySummary.projectedUnfundedDeficit > 0 ? (
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                            Over
                          </span>
                        ) : homeCareQuarterlySummary.projectedHcOverflowUsed > 0 ? (
                          <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                            ⚡ HC Draw
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 mr-1">Alloc:</span>
                        <span className="text-xs font-bold font-mono text-white">
                          {formatCurrency(homeCareQuarterlySummary.totalOnAllocation)}
                        </span>
                      </div>
                    </div>

                    {/* 4 Horizontal Bar Graph Lines: Planned, Spent, Remaining, Projected */}
                    <div className="space-y-1">
                      {/* Line 1: Planned */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Planned</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-indigo-400 rounded-full transition-all"
                            style={{ width: `${plannedPct}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-zinc-200 shrink-0">
                          {formatCurrency(plannedVal)}
                        </span>
                      </div>

                      {/* Line 2: Spent */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Spent</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${spentPct}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-zinc-200 shrink-0">
                          {formatCurrency(spentVal)}
                        </span>
                      </div>

                      {/* Line 3: Remaining (under Spent) */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Remaining</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className={`h-full rounded-full transition-all ${remVal < 0 ? 'bg-red-400' : 'bg-brand-teal'}`}
                            style={{ width: `${remPct}%` }}
                          />
                        </div>
                        <span
                          className={`w-24 text-right font-mono font-semibold shrink-0 ${
                            remVal < 0 ? 'text-red-400' : 'text-brand-teal'
                          }`}
                        >
                          {formatCurrency(remVal)}
                        </span>
                      </div>

                      {/* Line 4: Projected */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Projected</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className={`h-full rounded-full transition-all ${projBarColor}`}
                            style={{ width: `${projPct}%` }}
                          />
                        </div>
                        <span
                          className={`w-24 text-right font-mono font-semibold shrink-0 ${
                            homeCareQuarterlySummary.projectedUnfundedDeficit > 0
                              ? 'text-red-400'
                              : homeCareQuarterlySummary.projectedHcOverflowUsed > 0
                              ? 'text-amber-300'
                              : 'text-brand-green'
                          }`}
                        >
                          {formatCurrency(projVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2 (HC — Home Care Account) & Cards 3+ (Any Other Additional Funding Streams) */}
              {homeCareQuarterlySummary.additionalStreamsSummary.map(s => {
                const isHc = s.code === 'HC';
                const cleanTitle = s.name.replace(new RegExp(`^${s.code}\\s*[-—]?\\s*`, 'i'), '');
                const alloc = Math.max(0.01, s.allocated);
                const plannedVal = round2(s.plannedFullQuarter + s.onOverflowDraw);
                const spentVal = s.actualSpent;
                const remVal = s.projectedRemaining;

                const plannedPct = s.allocated > 0 ? Math.min(100, Math.max(0, Math.round((plannedVal / alloc) * 100))) : 0;
                const spentPct = s.allocated > 0 ? Math.min(100, Math.max(0, Math.round((spentVal / alloc) * 100))) : 0;
                const remPct = s.allocated > 0 ? Math.min(100, Math.max(0, Math.round((Math.max(0, remVal) / alloc) * 100))) : 0;

                return (
                  <div
                    key={s.code}
                    className={`w-[340px] shrink-0 bg-[#121214] border rounded-lg px-3 py-2 flex flex-col justify-between ${
                      s.projectedRemaining < 0
                        ? 'border-red-500/40'
                        : s.onOverflowDraw > 0
                        ? 'border-amber-500/40'
                        : isHc
                        ? 'border-sky-500/30'
                        : 'border-indigo-500/30'
                    }`}
                  >
                    {/* Top Row: Stream Title on Left, Total Allocated on Top-Right */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/[0.06]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border ${
                            isHc
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {s.code}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-200 truncate" title={cleanTitle}>
                          {cleanTitle}
                        </span>
                        {isHc && (
                          <span
                            className={`text-[9px] font-medium px-1 py-0.2 rounded border shrink-0 ${
                              s.onOverflowDraw > 0
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                            }`}
                            title="Linked to ON Ongoing Funds for automatic overflow"
                          >
                            {s.onOverflowDraw > 0 ? '⚡ Overflow' : '🔗 Linked ON'}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 mr-1">Alloc:</span>
                        <span className="text-xs font-bold font-mono text-white">
                          {formatCurrency(s.allocated)}
                        </span>
                      </div>
                    </div>

                    {/* 3 Horizontal Bar Graph Lines: Planned, Spent, Remaining */}
                    <div className="space-y-1.5 my-auto">
                      {/* Line 1: Planned (includes any ON overflow draw for HC) */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">
                          {isHc && s.onOverflowDraw > 0 ? 'Overflow' : 'Planned'}
                        </span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.onOverflowDraw > 0 ? 'bg-amber-400' : 'bg-indigo-400'
                            }`}
                            style={{ width: `${plannedPct}%` }}
                          />
                        </div>
                        <span
                          className={`w-24 text-right font-mono font-semibold shrink-0 ${
                            s.onOverflowDraw > 0 ? 'text-amber-300' : 'text-zinc-200'
                          }`}
                        >
                          {formatCurrency(plannedVal)}
                        </span>
                      </div>

                      {/* Line 2: Spent */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Spent</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-sky-400 rounded-full transition-all"
                            style={{ width: `${spentPct}%` }}
                          />
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-zinc-200 shrink-0">
                          {formatCurrency(spentVal)}
                        </span>
                      </div>

                      {/* Line 3: Remaining */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-zinc-400 font-medium shrink-0">Remaining</span>
                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              remVal < 0 ? 'bg-red-400' : isHc ? 'bg-sky-300' : 'bg-brand-teal'
                            }`}
                            style={{ width: `${remPct}%` }}
                          />
                        </div>
                        <span
                          className={`w-24 text-right font-mono font-semibold shrink-0 ${
                            remVal < 0 ? 'text-red-400' : isHc ? 'text-sky-300' : 'text-brand-teal'
                          }`}
                        >
                          {formatCurrency(remVal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          <div className="flex items-center gap-2.5">
            {user?.role === 'ADMIN' && (
              <>
                {/* 1. Add Shift to Template */}
                <button
                  onClick={() => {
                    setEditingTemplateId(null);
                    setDaysOfWeek(displayDaysOrder.length > 0 ? [displayDaysOrder[0]] : []);
                    setStartTime('09:00');
                    setEndTime('17:00');
                    setStaffId('');
                    setScheduleType('ONGOING');
                    setShiftFrequency('Weekly');
                    setShiftStartDate(homeCareQuarterlySummary?.actualStartDateStr || activeQuarter.startDateStr);
                    setShiftEndDate(activeQuarter.endDateStr);
                    setShiftOneOffDate(todayStr);
                    setServicesData([{ serviceId: '', fundingStream: 'ON' }]);
                    setShowAddTemplateModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-500 hover:bg-brand-blue text-white rounded-lg text-sm font-medium transition-colors flex items-center cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Shift
                </button>

                {/* 2. Run Builder (Generate Roster Shifts) */}
                <button
                  onClick={() => {
                    setRunBuilderTemplate('All Templates');
                    setShowRunBuilderModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-brand-green/80 hover:bg-brand-green text-white rounded-lg text-sm font-medium transition-colors flex items-center cursor-pointer"
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Run Builder
                </button>

                <div className="h-5 w-[1px] bg-white/[0.1] mx-0.5 hidden sm:block" />

                {/* 4. Export Client-Facing PDF Schedule */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 bg-[#121214] hover:bg-zinc-800 disabled:opacity-50 text-white border border-white/[0.12] rounded-lg text-sm font-medium transition-colors flex items-center cursor-pointer"
                  title="Download Client-Readable Service Schedule & Quarterly Budget PDF"
                >
                  <Download className="w-4 h-4 mr-1.5 text-brand-teal" />
                  {downloadingPdf ? 'Generating...' : 'Export PDF'}
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
                    setShiftFrequency('Weekly');
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

                    {/* Recurrence Frequency Selector (Shown for ONGOING and FIXED shifts) */}
                    {scheduleType !== 'ONE_OFF' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Shift Frequency</label>
                        <select
                          value={shiftFrequency}
                          onChange={e => setShiftFrequency(e.target.value)}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none transition-colors"
                        >
                          {SHIFT_FREQUENCY_OPTIONS.map(freqOpt => (
                            <option key={freqOpt} value={freqOpt}>
                              {freqOpt}
                            </option>
                          ))}
                        </select>
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
                        const activeStream = resolveShiftServiceFundingStream(s.fundingStream, fundingStream);
                        const activeStreamCodes = parseFundingStreamCodes(activeStream);

                        return (
                          <div key={index} className="bg-[#121214] border border-white/[0.08] rounded-md p-3">
                            <select
                              required
                              value={String(s.serviceId || '')}
                              onChange={e => handleServiceChange(index, e.target.value)}
                              className="w-full bg-[#09090b] border border-white/[0.08] rounded-md px-2 py-1.5 text-sm text-white focus:border-brand-teal outline-none mb-2"
                            >
                              <option value="">-- Choose Service --</option>
                              {clientPersonalisedServices.map(cs => {
                                const srvDetails = getServiceDetails(String(cs.id), daysOfWeek[0] ?? 1, startTime);
                                const rawCsStream = cs.funding_stream || (srvDetails.rate > 0 ? srvDetails.fundingStream : '');
                                const csCodes = parseFundingStreamCodes(rawCsStream);
                                return (
                                  <option key={cs.id} value={String(cs.id)} className="truncate">
                                    {cs.name}
                                    {isClientHomeCare && csCodes.length > 0 ? ` [${csCodes.join(', ')}]` : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {s.serviceId && (
                              <div className="space-y-2.5 mt-2 pt-2 border-t border-white/[0.08]">
                                {isClientHomeCare && (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                        Funding Streams
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {activeStreamCodes.map(code => (
                                          <span
                                            key={code}
                                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                              code === 'ON'
                                                ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/30'
                                                : code === 'HC'
                                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                            }`}
                                          >
                                            {code}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
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
                                      {!availableFundingStreamOptions.some(opt => opt.code === activeStream) && (
                                        <option value={activeStream}>{activeStream.split(',').join(' + ')}</option>
                                      )}
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
                            {scheduleType === 'ONE_OFF' ? 'One-Off' : shiftFrequency}
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

      {/* Create New Visual Template Modal */}
      {showNewTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowNewTemplateModal(false)}>
          <div className="bg-[#09090b] border border-white/[0.1] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/[0.08] bg-[#121214] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-brand-teal" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Start New Roster Template</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Archive the previous template & revert uncompleted future roster shifts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTemplateModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate} className="p-5 space-y-4">
              <div className="bg-brand-teal/10 border border-brand-teal/25 rounded-lg p-3.5 text-xs text-zinc-200 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-brand-teal flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Automatic Clean Slate & Budget Lock-In
                </div>
                <p className="text-zinc-300">
                  1. All uncompleted calendar shifts (<span className="text-white font-medium">Draft / Published / Scheduled</span>) will be automatically removed from the roster.
                </p>
                <p className="text-zinc-300">
                  2. All <span className="text-emerald-300 font-medium">Completed, In-Progress, and Cancelled</span> shifts remain untouched and are locked into your <span className="text-sky-300 font-medium">Spent</span> &amp; <span className="text-indigo-300 font-medium">Planned</span> budget prior to the new template start date.
                </p>
                <p className="text-zinc-300">
                  3. Your previous visual template (<span className="text-white font-medium">{viewedTemplateObj?.template_name}</span>) is saved in Template History so you can scroll back to view it anytime using the <strong className="text-brand-teal">&lt; / &gt;</strong> arrows.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">New Template Name</label>
                <input
                  type="text"
                  required
                  value={newTemplateNameInput}
                  onChange={e => setNewTemplateNameInput(e.target.value)}
                  placeholder="e.g. Template 2 (From 26 Oct)"
                  className="w-full bg-[#121214] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  New Template Effective Start Date
                </label>
                <CustomDatePicker
                  position="bottom"
                  value={newTemplateEffectiveDate}
                  onChange={e => setNewTemplateEffectiveDate(e.target.value)}
                  className="w-full bg-[#121214] border border-white/[0.1] rounded-md px-3 py-2 text-sm text-white focus:border-brand-teal outline-none"
                />
                {homeCareQuarterlySummary?.latestPerformedShiftDateStr && (
                  <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                    Last Completed / Active Shift in {activeQuarter.shortLabel}:{' '}
                    <span className="text-brand-teal font-semibold">
                      {formatDisplayDate(homeCareQuarterlySummary.latestPerformedShiftDateStr)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Starting Monday–Sunday Board</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewTemplateCopyCards(true)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      newTemplateCopyCards
                        ? 'bg-brand-teal/15 border-brand-teal/50 text-white'
                        : 'bg-[#121214] border-white/[0.08] text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                      <Copy className="w-3.5 h-3.5 text-brand-teal" />
                      Copy Current Shifts to Edit
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-snug">
                      Keep current Monday–Sunday cards so you can quickly tweak times or days.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTemplateCopyCards(false)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      !newTemplateCopyCards
                        ? 'bg-brand-teal/15 border-brand-teal/50 text-white'
                        : 'bg-[#121214] border-white/[0.08] text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Start Blank Board
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-snug">
                      Start with 0 shifts on the Monday–Sunday columns and add fresh shifts.
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  disabled={creatingNewTemplate}
                  className="px-4 py-2 border border-white/[0.1] hover:bg-white/[0.04] text-zinc-300 rounded-md text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingNewTemplate}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-black font-semibold rounded-md text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {creatingNewTemplate ? 'Reverting & Creating...' : 'Revert Uncompleted & Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
