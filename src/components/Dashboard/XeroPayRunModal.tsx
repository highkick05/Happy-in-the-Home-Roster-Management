import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Car, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface XeroPayRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  token: string;
  onSuccess?: () => void;
}

export default function XeroPayRunModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  token,
  onSuccess
}: XeroPayRunModalProps) {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [needsReconnect, setNeedsReconnect] = useState<boolean>(false);
  const [isReauthorizing, setIsReauthorizing] = useState<boolean>(false);
  const [reauthSuccess, setReauthSuccess] = useState<string>('');

  // Listen for OAuth success message from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'XERO_AUTH_SUCCESS') {
        setIsReauthorizing(false);
        setNeedsReconnect(false);
        setErrorMessage('');
        setReauthSuccess('Xero successfully re-authorized with updated payroll permissions!');
        fetchPreviewAndCalendars();
        setTimeout(() => setReauthSuccess(''), 6000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [startDate, endDate]);

  const handleReauthorizeXero = async () => {
    setIsReauthorizing(true);
    setReauthSuccess('');
    try {
      const redirectUri = `${window.location.origin}/api/xero/callback`;
      const res = await fetch(`/api/xero/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not generate Xero authorization URL.');
      }
      const popup = window.open(
        data.url,
        'xero_oauth_popup',
        'width=650,height=750,menubar=no,toolbar=no,location=no,status=no'
      );
      if (!popup) {
        alert('Please allow popups in your browser to complete Xero authentication.');
        setIsReauthorizing(false);
      }
    } catch (err: any) {
      setIsReauthorizing(false);
      alert(err.message || 'Failed to start Xero authorization.');
    }
  };

  const fetchPreviewAndCalendars = async () => {
    setLoading(true);
    setErrorMessage('');
    setSubmitResult(null);

    try {
      // 1. Fetch pay run preview
      const previewRes = await fetch(`/api/xero/payrun/preview?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const preview = await previewRes.json();
      if (!previewRes.ok) {
        throw new Error(preview.error || 'Failed to calculate pay run preview');
      }
      setPreviewData(preview);

      // Auto-select all ready staff
      if (Array.isArray(preview.staff)) {
        const readyIds = preview.staff
          .filter((s: any) => s.isLinked && (s.totalHours > 0 || s.ndisTravelKm > 0 || s.homeCareTravelKm > 0))
          .map((s: any) => s.staffId);
        setSelectedStaffIds(readyIds);
      }

      // 2. Fetch calendars
      const calRes = await fetch('/api/xero/calendars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const calData = await calRes.json();
      if (calRes.ok && Array.isArray(calData.calendars)) {
        setCalendars(calData.calendars);
        const fortnightly = calData.calendars.find(
          (c: any) => c.calendarType === 'FORTNIGHTLY' || c.name.toLowerCase().includes('fortnight')
        );
        if (fortnightly) {
          setSelectedCalendarId(fortnightly.id);
        } else if (calData.calendars.length > 0) {
          setSelectedCalendarId(calData.calendars[0].id);
        }
      } else if (calData?.needsReconnect) {
        setNeedsReconnect(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Error loading pay run data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreviewAndCalendars();
    }
  }, [isOpen, startDate, endDate]);

  const handleToggleStaff = (staffId: number) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSelectAll = () => {
    if (!previewData?.staff) return;
    const eligible = previewData.staff
      .filter((s: any) => s.isLinked && (s.totalHours > 0 || s.ndisTravelKm > 0 || s.homeCareTravelKm > 0))
      .map((s: any) => s.staffId);
    
    if (selectedStaffIds.length === eligible.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(eligible);
    }
  };

  const handleCreatePayRun = async () => {
    if (selectedStaffIds.length === 0) {
      alert('Please select at least one staff member to include in the pay run.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/xero/payrun/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate,
          endDate,
          payrollCalendarId: selectedCalendarId || undefined,
          staffIds: selectedStaffIds
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.needsReconnect || res.status === 401 || (data.error && (data.error.includes('401') || data.error.toLowerCase().includes('authorizationunsuccessful')))) {
          setNeedsReconnect(true);
        }
        throw new Error(data.error || 'Failed to create Draft Pay Run in Xero');
      }

      setSubmitResult(data);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Failed to send pay run to Xero');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const staffList = previewData?.staff || [];
  const eligibleStaff = staffList.filter((s: any) => s.totalHours > 0 || s.ndisTravelKm > 0 || s.homeCareTravelKm > 0);
  const unlinkedStaff = eligibleStaff.filter((s: any) => !s.isLinked);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs" onClick={onClose}>
      <div 
        className="bg-[#09090b] border border-sky-500/30 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden text-[#E6EDF3]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-brand-navy/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Push Fortnight Pay Run to Xero</h3>
                <span className="px-2 py-0.2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded text-[10px] font-semibold">
                  AU Payroll
                </span>
              </div>
              <p className="text-xs text-[#8B949E] mt-0.5 flex items-center gap-2">
                <span>Period: <strong className="text-zinc-200">{startDate}</strong> to <strong className="text-zinc-200">{endDate}</strong></span>
                <span>•</span>
                <span>Creates a <strong>Draft Pay Run</strong> in Xero with breakdown of worked hours and travel</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs text-[#8B949E]">Calculating shift hours, award rates, and travel allowances...</p>
            </div>
          ) : submitResult ? (
            /* Success View */
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Draft Pay Run Successfully Created in Xero!</h4>
                <p className="text-xs text-[#8B949E] mt-1 max-w-md mx-auto">
                  All selected staff payslips have been populated with ordinary hours, penalties, and travel allowances in your Xero organization.
                </p>
              </div>

              <div className="max-w-md mx-auto p-3.5 bg-black/40 border border-emerald-500/25 rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Xero Pay Run Status:</span>
                  <span className="font-semibold text-emerald-400">{submitResult.payRunStatus || 'DRAFT'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Payroll Calendar:</span>
                  <span className="font-semibold text-white">{submitResult.calendarName || 'Fortnightly'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.06]">
                  <span className="text-zinc-400">Pay Period:</span>
                  <span className="font-semibold text-white">{submitResult.periodStartDate} – {submitResult.periodEndDate}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Employees Updated:</span>
                  <span className="font-semibold text-white">{submitResult.employeesUpdated} staff payslips</span>
                </div>
              </div>

              {submitResult.staffSummary && submitResult.staffSummary.length > 0 && (
                <div className="max-w-md mx-auto p-3 bg-black/40 border border-white/[0.08] rounded-xl text-left text-xs space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Employee Payslip Status:</div>
                  {submitResult.staffSummary.map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded bg-white/[0.03] border border-white/[0.04] text-[11px]">
                      <span className="text-white font-medium">{s.staffName}</span>
                      {s.status === 'SUCCESS' ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {s.linesSent} rates sent
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1" title={s.error}>
                          <AlertCircle className="w-3.5 h-3.5" /> {s.error || 'Skipped'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {submitResult.warnings && submitResult.warnings.length > 0 && (
                <div className="max-w-md mx-auto p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-left text-[11px] text-amber-200 space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Notices for review in Xero:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {submitResult.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href="https://go.xero.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-brand-navy font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <span>Open Xero Payroll</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Review & Create View */
            <>
              {reauthSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{reauthSuccess}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-2.5">
                  <div className="flex items-start gap-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <strong className="block text-rose-200 font-semibold">Error preparing Xero Pay Run:</strong>
                      <span className="text-zinc-300">{errorMessage}</span>
                    </div>
                  </div>

                  {(needsReconnect || errorMessage.includes('401') || errorMessage.toLowerCase().includes('authorizationunsuccessful') || errorMessage.toLowerCase().includes('permission')) && (
                    <div className="pt-2 border-t border-rose-500/20 space-y-2">
                      <div className="text-[11px] text-zinc-300 bg-black/40 p-2.5 rounded-lg border border-white/[0.06] space-y-1.5">
                        <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Why this happened:</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                          <li>
                            Your active Xero token does not have the <strong>Payroll Pay Runs</strong> permission (<code className="text-sky-300 bg-sky-950/60 px-1 py-0.2 rounded font-mono">payroll.payruns</code> and <code className="text-sky-300 bg-sky-950/60 px-1 py-0.2 rounded font-mono">payroll.payslip</code>), or was authorized before pay runs were enabled.
                          </li>
                          <li>
                            Or your Xero user account does not have the <strong>Payroll Admin</strong> role within your Xero organisation.
                          </li>
                          <li>
                            In <span className="text-sky-400 font-medium">developer.xero.com &gt; My Apps &gt; Configuration &gt; Scopes</span>, ensure <strong>payroll.payruns</strong> and <strong>payroll.payslip</strong> are enabled.
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={handleReauthorizeXero}
                          disabled={isReauthorizing}
                          className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-brand-navy font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isReauthorizing ? 'animate-spin' : ''}`} />
                          <span>{isReauthorizing ? 'Opening Xero...' : 'Re-authorize with Xero (Grant Payroll Permissions)'}</span>
                        </button>

                        <a
                          href="/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Open Xero Settings</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Calendar & Config Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-black/40 border border-white/[0.08] rounded-xl">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Xero Payroll Calendar
                  </label>
                  <select
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    className="w-full bg-brand-navy border border-border-subtle rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400 transition-colors"
                  >
                    {calendars.length === 0 ? (
                      <option value="">Default Fortnightly</option>
                    ) : (
                      calendars.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.calendarType})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Total Hours in Fortnight
                  </label>
                  <div className="text-xs font-semibold text-white px-2.5 py-1.5 bg-brand-navy border border-border-subtle rounded-md flex items-center justify-between">
                    <span>{previewData?.totals?.totalHours || 0} hrs</span>
                    <span className="text-[10px] text-zinc-400 font-normal font-mono">
                      Wkday: {previewData?.totals?.weekdayHours || 0}h • Sat: {previewData?.totals?.saturdayHours || 0}h • Sun: {previewData?.totals?.sundayHours || 0}h • Hol: {previewData?.totals?.publicHolidayHours || 0}h
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                    Total Travel Distance
                  </label>
                  <div className="text-xs font-semibold text-white px-2.5 py-1.5 bg-brand-navy border border-border-subtle rounded-md flex items-center justify-between">
                    <span>{((previewData?.totals?.ndisTravelKm || 0) + (previewData?.totals?.homeCareTravelKm || 0)).toFixed(1)} km</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      NDIS: {previewData?.totals?.ndisTravelKm || 0} km • HCP: {previewData?.totals?.homeCareTravelKm || 0} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning for unlinked staff if any */}
              {unlinkedStaff.length > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <strong className="text-amber-300 font-semibold">{unlinkedStaff.length} staff member{unlinkedStaff.length > 1 ? 's have' : ' has'} worked hours but is not linked to Xero: </strong>
                    <span>{unlinkedStaff.map((u: any) => u.portalName).join(', ')}. </span>
                    <span className="text-zinc-300">They can be mapped in Directory &gt; Staff Details. Only linked staff can be sent to Xero.</span>
                  </div>
                </div>
              )}

              {/* Staff Table */}
              <div className="border border-border-subtle rounded-xl overflow-hidden bg-brand-navy/40">
                <div className="flex items-center justify-between px-3 py-2 bg-brand-bg/80 border-b border-border-subtle text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.length > 0 && selectedStaffIds.length === eligibleStaff.filter((s: any) => s.isLinked).length}
                      onChange={handleSelectAll}
                      className="rounded border-border-subtle bg-brand-navy text-sky-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-semibold text-white">
                      Staff Breakdown for this Fortnight ({eligibleStaff.length} with hours)
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {selectedStaffIds.length} of {eligibleStaff.filter((s: any) => s.isLinked).length} eligible selected
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 custom-scrollbar">
                  <table className="w-full text-left text-xs text-[#8B949E]">
                    <thead className="text-[10px] uppercase bg-black/30 text-zinc-400 sticky top-0 z-10 border-b border-white/[0.04]">
                      <tr>
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">Staff Member</th>
                        <th className="px-3 py-2">Xero Link</th>
                        <th className="px-3 py-2 text-right">Weekday</th>
                        <th className="px-3 py-2 text-right">Saturday</th>
                        <th className="px-3 py-2 text-right">Sunday</th>
                        <th className="px-3 py-2 text-right">Pub Hol</th>
                        <th className="px-3 py-2 text-right">NDIS Travel</th>
                        <th className="px-3 py-2 text-right">HCP Travel</th>
                        <th className="px-3 py-2 text-right font-bold text-zinc-300">Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {eligibleStaff.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-zinc-500 text-xs">
                            No completed shifts found in this date range.
                          </td>
                        </tr>
                      ) : (
                        eligibleStaff.map((staff: any) => {
                          const isSelected = selectedStaffIds.includes(staff.staffId);
                          return (
                            <tr 
                              key={staff.staffId} 
                              className={`hover:bg-white/[0.02] transition-colors ${!staff.isLinked ? 'opacity-60' : ''}`}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  disabled={!staff.isLinked}
                                  checked={isSelected}
                                  onChange={() => handleToggleStaff(staff.staffId)}
                                  className="rounded border-border-subtle bg-brand-navy text-sky-500 focus:ring-0 cursor-pointer disabled:opacity-40"
                                />
                              </td>
                              <td className="px-3 py-2 font-medium text-white">
                                <div>{staff.portalName}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {staff.payCategoryName ? (
                                    <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/50 rounded px-1.5 py-0.2">
                                      {staff.payCategoryName}
                                    </span>
                                  ) : staff.email ? (
                                    <span className="text-[10px] text-zinc-500">{staff.email}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {staff.isLinked ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {staff.xeroEmployeeName || 'Linked'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                                    Not Linked
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.weekdayHours > 0 ? 'text-white font-semibold' : 'text-zinc-600'}>
                                  {staff.weekdayHours}h
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.saturdayHours > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-600'}>
                                  {staff.saturdayHours}h
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.sundayHours > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-600'}>
                                  {staff.sundayHours}h
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.publicHolidayHours > 0 ? 'text-purple-400 font-semibold' : 'text-zinc-600'}>
                                  {staff.publicHolidayHours}h
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.ndisTravelKm > 0 ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
                                  {staff.ndisTravelKm > 0 ? `${staff.ndisTravelKm}km` : '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={staff.homeCareTravelKm > 0 ? 'text-sky-400 font-medium' : 'text-zinc-600'}>
                                  {staff.homeCareTravelKm > 0 ? `${staff.homeCareTravelKm}km` : '-'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-white">
                                {staff.totalHours} hrs
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitResult && (
          <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-brand-navy/60 flex items-center justify-between shrink-0">
            <div className="text-xs text-[#8B949E]">
              {selectedStaffIds.length} staff selected for pay run creation
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || selectedStaffIds.length === 0}
                onClick={handleCreatePayRun}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-brand-navy font-bold rounded-lg text-xs flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating in Xero...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Xero (Create Draft Pay Run)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
