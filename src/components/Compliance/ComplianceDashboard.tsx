import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Download, Users, Briefcase, FileCheck, Search, FileText, ClipboardList,
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import CustomDatePicker from '../ui/CustomDatePicker';

const ONBOARDING_STEP_LABELS: Record<string, string> = {
  ndis_screening: 'NDIS Screen Check (NWSC)',
  wwcc: 'Working with Children Check (WWCC)',
  vevo: 'Right to Work / VEVO',
  ahpra: 'AHPRA Registration',
  ndis_orientation: 'NDIS Orientation Module',
  cpr: 'HLTAID009 CPR',
  first_aid: 'HLTAID011 First Aid',
  manual_handling: 'Manual Handling',
  driver_license: "Driver's License",
  car_insurance: 'Car Insurance (Business)',
  flu_shot: 'Annual Influenza Vaccine',
  immunisation: 'Immunisation History',
  covid_vaccine: 'COVID Immunisation'
};

export default function ComplianceDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'evidence' | 'staff' | 'mandatory_documents'>('evidence');
  
  // States for Evidence Pack (Clients)
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');
  
  const [evidenceMatrix, setEvidenceMatrix] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [isGeneratingEvidence, setIsGeneratingEvidence] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // States for Staff Logbook
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffStartDate, setStaffStartDate] = useState('');
  const [staffEndDate, setStaffEndDate] = useState('');
  const [isGeneratingLogbook, setIsGeneratingLogbook] = useState(false);

  // States for Mandatory Documents
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [complianceSearch, setComplianceSearch] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<number | null>(null);

  // States for Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchStaff();
    fetchLogs();
  }, [token]);

  useEffect(() => {
    fetchMatrix();
  }, [token, selectedClient, clientStartDate, clientEndDate]);

  const fetchMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const q = new URLSearchParams();
      if (selectedClient) q.append('clientId', selectedClient);
      if (clientStartDate) q.append('startDate', clientStartDate);
      if (clientEndDate) q.append('endDate', clientEndDate);
      const res = await fetch(`/api/compliance/evidence/matrix?${q.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEvidenceMatrix(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const fetchComplianceData = async () => {
    setLoadingCompliance(true);
    try {
      const res = await fetch('/api/admin/staff-compliance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setComplianceData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCompliance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mandatory_documents') {
      fetchComplianceData();
    }
  }, [activeTab, token]);

  const downloadFile = async (id: number, filename: string) => {
    try {
      const res = await fetch(`/api/files/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Failed to download file');
      }
    } catch (err) {
      console.error(err);
      alert('Error downloading file');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/compliance/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error(e);
    }
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

  const downloadEvidencePack = async () => {
    setIsGeneratingEvidence(true);
    setExportError(null);
    try {
      const q = new URLSearchParams();
      if (selectedClient) q.append('clientId', selectedClient);
      if (clientStartDate) q.append('startDate', clientStartDate);
      if (clientEndDate) q.append('endDate', clientEndDate);
      const res = await fetch(`/api/compliance/export/evidence?${q.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate evidence pack. Make sure there is data matching your criteria.');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Compliance_Evidence_Ledger.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error: any) {
      setExportError(error?.message || "An unknown error occurred while exporting.");
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsGeneratingEvidence(false);
    }
  };

  const downloadStaffLogbook = async () => {
    if (!selectedStaff || !staffStartDate || !staffEndDate) return;
    setIsGeneratingLogbook(true);
    try {
      const res = await fetch(`/api/compliance/staff-logbook?staffId=${selectedStaff}&startDate=${staffStartDate}&endDate=${staffEndDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate staff logbook');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const formatYMDtoDMY = (ymd: string) => ymd ? ymd.split('-').reverse().join('-') : '';
      a.download = `Staff_Logbook_${selectedStaff}_${formatYMDtoDMY(staffStartDate)}_to_${formatYMDtoDMY(staffEndDate)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert("Error generating staff logbook. " + error);
    } finally {
      setIsGeneratingLogbook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-2">Compliance & Audit</h2>
           <p className="text-[#8B949E] text-sm mt-1">Immutable evidence generation and audit-ready data extraction.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-brand-navy shadow-sm p-1 rounded-lg w-fit border border-border-subtle">
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ${activeTab === 'evidence' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <Briefcase className="w-4 h-4 mr-2" /> Client Evidence Pack
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ${activeTab === 'staff' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <Users className="w-4 h-4 mr-2" /> Workforce Compliance
        </button>
        <button
          onClick={() => setActiveTab('mandatory_documents')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ${activeTab === 'mandatory_documents' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" /> Mandatory Documents
        </button>
      </div>

      {activeTab === 'evidence' && (
        <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-visible flex flex-col items-stretch">
           <div className="p-4 md:p-6 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
             <div>
               <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-1"><FileCheck className="w-5 h-5 mr-2 text-brand-teal" /> Global Evidence Ledger</h3>
               <p className="text-sm text-[#8B949E] max-w-3xl">
                 Comprehensive log of all completed shifts, compliance statuses, and un-redacted tracking data for NDIA or Home Care auditors.
               </p>
               {exportError && (
                 <div className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-md font-medium">
                   {exportError}
                 </div>
               )}
             </div>
             
             <button
               onClick={downloadEvidencePack}
               disabled={isGeneratingEvidence || loadingMatrix}
               className="shrink-0 flex items-center px-4 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded-md font-medium text-sm shadow-sm transition-all"
             >
               {isGeneratingEvidence ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> 
               ) : (
                  <Download className="w-4 h-4 mr-2" /> 
               )}
               {isGeneratingEvidence ? 'Exporting...' : 'Export Evidence Ledger (Excel)'}
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-sm font-medium text-[#8B949E]">Filter by Client</label>
                 <select 
                   value={selectedClient} 
                   onChange={e => setSelectedClient(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal transition-colors"
                 >
                   <option value="">All Clients (Global Ledger)</option>
                   {clients.map(c => (
                     <option key={c.id} value={c.id}>{c.first_name || c.firstName} {c.last_name || c.lastName}</option>
                   ))}
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">Start Date</label>
                 <CustomDatePicker 
                    position="bottom"
                   value={clientStartDate} 
                   onChange={e => setClientStartDate(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal min-h-[42px] transition-colors" 
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">End Date</label>
                 <CustomDatePicker 
                    position="bottom"
                   value={clientEndDate} 
                   onChange={e => setClientEndDate(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal min-h-[42px] transition-colors" 
                 />
              </div>
           </div>

           <div className="overflow-x-auto">
             {loadingMatrix ? (
                 <div className="flex flex-col items-center justify-center p-12 text-center py-20">
                   <span className="w-8 h-8 border-4 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin mb-4" />
                   <p className="text-[#8B949E] text-sm">Loading ledger...</p>
                 </div>
             ) : (
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="text-xs text-[#E6EDF3] uppercase tracking-wider bg-zinc-800 border-b border-border-subtle font-bold">
                     <tr>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Client Name</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Service Date</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Shift Timestamps</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Care Type</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Logged Care Hrs</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Transport KM</th>
                       <th className="px-4 py-3 whitespace-nowrap">Travel Cost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle text-[#E6EDF3]">
                     {evidenceMatrix.length === 0 ? (
                       <tr>
                         <td colSpan={8} className="px-4 py-8 text-center text-[#8B949E]">No evidence records available.</td>
                       </tr>
                     ) : (
                       evidenceMatrix.map((row, idx) => {
                         const startString = (row.actual_start_time || row.start_time || '').split('T')[1]?.substring(0, 5) || 'N/A';
                         const endString = (row.actual_finish_time || row.end_time || '').split('T')[1]?.substring(0, 5) || 'N/A';
                         
                         let hrs = 0;
                         if (row.actual_start_time && row.actual_finish_time) {
                           hrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;
                         } else if (row.start_time && row.end_time) {
                           hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                         }

                         const km = (row.provider_travel_km || 0) + (row.home_care_travel_km || 0) + (row.abt_km || 0);

                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                         let noteStatusStr = 'Missing';

                         if (row.notes) {
                           noteBadgeCls = 'bg-brand-green/10 border-brand-green/20 text-brand-green';
                           noteStatusStr = 'Completed';
                         } else if (Math.abs(new Date().getTime() - new Date(row.end_time).getTime()) < 48 * 3600000) {
                             // within 48h
                             noteBadgeCls = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                             noteStatusStr = 'Pending Sync';
                         }
                         
                         return (
                           <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? row.start_time.split('T')[0] : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${row.funding_type === 'HOME_CARE' ? 'bg-purple-900/10 border-purple-900/20 text-purple-400' : 'bg-blue-900/10 border-blue-900/20 text-blue-400'}`}>
                                 {row.funding_type === 'HOME_CARE' ? 'Home Care' : 'NDIS'}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${noteBadgeCls}`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">${km.toFixed(2)}</td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
             )}
           </div>
        </div>
      )}

      {activeTab === 'staff' && (
         <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-visible p-4 md:p-6">
           <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-2"><FileText className="w-5 h-5 mr-2 text-brand-green" /> Generate Staff Logbook (Workforce Compliance)</h3>
           <p className="text-sm text-[#8B949E] mb-6 max-w-4xl">
             Produces an Hours Worked Report and a Vehicle Usage Statement showing precise times, shift statuses, and claimed distance cross-referenced against the immutable audit trail.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">Select Staff</label>
                 <select 
                   value={selectedStaff} 
                   onChange={e => setSelectedStaff(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal transition-colors"
                 >
                   <option value="">-- Choose Staff --</option>
                   {staffList.filter(s => s.role === 'STAFF').map(s => (
                     <option key={s.id} value={s.id}>{s.first_name || s.firstName} {s.last_name || s.lastName}</option>
                   ))}
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">Start Date</label>
                 <CustomDatePicker 
                    position="bottom"
                   value={staffStartDate} 
                   onChange={e => setStaffStartDate(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal min-h-[42px] transition-colors" 
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">End Date</label>
                 <CustomDatePicker 
                    position="bottom"
                   value={staffEndDate} 
                   onChange={e => setStaffEndDate(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal min-h-[42px] transition-colors" 
                 />
              </div>
           </div>

           <button
             onClick={downloadStaffLogbook}
             disabled={!selectedStaff || !staffStartDate || !staffEndDate || isGeneratingLogbook}
             className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded-md font-medium text-sm shadow-sm transition-all"
           >
             {isGeneratingLogbook ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> 
             ) : (
                <Download className="w-4 h-4 mr-2" /> 
             )}
             {isGeneratingLogbook ? 'Generating Logbook...' : 'Download Staff Logbook (PDF)'}
           </button>
        </div>
      )}

      {activeTab === 'mandatory_documents' && (
        <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-hidden p-0">
          <div className="p-4 md:p-6 border-b border-border-subtle bg-[#121214]">
            <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-2"><ClipboardList className="w-5 h-5 mr-2 text-brand-teal" /> Global Mandatory Documents</h3>
            <p className="text-sm text-[#8B949E]">
              Summary list of all 13 flat matrix mandatory compliance items for active personnel. Staff members receive automatic daily reminders for expiring credentials.
            </p>
          </div>

          <div className="p-4 md:p-6 bg-brand-bg/50 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-[#8B949E]" />
              </span>
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={complianceSearch}
                onChange={e => setComplianceSearch(e.target.value)}
                className="w-full bg-brand-navy border border-border-subtle rounded-md pl-10 pr-4 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all"
              />
            </div>
            <button
              onClick={fetchComplianceData}
              disabled={loadingCompliance}
              className="flex items-center px-4 py-2.5 text-sm text-[#E6EDF3] bg-zinc-805 hover:bg-zinc-800 border border-border-subtle rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingCompliance ? 'animate-spin' : ''}`} />
              Refresh Compliance Status
            </button>
          </div>

          <div className="bg-brand-navy">
            {(() => {
              const filteredCompliance = complianceData.filter(staff => {
                const sTerm = complianceSearch.toLowerCase();
                const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.toLowerCase();
                const email = (staff.email || '').toLowerCase();
                return fullName.includes(sTerm) || email.includes(sTerm);
              });

              const getStaffComplianceSummary = (complianceObj: Record<string, any>) => {
                let expired = 0;
                let expiring = 0;
                let missing = 0;
                let valid = 0;

                Object.values(complianceObj).forEach((item: any) => {
                  if (item.status === 'EXPIRED') expired++;
                  else if (item.status === 'EXPIRING_SOON') expiring++;
                  else if (item.status === 'MISSING') missing++;
                  else if (item.status === 'VALID') valid++;
                });

                const totalUploaded = expired + expiring + valid;

                let pillBg = 'bg-brand-green/10 border-brand-green/20 text-brand-green';
                let pillText = 'Fully Compliant';
                let iconClass = 'w-4 h-4 mr-1 text-brand-green';

                if (expired > 0) {
                  pillBg = 'bg-red-500/10 border-red-500/25 text-red-400';
                  pillText = `${expired} Expired`;
                  iconClass = 'w-4 h-4 mr-1 text-red-400';
                } else if (missing > 0) {
                  pillBg = 'bg-zinc-500/10 border-border-subtle text-zinc-400';
                  pillText = `${missing} Missing`;
                  iconClass = 'w-4 h-4 mr-1 text-zinc-500';
                } else if (expiring > 0) {
                  pillBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                  pillText = `${expiring} Expiring`;
                  iconClass = 'w-4 h-4 mr-1 text-amber-400';
                }

                return {
                  expired,
                  expiring,
                  missing,
                  valid,
                  totalUploaded,
                  pillBg,
                  pillText,
                  iconClass
                };
              };

              if (loadingCompliance) {
                return (
                  <div className="flex flex-col items-center justify-center p-12 text-center py-20">
                    <span className="w-8 h-8 border-4 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin mb-4" />
                    <p className="text-[#8B949E] text-sm">Loading staff compliance matrix...</p>
                  </div>
                );
              }

              if (filteredCompliance.length === 0) {
                return (
                  <div className="p-8 text-center text-zinc-500 py-20">No active staff members found.</div>
                );
              }

              return (
                <div className="divide-y divide-border-subtle">
                  {filteredCompliance.map(staff => {
                    const stats = getStaffComplianceSummary(staff.compliance || {});
                    const isExpanded = expandedStaffId === staff.id;

                    return (
                      <div key={staff.id} className="transition-all hover:bg-brand-bg/10">
                        {/* Staff Header Row */}
                        <div 
                          onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer select-none gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#E6EDF3] font-medium text-15px flex items-center gap-2">
                              <span>{staff.first_name} {staff.last_name}</span>
                              <span className="text-xs text-[#8B949E] font-normal">({staff.email})</span>
                            </h4>
                            <p className="text-xs text-[#8B949E] mt-1 flex items-center gap-4">
                              <span>Compliance Stats: <strong className="text-[#E6EDF3] font-medium">{stats.totalUploaded} of 13</strong> items uploaded</span>
                              <span>•</span>
                              <span>Missing: <strong className="text-[#E6EDF3] font-medium">{stats.missing}</strong> items</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs px-3 py-1 font-semibold border ${stats.pillBg}`}>
                              {stats.pillText}
                            </span>

                            <span className="p-1 px-2.5 bg-brand-bg hover:bg-brand-bg/80 border border-border-subtle rounded text-xs text-[#E6EDF3] font-medium inline-flex items-center transition-colors">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              {isExpanded ? 'Hide Details' : 'View Details'}
                              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Compliance Grid Details (Strictly Read-Only with Download Option) */}
                        {isExpanded && (
                          <div className="p-6 bg-[#0E0E10] border-t border-border-subtle shadow-inner">
                            <div className="mb-6">
                              <h5 className="text-[11px] font-semibold uppercase tracking-wider text-[#8B949E] mb-1">Mandatory Documents Compliance Map</h5>
                              <p className="text-xs text-[#8B949E]">
                                Overview of flat matrix compliance documents for {staff.first_name} {staff.last_name}. Reminders are systematically emailed to them when nearing expiry.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(ONBOARDING_STEP_LABELS).map(([key, label]) => {
                                const item = (staff.compliance || {})[key] || { status: 'MISSING', expiry: null, issued: null, fileName: null, fileId: null };
                                
                                let boxStyle = 'bg-brand-navy border-border-subtle';
                                let textStyle = 'text-zinc-500';
                                let dotColor = 'bg-zinc-650';
                                let statusLabel = 'Not Provided';

                                if (item.status === 'VALID') {
                                  boxStyle = 'bg-brand-green/5 border-brand-green/20';
                                  textStyle = 'text-brand-green';
                                  dotColor = 'bg-brand-green';
                                  statusLabel = 'Up to Date';
                                } else if (item.status === 'EXPIRING_SOON') {
                                  boxStyle = 'bg-amber-500/5 border-amber-500/20';
                                  textStyle = 'text-[#D29922]';
                                  dotColor = 'bg-[#D29922]';
                                  statusLabel = 'Expiring Soon';
                                } else if (item.status === 'EXPIRED') {
                                  boxStyle = 'bg-red-500/5 border-red-500/20';
                                  textStyle = 'text-[#F85149]';
                                  dotColor = 'bg-[#F85149]';
                                  statusLabel = 'Expired';
                                }

                                return (
                                  <div key={key} className={`p-4 rounded-lg border flex flex-col justify-between h-full min-h-[140px] shadow-sm ${boxStyle}`}>
                                    <div>
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-xs font-semibold text-[#E6EDF3] leading-tight">{label}</span>
                                        <span className={`flex items-center gap-1.5 text-[10px] font-semibold leading-none uppercase ${textStyle}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                          {statusLabel}
                                        </span>
                                      </div>

                                      {item.fileName ? (
                                        <div className="flex items-center gap-1.5 bg-black/30 p-2 rounded border border-white/[0.03] mt-2 mb-2">
                                          <FileText className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                                          <span className="text-xs text-[#8B949E] truncate flex-1" title={item.fileName}>
                                            {item.fileName}
                                          </span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-[#8B949E]/70 mb-2 mt-2 italic">
                                          No document uploaded
                                        </p>
                                      )}
                                    </div>

                                    <div className="mt-auto border-t border-white/[0.04] pt-2.5 flex items-center justify-between gap-2">
                                      <div className="text-[11px] text-[#8B949E]">
                                        {item.expiry ? (
                                          <span className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-[#8B949E]" />
                                            Expires: {format(new Date(item.expiry), 'dd/MM/yyyy')}
                                          </span>
                                        ) : item.issued ? (
                                          <span className="text-[#8B949E]/70">No Expiry Date</span>
                                        ) : (
                                          <span className="text-[#8B949E]/40">—</span>
                                        )}
                                      </div>

                                      {item.fileId && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadFile(item.fileId, item.fileName);
                                          }}
                                          title="Download uploaded file"
                                          className="text-xs text-[#E6EDF3] hover:text-brand-teal font-medium flex items-center gap-1 bg-brand-bg hover:bg-brand-bg/80 border border-border-subtle rounded px-2.5 py-1.5 transition-colors"
                                        >
                                          <Download className="w-3 h-3" />
                                          Download
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* System Audit Logs Visualizer */}
      <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-x-auto mt-8">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-brand-bg">
           <h3 className="text-sm font-semibold tracking-wide text-[#E6EDF3] flex items-center uppercase">
             <Search className="w-4 h-4 mr-2" /> Immutable System Logs (Read-Only)
           </h3>
           <span className="text-xs text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-sm font-medium border border-brand-teal/20">Tamper-Proof</span>
        </div>
        <div className="p-5">
           <p className="text-sm text-[#8B949E] mb-4">
             This table securely records any manual administrative edits made to a shift after completion. It cannot be altered via the UI.
           </p>
           <div className="bg-brand-navy rounded-lg border border-border-subtle overflow-x-auto min-h-[150px]">
             {auditLogs.length > 0 ? (
               <table className="w-full text-left text-sm text-zinc-300">
                 <thead className="text-xs text-[#8B949E] uppercase tracking-wider bg-brand-bg border-b border-border-subtle">
                   <tr>
                     <th className="px-4 py-3 font-semibold">Timestamp</th>
                     <th className="px-4 py-3 font-semibold">Entity</th>
                     <th className="px-4 py-3 font-semibold">Changed By</th>
                     <th className="px-4 py-3 font-semibold">Delta</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border-subtle">
                   {auditLogs.map((log) => {
                     const oldV = JSON.parse(log.old_value || '{}');
                     const newV = JSON.parse(log.new_value || '{}');
                     const changedKeys = Object.keys(newV).filter(k => newV[k] !== oldV[k] && k !== 'actual_finish_time' && k !== 'notes');
                     return (
                       <tr key={log.id} className="hover:bg-brand-bg/50 transition-colors">
                         <td className="px-4 py-3 whitespace-nowrap text-[#E6EDF3]">{new Date(log.timestamp).toLocaleString()}</td>
                         <td className="px-4 py-3 capitalize text-[#E6EDF3]">{log.entity_type} #{log.entity_id}</td>
                         <td className="px-4 py-3 text-[#E6EDF3]">{log.first_name} {log.last_name}</td>
                         <td className="px-4 py-3 text-xs max-w-4xl text-[#E6EDF3] truncate" title={changedKeys.map(k => `${k}: ${oldV[k]} -> ${newV[k]}`).join(', ')}>
                           {changedKeys.length > 0 
                             ? changedKeys.map(k => `${k}: ${oldV[k]} -> ${newV[k]}`).join(', ')
                             : 'No significant changes'}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             ) : (
               <div className="flex items-center justify-center p-8">
                 <p className="text-[#8B949E] text-sm">No manual modifications found for completed records.</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
