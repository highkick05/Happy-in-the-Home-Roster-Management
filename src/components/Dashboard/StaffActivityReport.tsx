import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Activity, Calendar, RefreshCw, SlidersHorizontal } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';

import { useLocalStorage } from '../../hooks/useLocalStorage';

export default function StaffActivityReport() {
  const { token } = useAuth();
  const [dateRange, setDateRange] = useLocalStorage('activity_date_range', {
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    log: any[];
    totals: any;
  } | null>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffFilter, setStaffFilter] = useLocalStorage('activity_staff_filter', '');

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('activity_visible_columns', [
    'dateAndDay',
    'time',
    'staffMember',
    'client',
    'serviceProvided',
    'dayCategory',
    'workHrs',
    'shiftDuration',
    'travelKm',
    'travelHrs',
    'travelReimbursement'
  ]);

  const columnsList = [
    { id: 'dateAndDay', label: 'Date & Day' },
    { id: 'time', label: 'Time' },
    { id: 'staffMember', label: 'Staff Member' },
    { id: 'client', label: 'Client' },
    { id: 'serviceProvided', label: 'Service Provided' },
    { id: 'dayCategory', label: 'Day Category' },
    { id: 'workHrs', label: 'Work (Hrs)' },
    { id: 'shiftDuration', label: 'Shift Duration (Hrs)' },
    { id: 'travelKm', label: 'Travel (Km)' },
    { id: 'travelHrs', label: 'Travel (Hrs)' },
    { id: 'travelReimbursement', label: 'Travel Reimbursement ($)' },
  ];

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev: string[]) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((colId) => colId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.filter((user: any) => user.role !== 'ADMIN'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      let url = `/api/reports/staff-activity?startDate=${dateRange.start}&endDate=${dateRange.end}&_t=${Date.now()}`;
      if (staffFilter) {
        url += `&staffId=${staffFilter}`;
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch report');
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (staffList.length > 0 && staffFilter) {
      const recordExists = staffList.some((s: any) => s.id.toString() === staffFilter);
      if (!recordExists) {
        setStaffFilter('');
      }
    }
  }, [staffList, staffFilter, setStaffFilter]);

  useEffect(() => {
    fetchReport();
    
    // Auto-refresh when window regains focus to keep data synchronized
    const handleFocus = () => fetchReport();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [dateRange.start, dateRange.end, staffFilter]);

  return (
    <div className="flex flex-col h-full space-y-6 min-h-[calc(100vh-120px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] flex items-center">
            <Activity className="w-6 h-6 mr-2 text-brand-teal" />
            Staff Activity & Service Breakdown
          </h2>
          <p className="text-[#8B949E] text-sm mt-1">Monitor staff hours, services provided, and travel distances</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={staffFilter} 
            onChange={(e) => setStaffFilter(e.target.value)}
            className="bg-brand-navy border border-border-subtle text-[#E6EDF3] text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-brand-teal transition-colors max-w-[200px]"
          >
            <option value="">All Staff</option>
            {staffList.map((st: any) => (
              <option key={st.id} value={st.id}>{st.first_name} {st.last_name}</option>
            ))}
          </select>
          <div className="flex items-center space-x-2 bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 focus-within:border-brand-teal transition-colors">
            <Calendar className="w-4 h-4 text-[#8B949E]" />
            <CustomDatePicker
              position="bottom"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none outline-none text-[#E6EDF3] text-sm"
            />
            <span className="text-[#8B949E]">-</span>
            <CustomDatePicker
              position="bottom"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none outline-none text-[#E6EDF3] text-sm"
            />
          </div>

          <div className="relative">
            <button 
              id="btn_toggle_columns"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-navy hover:bg-[#1f262e] text-[#E6EDF3] rounded-md text-sm transition-colors border border-border-subtle"
              title="Toggle Columns"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#8B949E]" />
              <span>Columns</span>
            </button>
            {showColumnDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setShowColumnDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-brand-navy border border-border-subtle rounded-lg shadow-xl py-2 z-50 text-left">
                  <div className="px-3 py-1 text-xs font-semibold text-[#8B949E] uppercase tracking-wider border-b border-border-subtle pb-2 mb-2">
                    Show / Hide Columns
                  </div>
                  <div className="max-h-80 overflow-y-auto px-1 space-y-0.5">
                    {columnsList.map((col) => {
                      const isChecked = visibleColumns.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          id={`col_option_${col.id}`}
                          onClick={() => toggleColumn(col.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-sm text-[#E6EDF3] hover:bg-brand-bg transition-colors text-left"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal h-4 w-4 pointer-events-none"
                          />
                          <span>{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-brand-navy hover:bg-[#1f262e] text-[#E6EDF3] rounded-md text-sm transition-colors border border-border-subtle"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-brand-navy border border-border-subtle rounded-xl overflow-hidden flex flex-col flex-1 shadow-sm">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-[#8B949E] relative">
            <thead className="text-xs uppercase bg-brand-bg text-[#8B949E] sticky top-0 z-10 font-medium border-b border-border-subtle">
              <tr>
                {visibleColumns.includes('dateAndDay') && <th className="px-5 py-4 min-w-[150px]">Date & Day</th>}
                {visibleColumns.includes('time') && <th className="px-5 py-4 min-w-[150px]">Time</th>}
                {visibleColumns.includes('staffMember') && <th className="px-5 py-4">Staff Member</th>}
                {visibleColumns.includes('client') && <th className="px-5 py-4 min-w-[150px]">Client</th>}
                {visibleColumns.includes('serviceProvided') && <th className="px-5 py-4 min-w-[200px]">Service Provided</th>}
                {visibleColumns.includes('dayCategory') && <th className="px-5 py-4 text-center">Day Category</th>}
                {visibleColumns.includes('workHrs') && <th className="px-5 py-4 text-right">Work (Hrs)</th>}
                {visibleColumns.includes('shiftDuration') && <th className="px-5 py-4 text-right">Shift Duration</th>}
                {visibleColumns.includes('travelKm') && <th className="px-5 py-4 text-right">Travel (Km)</th>}
                {visibleColumns.includes('travelHrs') && <th className="px-5 py-4 text-right">Travel (Hrs)</th>}
                {visibleColumns.includes('travelReimbursement') && <th className="px-5 py-4 text-right">Travel Reimbursement ($)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && !reportData ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-5 py-10 text-center text-[#8B949E]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-teal" />
                    Loading report data...
                  </td>
                </tr>
              ) : reportData?.log.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-5 py-10 text-center text-[#8B949E]">
                    No activity found for the selected date range.
                  </td>
                </tr>
              ) : (
                reportData?.log.map((row: any) => (
                  <tr key={row.id} className="hover:bg-brand-bg/50 transition-colors">
                    {visibleColumns.includes('dateAndDay') && (
                      <td className="px-5 py-3 whitespace-nowrap text-[#E6EDF3] font-medium">{row.dateAndDay}</td>
                    )}
                    {visibleColumns.includes('time') && (
                      <td className="px-5 py-3 whitespace-nowrap text-[#8B949E] text-xs">{row.timeString}</td>
                    )}
                    {visibleColumns.includes('staffMember') && (
                      <td className="px-5 py-3 text-[#E6EDF3]">{row.staffName}</td>
                    )}
                    {visibleColumns.includes('client') && (
                      <td className="px-5 py-3 text-[#E6EDF3]">{row.clientName}</td>
                    )}
                    {visibleColumns.includes('serviceProvided') && (
                      <td className="px-5 py-3 font-medium col_service_provided">
                        <span className={
                          /nurs|medic/i.test(row.serviceProvided || '')
                            ? 'text-pink-400'
                            : 'text-brand-teal'
                        }>
                          {row.serviceProvided || '-'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('dayCategory') && (
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          row.dayCategory === 'Public Holiday' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                          row.dayCategory === 'Sunday' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' :
                          row.dayCategory === 'Saturday' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-brand-bg text-[#8B949E] border border-border-subtle'
                        }`}>
                          {row.dayCategory}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes('workHrs') && (
                      <td className="px-5 py-3 text-right tabular-nums text-[#E6EDF3] font-semibold">{row.hoursWorked}</td>
                    )}
                    {visibleColumns.includes('shiftDuration') && (
                      <td className="px-5 py-3 text-right tabular-nums text-brand-teal font-medium">{row.shiftDuration !== undefined ? row.shiftDuration : '-'}</td>
                    )}
                    {visibleColumns.includes('travelKm') && (
                      <td className="px-5 py-3 text-right tabular-nums">{row.travelKm}</td>
                    )}
                    {visibleColumns.includes('travelHrs') && (
                      <td className="px-5 py-3 text-right tabular-nums">{row.travelHours !== undefined ? row.travelHours.toFixed(2) : '-'}</td>
                    )}
                    {visibleColumns.includes('travelReimbursement') && (
                      <td className="px-5 py-3 text-right tabular-nums">{row.travelReimbursement !== undefined ? `$${row.travelReimbursement.toFixed(2)}` : '-'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {reportData && (
          <div className="bg-brand-bg border-t border-border-subtle p-5 mt-auto shrink-0 animate-fade-in">
            <h3 className="text-sm font-semibold text-[#E6EDF3] uppercase tracking-wider mb-4 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-brand-teal" /> Unit Totals
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-semibold mb-1 uppercase tracking-wide">Total Weekday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.weekdayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-semibold mb-1 uppercase tracking-wide">Total Saturday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.saturdayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-semibold mb-1 uppercase tracking-wide">Total Sunday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.sundayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-semibold mb-1 uppercase tracking-wide">Total Pub Hol Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.publicHolidayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-gradient-to-br from-brand-teal/10 to-brand-green/10 rounded-lg p-3 border border-brand-teal/20">
                <div className="text-[#8B949E] text-xs font-semibold mb-1 uppercase tracking-wide">Total Travel Km</div>
                <div className="text-xl font-bold text-brand-teal tabular-nums">{reportData.totals.travelKm} <span className="text-sm font-normal text-brand-teal/70">km</span></div>
              </div>
              <div className="bg-gradient-to-br from-brand-teal/10 to-brand-green/10 rounded-lg p-3 border border-brand-teal/20">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[#8B949E] text-xs font-semibold uppercase tracking-wide">Total Travel Hrs</span>
                  <span className="bg-brand-teal/20 text-brand-teal text-[9px] font-bold px-1.5 py-0.5 rounded border border-brand-teal/30 shrink-0">Home Care</span>
                </div>
                <div className="text-xl font-bold text-brand-teal tabular-nums">{reportData.totals.travelHrs !== undefined ? reportData.totals.travelHrs : 0} <span className="text-sm font-normal text-brand-teal/70">hrs</span></div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-lg p-3 border border-indigo-500/20">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[#8B949E] text-xs font-semibold uppercase tracking-wide">Total Travel Pay</span>
                  <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">NDIS</span>
                </div>
                <div className="text-xl font-bold text-indigo-400 tabular-nums">${reportData.totals.travelPayTotal?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
