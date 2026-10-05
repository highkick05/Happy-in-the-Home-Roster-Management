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
  ArrowRight
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

export default function AwardRatesSettings() {
  const { token, settings } = useAuth();
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
  const [importScheduleName, setImportScheduleName] = useState('SCHADS Award 2025–2026');
  const [importEffectiveFrom, setImportEffectiveFrom] = useState('2025-07-01');
  const [importAwardCode, setImportAwardCode] = useState('MA000100');
  const [importDescription, setImportDescription] = useState('Fair Work Commission Annual Wage Review');
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

  const fetchSchedules = async (targetScheduleId?: number) => {
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

        if (schList.length > 0) {
          const activeOrFirst = targetScheduleId 
            ? schList.find(s => s.id === targetScheduleId) || schList[0]
            : schList.find(s => s.status === 'ACTIVE') || schList[0];
          setSelectedScheduleId(activeOrFirst.id);
          fetchRatesForSchedule(activeOrFirst.id);
        } else {
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

  const handleDeleteSchedule = async (schedule: AwardSchedule) => {
    if (!confirm(`Are you sure you want to delete the schedule "${schedule.name}" and all its ${schedule.rate_count} pay rates?`)) return;
    try {
      const res = await fetch(`/api/award-rates/schedules/${schedule.id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete schedule');
      showNotification('success', 'Award schedule removed.');
      fetchSchedules();
    } catch (e: any) {
      showNotification('error', e.message);
    }
  };

  const handleExportCsv = () => {
    if (!selectedScheduleId) return;
    window.location.href = `/api/award-rates/export?schedule_id=${selectedScheduleId}`;
  };

  const handleTestDateLookup = async () => {
    try {
      const res = await fetch(`/api/award-rates/for-date?date=${testDate}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          date: data.date || testDate,
          scheduleName: data.schedule?.name || 'No schedule found for this date',
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-bg border border-border-subtle p-5 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg border border-brand-teal/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Modern Award Pay Rates & Version Archiving
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SCHADS MA000100
                </span>
              </h2>
              <p className="text-xs text-[#8B949E] mt-0.5">
                Version-controlled pay rate schedules with automatic effective-date transitions. Historical shifts retain their exact rates while upcoming financial year updates activate automatically on your specified date.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".csv" 
            className="hidden" 
          />

          <button
            type="button"
            onClick={handleResetDefaultSchads}
            disabled={isImporting}
            className="px-3.5 py-2 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="Load the 2024–2025 SCHADS rates spreadsheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
            <span>Load Provided SCHADS CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportScheduleName(`SCHADS Award ${new Date().getFullYear() + 1}–${new Date().getFullYear() + 2}`);
              setImportEffectiveFrom(`${new Date().getFullYear() + 1}-07-01`);
              fileInputRef.current?.click();
            }}
            className="px-3.5 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Award Schedule</span>
          </button>

          {currentSchedule && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-brand-navy hover:bg-zinc-800 text-[#8B949E] hover:text-white border border-border-subtle rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Download current schedule rates as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
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
              Award Schedule Versions & Effective Dates
            </h3>
            <p className="text-xs text-[#8B949E] mt-0.5">
              Select an award schedule below to inspect its classifications, or upload a new financial year update.
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
              title="Verify which schedule applies to any shift date"
            />
            <button
              type="button"
              onClick={handleTestDateLookup}
              className="px-2.5 py-1 bg-brand-teal/20 hover:bg-brand-teal/30 text-brand-teal text-[11px] font-semibold rounded transition-colors"
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
              <strong>Localization & Timezone:</strong> Aligned with <span className="text-[#8B949E]">Settings &gt; General &gt; Localization &amp; System:</span> <strong className="text-brand-teal font-mono">{configuredTimezone}</strong>
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
            <button onClick={() => setTestResult(null)} className="text-zinc-400 hover:text-white ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Schedule Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {schedules.map((sch) => {
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
                    <h4 className="font-semibold text-white text-sm">{sch.name}</h4>
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
                  {schedules.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(sch);
                      }}
                      className="p-1 hover:text-rose-400 transition-colors"
                      title="Delete this schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
                  Schedule & Import New Award Pay Rates
                </h3>
                <p className="text-xs text-[#8B949E] mt-0.5">
                  Detected {previewRows.length} classifications in CSV file. Set the effective date below to schedule when these rates take effect.
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Options */}
            <div className="p-4 bg-brand-bg/80 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Schedule Name / Period</label>
                <input
                  type="text"
                  value={importScheduleName}
                  onChange={(e) => setImportScheduleName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. SCHADS Award 2025–2026"
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

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Award Code</label>
                <input
                  type="text"
                  value={importAwardCode}
                  onChange={(e) => setImportAwardCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. MA000100"
                />
              </div>

              <div>
                <label className="block text-[#8B949E] font-medium mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-brand-navy border border-border-subtle rounded-lg text-white focus:outline-none focus:border-brand-teal"
                  placeholder="e.g. FWC Annual Wage Increase"
                />
              </div>
            </div>

            {/* Archiving Notice */}
            <div className="p-3 bg-brand-navy/60 border-b border-border-subtle text-xs flex items-start gap-2.5 text-[#8B949E]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Non-Destructive Archiving: </strong>
                Past SCHADS award schedules will be preserved in your database. When interpreting shifts, the system automatically checks the shift date and matches the exact rate schedule that was active on that day.
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
