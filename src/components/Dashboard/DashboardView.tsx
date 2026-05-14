import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, FileText, Calendar, Clock, DollarSign, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, differenceInWeeks } from 'date-fns';

export default function DashboardView() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>({
    ndis: { clients: 0, shiftsThisWeek: 0, completedThisWeek: 0, avgWeeklyIncome: 0 },
    homeCare: { clients: 0, shiftsThisWeek: 0, completedThisWeek: 0, avgWeeklyIncome: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, shiftsRes, invoicesRes] = await Promise.all([
          fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/shifts', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/invoices', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const clientData = clientsRes.ok ? await clientsRes.json() : [];
        const shiftData = shiftsRes.ok ? await shiftsRes.json() : [];
        const invoiceData = invoicesRes.ok ? await invoicesRes.json() : [];

        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });

        // NDIS Data
        const ndisClients = clientData.filter((c: any) => c.funding_type === 'NDIS' || !c.funding_type);
        const ndisShifts = shiftData.filter((s: any) => s.funding_type === 'NDIS' || !s.funding_type);
        const ndisShiftsLeftThisWeek = ndisShifts.filter((s: any) => {
          const d = new Date(s.start_time);
          const endD = new Date(s.end_time);
          return d >= start && d <= end && endD > now && s.status === 'PUBLISHED';
        });
        const ndisNeedsCompletion = ndisShifts.filter((s: any) => {
          const endD = new Date(s.end_time);
          return endD <= now && s.status === 'PUBLISHED';
        });
        
        // Income calculation
        const ndisInvoices = invoiceData.filter((i: any) => {
          const shift = shiftData.find((s:any) => s.id === i.shift_id);
          return shift ? (shift.funding_type === 'NDIS' || !shift.funding_type) : false;
        });
        const totalNdisIncome = ndisInvoices.reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
        
        const earliestNdis = ndisShifts.length > 0 ? new Date(Math.min(...ndisShifts.map((s:any) => new Date(s.start_time).getTime()))) : new Date();
        let weeksNdis = differenceInWeeks(now, earliestNdis) + 1;
        if (weeksNdis < 1) weeksNdis = 1;

        // HC Data
        const hcClients = clientData.filter((c: any) => c.funding_type === 'HOME_CARE' || c.funding_type === 'Home Care' || c.funding_type === 'HCP');
        const hcShifts = shiftData.filter((s: any) => s.funding_type === 'HOME_CARE' || s.funding_type === 'Home Care' || s.funding_type === 'HCP');
        const hcShiftsLeftThisWeek = hcShifts.filter((s: any) => {
          const d = new Date(s.start_time);
          const endD = new Date(s.end_time);
          return d >= start && d <= end && endD > now && s.status === 'PUBLISHED';
        });
        const hcNeedsCompletion = hcShifts.filter((s: any) => {
          const endD = new Date(s.end_time);
          return endD <= now && s.status === 'PUBLISHED';
        });
        
        const hcInvoices = invoiceData.filter((i: any) => {
          const shift = shiftData.find((s:any) => s.id === i.shift_id);
          return shift ? (shift.funding_type === 'HOME_CARE' || shift.funding_type === 'Home Care' || shift.funding_type === 'HCP') : false;
        });
        const totalHcIncome = hcInvoices.reduce((acc: number, cur: any) => acc + (cur.amount || 0), 0);
        
        const earliestHc = hcShifts.length > 0 ? new Date(Math.min(...hcShifts.map((s:any) => new Date(s.start_time).getTime()))) : new Date();
        let weeksHc = differenceInWeeks(now, earliestHc) + 1;
        if (weeksHc < 1) weeksHc = 1;

        setStats({
          ndis: {
            clients: ndisClients.length,
            shiftsThisWeek: ndisShiftsLeftThisWeek.length,
            completedThisWeek: ndisNeedsCompletion.length,
            avgWeeklyIncome: totalNdisIncome / weeksNdis
          },
          homeCare: {
            clients: hcClients.length,
            shiftsThisWeek: hcShiftsLeftThisWeek.length,
            completedThisWeek: hcNeedsCompletion.length,
            avgWeeklyIncome: totalHcIncome / weeksHc
          }
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, [token]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col">
        <h2 className="text-3xl font-sans font-semibold text-[#E6EDF3] tracking-wide flex items-center mb-2">
          Dashboard Overview
        </h2>
        <p className="text-[#8B949E] text-sm">
          Welcome back, <span className="text-brand-teal font-bold">{user?.firstName}</span>. Here's what's happening today.
        </p>
      </div>

      {/* NDIS Section */}
      <div>
        <h3 className="text-lg font-sans text-brand-teal mb-4 flex items-center font-semibold">
          NDIS Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-teal"><Users className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Total NDIS Clients</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.ndis.clients}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-teal"><Calendar className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Shifts Left This Week</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.ndis.shiftsThisWeek}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-green"><Clock className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Needs Completion</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.ndis.completedThisWeek}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-blue"><Activity className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Avg Weekly Revenue</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">${stats.ndis.avgWeeklyIncome.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Home Care Section */}
      <div>
        <h3 className="text-lg font-sans text-brand-teal mb-4 mt-6 flex items-center font-semibold">
          Home Care Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-teal"><Users className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Total HC Clients</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.homeCare.clients}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-teal"><Calendar className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Shifts Left This Week</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.homeCare.shiftsThisWeek}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-green"><Clock className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Needs Completion</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">{stats.homeCare.completedThisWeek}</p>
          </div>
          
          <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group transition-all gap-3">
            <div className="flex items-center space-x-3 z-10"><div className="p-2 rounded-md bg-brand-bg border border-border-subtle text-brand-blue"><Activity className="w-4 h-4"/></div><p className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider truncate">Avg Weekly Revenue</p></div>
            <p className="text-3xl font-sans font-semibold tracking-tight text-[#E6EDF3] mt-2 z-10">${stats.homeCare.avgWeeklyIncome.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
        <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 relative overflow-hidden flex flex-col items-start gap-4">
          <h3 className="text-lg font-sans font-semibold text-brand-teal flex items-center"><Calendar className="w-4 h-4 mr-2" /> Upcoming Roster</h3>
          <div className="w-full flex-1 rounded-lg border border-border-subtle flex flex-col items-center justify-center py-10 px-4 text-center bg-brand-bg">
             <Calendar className="w-8 h-8 text-[#8B949E] mb-3" />
             <p className="text-[#8B949E] text-sm mb-4">Manage your shifts and assignments.</p>
             <Link to="/roster" className="px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-sm font-semibold rounded-md transition-all">
               Go to Roster
             </Link>
          </div>
        </div>
        
        <div className="bg-brand-navy border border-border-subtle rounded-xl p-5 relative overflow-hidden flex flex-col items-start gap-4">
          <h3 className="text-lg font-sans font-semibold text-brand-teal flex items-center"><FileText className="w-4 h-4 mr-2" /> Recent Invoices</h3>
          <div className="w-full flex-1 rounded-lg border border-border-subtle flex flex-col items-center justify-center py-10 px-4 text-center bg-brand-bg">
             <FileText className="w-8 h-8 text-[#8B949E] mb-3" />
             <p className="text-[#8B949E] text-sm mb-4">Automated compliant invoices are generated upon shift completion.</p>
             <Link to="/invoices" className="px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green text-white text-sm font-semibold rounded-md transition-all">
               View Invoices
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
