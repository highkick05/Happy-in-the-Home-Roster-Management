import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Upload, 
  Download, 
  RefreshCw, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Table, 
  Layers, 
  Check, 
  X,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Info,
  Calendar,
  Clock,
  Archive,
  Sparkles,
  ArrowRight,
  Stethoscope,
  HeartHandshake,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface AwardSchedule {
  id: number;
  name: string;
  award_code: string;
  effective_from: string;
  effective_to?: string;
  description?: string;
  is_active: number;
  rate_count: number;
  status: 'ACTIVE' | 'UPCOMING' | 'ARCHIVED';
  timezone?: string;
  current_date?: string;
  transition_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AwardRate {
  id?: number;
  schedule_id?: number;
  award_name: string;
  award_code?: string;
  stream: string;
  classification: string;
  pay_point_code?: string;
  hourly_rate: number;
  weekly_rate?: number;
  annual_rate?: number;
  casual_rate?: number;
  saturday_rate?: number;
  sunday_rate?: number;
  public_holiday_rate?: number;
  casual_saturday_rate?: number;
  casual_sunday_rate?: number;
  afternoon_shift_rate?: number;
  night_shift_rate?: number;
  effective_date?: string;
  updated_at?: string;
}

export type AwardTabKey = 'SCHADS' | 'NURSES' | 'AGED_CARE' | 'HEALTH_PROF' | 'CUSTOM';

export interface AwardTabConfig {
  key: AwardTabKey;
  code: string;
  name: string;
  shortName: string;
  badge: string;
  coverage: string;
  description: string;
  isPrimary?: boolean;
}

export const AWARD_TABS: AwardTabConfig[] = [
  {
    key: 'SCHADS',
    code: 'MA000100',
    name: 'SCHADS Award',
    shortName: 'SCHADS',
    badge: 'Focus: Active',
    coverage: 'Social, Community, Home Care and Disability Services',
    description: 'Social, Community, Home Care and Disability Services Industry Award 2010 [MA000100]',
    isPrimary: true,
  },
  {
    key: 'NURSES',
    code: 'MA000034',
    name: 'Nurses Award 2020',
    shortName: 'Nurses Award',
    badge: 'MA000034',
    coverage: 'Registered Nurses, Enrolled Nurses & Assistants in Nursing (AIN)',
    description: 'Nurses Award 2020 [MA000034] — Dedicated Module',
  },
  {
    key: 'AGED_CARE',
    code: 'MA000018',
    name: 'Aged Care Award 2010',
    shortName: 'Aged Care',
    badge: 'MA000018',
    coverage: 'Residential Care, Day Care & Home Care Direct Care Workers',
    description: 'Aged Care Industry Award 2010 [MA000018] — Dedicated Module',
  },
  {
    key: 'HEALTH_PROF',
    code: 'MA000027',
    name: 'Health Professionals',
    shortName: 'Health Professionals',
    badge: 'MA000027',
    coverage: 'Physiotherapy, Occupational Therapy, Podiatry & Support Staff',
    description: 'Health Professionals and Support Services Award 2020 [MA000027] — Dedicated Module',
  },
  {
    key: 'CUSTOM',
    code: 'CUSTOM',
    name: 'Custom Awards & EBAs',
    shortName: 'Custom / EBAs',
    badge: 'EBA / Custom',
    coverage: 'Enterprise Bargaining Agreements & Specialized Matrices',
    description: 'Company-specific Enterprise Agreements and customized pay matrices',
  }
];

export function isScheduleInTab(s: AwardSchedule, tabKey: AwardTabKey): boolean {
  const code = (s.award_code || '').trim().toUpperCase();
  const name = (s.name || '').toLowerCase();

  if (tabKey === 'SCHADS') {
    return code === 'MA000100' || name.includes('schads') || (!code && !name.includes('nurse') && !name.includes('aged') && !name.includes('health'));
  }
  if (tabKey === 'NURSES') {
    return code === 'MA000034' || name.includes('nurse');
  }
  if (tabKey === 'AGED_CARE') {
    return code === 'MA000018' || name.includes('aged care');
  }
  if (tabKey === 'HEALTH_PROF') {
    return code === 'MA000027' || name.includes('health prof');
  }
  if (tabKey === 'CUSTOM') {
    return !['MA000100', 'MA000034', 'MA000018', 'MA000027'].includes(code) &&
      !name.includes('schads') && !name.includes('nurse') && !name.includes('aged care') && !name.includes('health prof');
  }
  return true;
}

const MODERN_AWARDS_PRESETS = [
  {
    key: 'SCHADS',
    title: 'SCHADS Award (MA000100)',
    awardName: 'SCHADS Award',
    awardCode: 'MA000100',
    scheduleName: `SCHADS Award ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    description: 'Social, Community, Home Care and Disability Services Industry Award',
  },
  {
    key: 'NURSES',
    title: 'Nurses Award 2020 (MA000034)',
    awardName: 'Nurses Award 2020',
    awardCode: 'MA000034',
    scheduleName: `Nurses Award ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    description: 'Nurses Award 2020 (Registered Nurses, Enrolled Nurses and Assistants in Nursing)',
  },
  {
    key: 'AGED_CARE',
    title: 'Aged Care Award 2010 (MA000018)',
    awardName: 'Aged Care Award 2010',
    awardCode: 'MA000018',
    scheduleName: `Aged Care Award ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    description: 'Aged Care Industry Award (Residential & Home Care Staff)',
  },
  {
    key: 'HEALTH_PROF',
    title: 'Health Professionals Award (MA000027)',
    awardName: 'Health Professionals and Support Services Award',
    awardCode: 'MA000027',
    scheduleName: `Health Professionals Award ${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    description: 'Health Professionals and Support Services Award 2020',
  },
  {
    key: 'CUSTOM',
    title: 'Custom / Other Modern Award',
    awardName: '',
    awardCode: '',
    scheduleName: '',
    description: '',
  }
];

export default function AwardRatesSettings() {
  const { token, settings } = useAuth();
  const [activeAwardTab, setActiveAwardTab] = useState<AwardTabKey>('SCHADS');
  const [schedules, setSchedules] = useState<AwardSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [rates, setRates] = useState<AwardRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configuredTimezone, setConfiguredTimezone] = useState<string>(settings?.timezone || 'Australia/Perth');
  const [currentDateInTz, setCurrentDateInTz] = useState<string>('');

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('SCHADS');
  const [importAwardName, setImportAwardName] = useState('SCHADS Award');
  const [importScheduleName, setImportScheduleName] = useState('SCHADS Award 2025–2026');
  const [importEffectiveFrom, setImportEffectiveFrom] = useState('2025-07-01');
  const [importAwardCode, setImportAwardCode] = useState('MA000100');
  const [importDescription, setImportDescription] = useState('Fair Work Commission Annual Wage Review - SCHADS Award');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Date Lookup State
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [testResult, setTestResult] = useState<{ 
    date: string; 
    scheduleName?: string; 
    effectiveFrom?: string;
    timezone?: string;
    count?: number;
  } | null>(null);

  const fetchSchedules = async (targetScheduleId?: number, tabKeyOverride?: AwardTabKey) => {
    try {
      const res = await fetch('/api/award-rates/schedules', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        const schList: AwardSchedule[] = data.schedules || [];
        setSchedules(schList);
        if (data.timezone) setConfiguredTimezone(data.timezone);
        if (data.currentDate) setCurrentDateInTz(data.currentDate);

        const currentTabKey = tabKeyOverride || activeAwardTab;
        const currentTabSchedules = schList.filter(s => isScheduleInTab(s, currentTabKey));

        if (currentTabSchedules.length > 0) {
          const activeOrFirst = targetScheduleId 
            ? currentTabSchedules.find(s => s.id === targetScheduleId) || currentTabSchedules[0]
            : currentTabSchedules.find(s => s.status === 'ACTIVE') || currentTabSchedules[0];
          setSelectedScheduleId(activeOrFirst.id);
          fetchRatesForSchedule(activeOrFirst.id);
        } else {
          setSelectedScheduleId(null);
          setRates([]);
          setLoading(false);
        }
      }
    } catch (e: any) {
      console.error('Failed to load award schedules', e);
      setLoading(false);
    }
  };

  const fetchRatesForSchedule = async (scheduleId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/award-rates?schedule_id=${scheduleId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch (e: any) {
      console.error('Failed to load rates for schedule', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleScheduleChange = (id: number) => {
    setSelectedScheduleId(id);
    fetchRatesForSchedule(id);
  };

  const handleResetDefaultSchads = async () => {
    if (!confirm('This will load and import the official SCHADS Award (MA000100) spreadsheet for the 2024–2025 financial year (Effective 1 July 2024). Any older or newer versions you uploaded will remain preserved. Proceed?')) {
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/award-rates/reset-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          scheduleName: 'SCHADS Award 2024–2025',
          effectiveFrom: '2024-07-01'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load default rates');
      showNotification('success', data.message || 'SCHADS Award pay rates loaded successfully!');
      fetchSchedules(data.result?.scheduleId);
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsvText(text);
      parsePreviewCsv(text);
    };
    reader.readAsText(file);
  };

  const parsePreviewCsv = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        showNotification('error', 'CSV file appears to be empty or has no header.');
        return;
      }

      const splitCsvLine = (line: string) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = splitCsvLine(lines[0]);
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = splitCsvLine(lines[i]);
        if (values.length <= 1) continue;
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      setPreviewRows(rows);
      setShowImportModal(true);
    } catch (err: any) {
      showNotification('error', 'Failed to parse CSV: ' + err.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!rawCsvText) return;
    if (!importEffectiveFrom) {
      alert('Please enter an effective date for this rate schedule (e.g. 2025-07-01).');
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/award-rates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          csvText: rawCsvText,
          scheduleName: importScheduleName,
          awardName: importAwardName,
          effectiveFrom: importEffectiveFrom,
          awardCode: importAwardCode,
          description: importDescription,
          overwrite: overwriteExisting
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      showNotification('success', data.message || 'Rates imported successfully!');
      setShowImportModal(false);
      setPreviewRows([]);
      setRawCsvText('');
      fetchSchedules(data.result?.scheduleId);
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePresetChange = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const preset = MODERN_AWARDS_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    if (preset.awardName) setImportAwardName(preset.awardName);
    if (preset.awardCode) setImportAwardCode(preset.awardCode);
    if (preset.scheduleName) setImportScheduleName(preset.scheduleName);
    if (preset.description) setImportDescription(preset.description);
  };

  const handleDeleteSchedule = async (schedule: AwardSchedule) => {
    if (!confirm(`Are you sure you want to delete the schedule "${schedule.name}" and all its ${schedule.rate_count} pay rates?\n\nThis action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/award-rates/schedules/${schedule.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete schedule');
      showNotification('success', `Schedule "${schedule.name}" deleted successfully.`);
      fetchSchedules();
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedScheduleId) return;
    try {
      const sched = schedules.find(s => s.id === selectedScheduleId);
      const res = await fetch(`/api/award-rates/export?schedule_id=${selectedScheduleId}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) {
        throw new Error('Unauthorized or failed to export CSV');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (sched?.name || 'Award_Pay_Rates').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('success', `Exported "${sched?.name || 'rates'}" as CSV.`);
    } catch (e: any) {
      showNotification('error', e.message || 'Export failed');
    }
  };

  const activeTabConfig = AWARD_TABS.find(t => t.key === activeAwardTab) || AWARD_TABS[0];

  const handleTabSwitch = (newTab: AwardTabKey) => {
    setActiveAwardTab(newTab);
    setSelectedStream('ALL');
    setSearchQuery('');
    setTestResult(null);

    const newTabSchedules = schedules.filter(s => isScheduleInTab(s, newTab));
    if (newTabSchedules.length > 0) {
      const activeOrFirst = newTabSchedules.find(s => s.status === 'ACTIVE') || newTabSchedules[0];
      setSelectedScheduleId(activeOrFirst.id);
      fetchRatesForSchedule(activeOrFirst.id);
    } else {
      setSelectedScheduleId(null);
      setRates([]);
    }
  };

  const handleOpenUploadModalForTab = (tabKey: AwardTabKey) => {
    handlePresetChange(tabKey);
    fileInputRef.current?.click();
  };

  const handleTestDateLookup = async () => {
    try {
      const codeParam = activeTabConfig.code && activeTabConfig.code !== 'CUSTOM'
        ? `&award_code=${activeTabConfig.code}`
        : '';
      const res = await fetch(`/api/award-rates/for-date?date=${testDate}${codeParam}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          date: data.date || testDate,
          scheduleName: data.schedule?.name || `No ${activeTabConfig.shortName} schedule found for this date`,
          effectiveFrom: data.schedule?.effective_from,
          timezone: data.timezone || configuredTimezone,
          count: Array.isArray(data.rates) ? data.rates.length : 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentSchedule = schedules.find(s => s.id === selectedScheduleId);

  const displayedSchedules = React.useMemo(() => {
    return schedules.filter(s => isScheduleInTab(s, activeAwardTab));
  }, [schedules, activeAwardTab]);

  // Distinct streams from current schedule rates
  const streamList = React.useMemo(() => {
    const set = new Set<string>();
    rates.forEach(r => {
      if (r.stream) set.add(r.stream);
    });
    return Array.from(set);
  }, [rates]);

  // Filtered rates
  const filteredRates = rates.filter(r => {
    if (selectedStream !== 'ALL' && r.stream !== selectedStream) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStream = r.stream.toLowerCase().includes(q);
      const matchClass = r.classification.toLowerCase().includes(q);
      const matchCode = (r.pay_point_code || '').toLowerCase().includes(q);
      if (!matchStream && !matchClass && !matchCode) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Sub-Tabs Bar: Dedicated Sections For Each Award */}
      <div className="bg-brand-bg border border-border-subtle rounded-xl p-2 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {AWARD_TABS.map((tab) => {
            const isActive = activeAwardTab === tab.key;
            const count = schedules.filter(s => isScheduleInTab(s, tab.key)).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabSwitch(tab.key)}
                className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all whitespace-nowrap border text-left cursor-pointer ${
                  isActive
                    ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/40 shadow-sm ring-1 ring-brand-teal/30'
                    : 'bg-brand-navy/60 text-[#8B949E] hover:text-white hover:bg-brand-navy border-border-subtle'
                }`}
              >
                {tab.key === 'SCHADS' && <Award className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-teal' : 'text-zinc-400'}`} />}
                {tab.key === 'NURSES' && <Stethoscope className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-teal' : 'text-zinc-400'}`} />}
                {tab.key === 'AGED_CARE' && <HeartHandshake className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-teal' : 'text-zinc-400'}`} />}
                {tab.key === 'HEALTH_PROF' && <Users className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-teal' : 'text-zinc-400'}`} />}
                {tab.key === 'CUSTOM' && <Layers className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-teal' : 'text-zinc-400'}`} />}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span>{tab.name}</span>
                    {tab.isPrimary && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-brand-teal text-brand-navy">
                        Primary Focus
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] block ${isActive ? 'text-brand-teal/80' : 'text-zinc-500'}`}>
                    {tab.code} • {count} {count === 1 ? 'version' : 'versions'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Banner - Tailored Specifically to Current Award */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-bg border border-border-subtle p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
              {activeAwardTab === 'SCHADS' && <Award className="w-5 h-5" />}
              {activeAwardTab === 'NURSES' && <Stethoscope className="w-5 h-5" />}
              {activeAwardTab === 'AGED_CARE' && <HeartHandshake className="w-5 h-5" />}
              {activeAwardTab === 'HEALTH_PROF' && <Users className="w-5 h-5" />}
              {activeAwardTab === 'CUSTOM' && <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {activeTabConfig.name} Pay Rates &amp; Schedules
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {activeTabConfig.code}
                </span>
                {activeTabConfig.isPrimary && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                    Active Focus
                  </span>
                )}
                {currentSchedule && (
                  <span className="text-xs text-zinc-400 font-normal">
                    Viewing: <strong className="text-white">{currentSchedule.name}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5">
                {activeTabConfig.description}. {activeTabConfig.coverage}.
              </p>
            </div>
          </div>
        </div>

        {/* Award-Specific Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".csv" 
            className="hidden" 
          />

          {activeAwardTab === 'SCHADS' && (
            <button
              type="button"
              onClick={handleResetDefaultSchads}
              disabled={isImporting}
              className="px-3.5 py-2 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Load the standard Fair Work SCHADS rates spreadsheet (2024–2025)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>Load Default SCHADS CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenUploadModalForTab(activeAwardTab)}
            className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            title={`Upload CSV schedule specifically for ${activeTabConfig.name}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload {activeTabConfig.shortName} Schedule</span>
          </button>

          {currentSchedule && (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Download current ${activeTabConfig.shortName} rates as CSV`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteSchedule(currentSchedule)}
                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Delete this ${activeTabConfig.shortName} schedule and all its classifications`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Version Selector & Timeline Cards */}
      <div className="bg-brand-bg border border-border-subtle rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-teal" />
              {activeTabConfig.shortName} Schedule Versions &amp; Effective Dates
            </h3>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Select an award schedule below to inspect its classifications, or upload a new financial year update for {activeTabConfig.name}.
            </p>
          </div>

          {/* Quick Date Lookup Verification Widget */}
          <div className="flex items-center gap-2 bg-brand-navy p-1.5 rounded-lg border border-border-subtle">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="bg-transparent text-xs text-white border-0 focus:ring-0 p-0"
              title={`Verify which ${activeTabConfig.shortName} schedule applies to any shift date`}
            />
            <button
              type="button"
              onClick={handleTestDateLookup}
              className="px-2.5 py-1 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal text-[11px] font-semibold rounded transition-colors cursor-pointer"
            >
              Test Shift Date
            </button>
          </div>
        </div>

        {/* Timezone & Midnight Alignment Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-brand-navy/60 border border-brand-teal/20 rounded-lg text-xs">
          <div className="flex items-center gap-2 text-[#E6EDF3]">
            <Clock className="w-4 h-4 text-brand-teal shrink-0" />
            <span>
              <strong>Localization &amp; Timezone:</strong> Aligned with <span className="text-[#8B949E]">Settings &gt; General &gt; Localization &amp; System:</span> <strong className="text-brand-teal font-mono">{configuredTimezone}</strong>
              {currentDateInTz && <span className="text-[#8B949E] ml-2">(Current Date: <strong className="text-white font-mono">{currentDateInTz}</strong>)</span>}
            </span>
          </div>
          <div className="text-[11px] text-[#8B949E]">
            Financial year &amp; rate switchovers activate at <strong className="text-white">00:00 (midnight)</strong> in this timezone.
          </div>
        </div>

        {testResult && (
          <div className="p-3 bg-brand-navy/80 border border-brand-teal/30 rounded-lg text-xs flex items-center justify-between text-brand-teal">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal shrink-0" />
              <span>
                For shift on <strong>{testResult.date}</strong> in <strong>{testResult.timezone || configuredTimezone}</strong>: System applies <strong>"{testResult.scheduleName}"</strong> {testResult.effectiveFrom ? `(Effective: ${testResult.effectiveFrom})` : ''} ({testResult.count} classifications).
              </span>
            </span>
            <button onClick={() => setTestResult(null)} className="text-zinc-400 hover:text-white ml-2 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Schedule Cards Grid */}
        {displayedSchedules.length === 0 ? (
          activeAwardTab === 'SCHADS' ? (
            <div className="text-center py-10 bg-brand-navy/40 border border-dashed border-border-subtle rounded-xl p-8">
              <Award className="w-10 h-10 text-zinc-500 mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-semibold text-white">No SCHADS Award Schedules Uploaded Yet</h4>
              <p className="text-xs text-[#8B949E] mt-1 max-w-md mx-auto">
                You haven't uploaded or activated any pay rate schedules for the SCHADS Award (MA000100) yet. You can load the official standard SCHADS rates or upload a new financial year CSV update.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleResetDefaultSchads}
                  className="px-3.5 py-2 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Load Default SCHADS Award</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenUploadModalForTab('SCHADS')}
                  className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload SCHADS Schedule</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-brand-navy/40 border border-dashed border-brand-teal/30 rounded-xl p-8 space-y-4">
              <div className="p-3 bg-brand-teal/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-brand-teal border border-brand-teal/20">
                {activeAwardTab === 'NURSES' && <Stethoscope className="w-7 h-7" />}
                {activeAwardTab === 'AGED_CARE' && <HeartHandshake className="w-7 h-7" />}
                {activeAwardTab === 'HEALTH_PROF' && <Users className="w-7 h-7" />}
                {activeAwardTab === 'CUSTOM' && <Layers className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h4 className="text-sm font-bold text-white">{activeTabConfig.name} ({activeTabConfig.code})</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
                    Dedicated Sub-Tab
                  </span>
                </div>
                <p className="text-xs text-[#8B949E] mt-1.5 max-w-lg mx-auto">
                  This section is completely separated specifically for <strong>{activeTabConfig.name}</strong> pay rates and schedules. 
                  Current development focus is on perfecting the <strong>SCHADS Award</strong>, but you can already upload and manage versioned schedules for {activeTabConfig.shortName} independently without affecting SCHADS.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenUploadModalForTab(activeAwardTab)}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload {activeTabConfig.shortName} Schedule (CSV)</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 max-w-md mx-auto text-[11px] text-zinc-400 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 rounded bg-black/30 border border-white/10 font-mono text-[10px]">
                  Award Code: {activeTabConfig.code}
                </span>
                <span className="px-2 py-1 rounded bg-black/30 border border-white/10 text-[10px]">
                  {activeTabConfig.coverage}
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {displayedSchedules.map((sch) => {
              const isSelected = sch.id === selectedScheduleId;
              return (
                <div
                  key={sch.id}
                  onClick={() => handleScheduleChange(sch.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                    isSelected 
                      ? 'bg-brand-navy border-brand-teal ring-1 ring-brand-teal shadow-md' 
                      : 'bg-brand-navy/50 border-border-subtle hover:border-zinc-600 hover:bg-brand-navy/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-white text-sm">{sch.name}</h4>
                        {sch.award_code && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {sch.award_code}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8B949E] block mt-0.5">
                        Effective: <strong className="text-[#E6EDF3]">{sch.effective_from}</strong>
                        <span className="text-[10px] text-zinc-500 block">00:00 midnight ({configuredTimezone})</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                      sch.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : sch.status === 'UPCOMING'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                    title={sch.transition_note || (sch.status === 'ACTIVE' ? 'Currently active' : sch.status === 'UPCOMING' ? `Activates on ${sch.effective_from}` : 'Archived')}
                    >
                      {sch.status === 'ACTIVE' ? 'Active' : sch.status === 'UPCOMING' ? 'Upcoming' : 'Archived'}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-zinc-400 italic">
                    {sch.transition_note || (sch.status === 'ACTIVE' ? 'In effect for all current shifts' : sch.status === 'UPCOMING' ? `Activates on ${sch.effective_from}` : 'Historical')}
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#8B949E]">
                    <span>{sch.rate_count} Classifications</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(sch);
                      }}
                      className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                      title="Delete this schedule and all its pay rates"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-brand-bg border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Stream Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedStream('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedStream === 'ALL'
                  ? 'bg-brand-teal text-brand-navy shadow-sm'
                  : 'bg-brand-navy text-[#8B949E] hover:text-white border border-border-subtle'
              }`}
            >
              All Streams ({rates.length})
            </button>
            {streamList.map(st => {
              const count = rates.filter(r => r.stream === st).length;
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStream(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedStream === st
                      ? 'bg-brand-teal text-brand-navy shadow-sm'
                      : 'bg-brand-navy text-[#8B949E] hover:text-white border border-border-subtle'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search level, code, stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-brand-navy border border-border-subtle rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-[#8B949E] text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-teal" />
              <span>Loading Award Pay Rates...</span>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="p-3 bg-brand-navy/60 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-[#8B949E] border border-border-subtle">
                <Table className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Award Rates Found in this Schedule</h3>
              <p className="text-xs text-[#8B949E] max-w-md mx-auto">
                {rates.length === 0 
                  ? 'Click "Load Provided SCHADS CSV" to initialize the 2024–2025 pay rates schedule, or upload a custom CSV.'
                  : 'No classifications match the selected stream or search query.'}
              </p>
              {rates.length === 0 && (
                <button
                  onClick={handleResetDefaultSchads}
                  disabled={isImporting}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                  <span>Import Provided SCHADS Rates</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-brand-navy/70 text-[#8B949E] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Stream</th>
                  <th className="py-2.5 px-3 font-semibold">Classification</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Code</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">Ordinary ($/h)</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-sky-400">Casual (25%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Saturday (150%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Sunday (200%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Public Hol (250%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Casual Sat</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Casual Sun</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Afternoon</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Night</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-zinc-400">Weekly (38h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredRates.map((r) => (
                  <tr key={r.id || `${r.stream}-${r.classification}`} className="hover:bg-brand-navy/50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        r.stream.includes('aged care') 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : r.stream.includes('disability')
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : r.stream.includes('Crisis')
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                      }`}>
                        {r.stream}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                      {r.classification}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {r.pay_point_code ? (
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-zinc-300">
                          {r.pay_point_code}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      ${r.hourly_rate.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-sky-400 whitespace-nowrap">
                      {r.casual_rate !== undefined ? `$${r.casual_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#E6EDF3] whitespace-nowrap">
                      {r.saturday_rate !== undefined ? `$${r.saturday_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#E6EDF3] whitespace-nowrap">
                      {r.sunday_rate !== undefined ? `$${r.sunday_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#E6EDF3] whitespace-nowrap">
                      {r.public_holiday_rate !== undefined ? `$${r.public_holiday_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                      {r.casual_saturday_rate !== undefined ? `$${r.casual_saturday_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                      {r.casual_sunday_rate !== undefined ? `$${r.casual_sunday_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                      {r.afternoon_shift_rate !== undefined ? `$${r.afternoon_shift_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                      {r.night_shift_rate !== undefined ? `$${r.night_shift_rate.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                      {r.weekly_rate !== undefined ? `$${r.weekly_rate.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        {filteredRates.length > 0 && (
          <div className="p-3 bg-brand-navy/60 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#8B949E] gap-2">
            <span>
              Showing {filteredRates.length} of {rates.length} rates in <strong>{currentSchedule?.name}</strong> ({selectedStream === 'ALL' ? 'All Streams' : selectedStream})
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              Effective Date: <strong className="text-white">{currentSchedule?.effective_from}</strong>
            </span>
          </div>
        )}
      </div>

      {/* CSV Upload & Effective Date Schedule Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-navy border border-border-subtle rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand-teal" />
                  Schedule &amp; Import {importAwardName || activeTabConfig.name} ({importAwardCode || activeTabConfig.code})
                </h3>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  Detected {previewRows.length} classifications in CSV file. Set the effective date below to schedule when these rates take effect for {importAwardName || activeTabConfig.name}.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Options */}
            <div className="p-4 bg-brand-bg/80 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[#8B949E] font-medium mb-1 flex items-center justify-between">
                  <span className="text-brand-teal font-semibold">Select Modern Award</span>
                  <span className="text-[10px] text-zinc-400">Choose a preset or choose Custom to enter any award</span>
                </label>
                <select
                  value={selectedPresetKey}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-navy border border-brand-teal/40 rounded-lg text-white font-medium focus:outline-none focus:border-brand-teal"
                >
                  {MODERN_AWARDS_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Award Name</label>
                <input
                  type="text"
                  value={importAwardName}
                  onChange={(e) => setImportAwardName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. Nurses Award 2020"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Award Code</label>
                <input
                  type="text"
                  value={importAwardCode}
                  onChange={(e) => setImportAwardCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal font-mono"
                  placeholder="e.g. MA000034"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Schedule Name / Version</label>
                <input
                  type="text"
                  value={importScheduleName}
                  onChange={(e) => setImportScheduleName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. Nurses Award 2025–2026"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1 flex items-center gap-1 text-emerald-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Effective From (Start Date) *
                </label>
                <input
                  type="date"
                  value={importEffectiveFrom}
                  onChange={(e) => setImportEffectiveFrom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-emerald-500/50 rounded-lg text-white focus:outline-none focus:border-brand-teal font-mono font-semibold"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-[#8B949E] font-medium mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. Fair Work Commission Annual Wage Review"
                />
              </div>
            </div>

            {/* Archiving Notice */}
            <div className="p-3 bg-brand-navy/60 border-b border-border-subtle text-xs flex items-start gap-2.5 text-[#8B949E]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Multi-Award &amp; Version Archiving: </strong>
                You can import multiple Modern Awards (e.g. SCHADS for support workers, Nurses Award for nursing staff). Past award schedules remain permanently preserved in your database. When interpreting shifts, the system matches the staff member's award and the exact rates that were active on that shift date.
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-brand-bg text-[#8B949E] uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-2.5 font-semibold">Stream</th>
                    <th className="py-2 px-2.5 font-semibold">Classification</th>
                    <th className="py-2 px-2 font-semibold">Code</th>
                    <th className="py-2 px-2.5 font-semibold text-right text-emerald-400">Hourly</th>
                    <th className="py-2 px-2.5 font-semibold text-right text-sky-400">Casual</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Saturday</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Sunday</th>
                    <th className="py-2 px-2.5 font-semibold text-right">Public Hol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {previewRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-brand-bg/50">
                      <td className="py-2 px-2.5 text-zinc-300 font-medium">{row.Stream || row.stream}</td>
                      <td className="py-2 px-2.5 text-white">{row.Classification || row.classification}</td>
                      <td className="py-2 px-2 font-mono text-zinc-400">{row.Code || row.code || '—'}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">${parseFloat(row.Hourly || '0').toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-sky-400">${parseFloat(row.Casual || '0').toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-300">${parseFloat(row.Saturday || '0').toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-300">${parseFloat(row.Sunday || '0').toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-300">${parseFloat(row['Public holiday'] || '0').toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRows.length > 50 && (
                <div className="p-2 text-center text-[11px] text-[#8B949E] border-t border-border-subtle">
                  Showing first 50 rows of {previewRows.length} total rows...
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border-subtle bg-brand-bg flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-[#8B949E] hover:text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
              >
                {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Schedule & Import {previewRows.length} Rates</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
