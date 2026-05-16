import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Activity, Calendar, Download, RefreshCw } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';

export default function StaffActivityReport() {
  const { token, user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    log: any[];
    totals: any;
  } | null>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffFilter, setStaffFilter] = useState('');

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
      let url = `/api/reports/staff-activity?startDate=${dateRange.start}&endDate=${dateRange.end}`;
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
              
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none outline-none text-[#E6EDF3] text-sm"
            />
            <span className="text-[#8B949E]">-</span>
            <CustomDatePicker
              
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none outline-none text-[#E6EDF3] text-sm"
            />
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
                <th className="px-5 py-4 min-w-[150px]">Date & Day</th>
                <th className="px-5 py-4">Staff Member</th>
                <th className="px-5 py-4 min-w-[150px]">Client</th>
                <th className="px-5 py-4 min-w-[200px]">Service Provided</th>
                <th className="px-5 py-4 text-center">Day Category</th>
                <th className="px-5 py-4 text-right">Hours Worked</th>
                <th className="px-5 py-4 text-right">Travel (Km)</th>
                <th className="px-5 py-4 text-right">Travel Reimbursement ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading && !reportData ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-[#8B949E]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-teal" />
                    Loading report data...
                  </td>
                </tr>
              ) : reportData?.log.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-[#8B949E]">
                    No activity found for the selected date range.
                  </td>
                </tr>
              ) : (
                reportData?.log.map((row: any) => (
                  <tr key={row.id} className="hover:bg-brand-bg/50 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-[#E6EDF3] font-medium">{row.dateAndDay}</td>
                    <td className="px-5 py-3 text-[#E6EDF3]">{row.staffName}</td>
                    <td className="px-5 py-3 text-[#E6EDF3]">{row.clientName}</td>
                    <td className="px-5 py-3 font-medium">
                      <span className={
                        /nurs|medic/i.test(row.serviceProvided || '')
                          ? 'text-pink-400'
                          : 'text-brand-teal'
                      }>
                        {row.serviceProvided || '-'}
                      </span>
                    </td>
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
                    <td className="px-5 py-3 text-right tabular-nums text-[#E6EDF3] font-semibold">{row.hoursWorked}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.travelKm}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{row.travelReimbursement !== undefined ? `$${row.travelReimbursement.toFixed(2)}` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {reportData && (
          <div className="bg-brand-bg border-t border-border-subtle p-5 mt-auto shrink-0">
            <h3 className="text-sm font-semibold text-[#E6EDF3] uppercase tracking-wider mb-4 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-brand-teal" /> Unit Totals
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Weekday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.weekdayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Saturday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.saturdayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Sunday Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.sundayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-brand-navy rounded-lg p-3 border border-border-subtle">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Pub Hol Hrs</div>
                <div className="text-xl font-bold text-[#E6EDF3] tabular-nums">{reportData.totals.publicHolidayHours} <span className="text-sm font-normal text-[#8B949E]">hrs</span></div>
              </div>
              <div className="bg-gradient-to-br from-brand-teal/10 to-brand-green/10 rounded-lg p-3 border border-brand-teal/20">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Travel</div>
                <div className="text-xl font-bold text-brand-teal tabular-nums">{reportData.totals.travelKm} <span className="text-sm font-normal text-brand-teal/70">km</span></div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-lg p-3 border border-indigo-500/20">
                <div className="text-[#8B949E] text-xs font-medium mb-1 uppercase tracking-wide">Total Travel Pay</div>
                <div className="text-xl font-bold text-indigo-400 tabular-nums">${reportData.totals.travelPayTotal?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
