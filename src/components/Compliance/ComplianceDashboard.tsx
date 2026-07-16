import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Download, Users, Briefcase, FileCheck, Search, FileText, ClipboardList,
  AlertTriangle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import CustomDatePicker from '../ui/CustomDatePicker';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import OnboardingView from '../Onboarding/OnboardingView';


const extractAddress = (desc: string) => {
    if (!desc) return null;
    const matches = [...desc.matchAll(/\(([^)]+)\)/g)];
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i][1];
        if (!m.includes('%') && !m.match(/^[-+]?\d*\.?\d+,\s*[-+]?\d*\.?\d+$/)) {
            return m;
        }
    }
    // if no address in parenthesis, just return the raw string but remove coordinates
    let cleaned = desc.replace(/\([^)]+\)/g, '').trim();
    return cleaned || desc.trim();
};

const formatRouteLog = (logStr: string | null): string | null => {
  if (!logStr) return null;
  if (logStr === 'No route logged') return 'No route logged';
  if (!logStr.startsWith('{')) return logStr;
  try {
    const parsed = JSON.parse(logStr);
    let out = [];

    // HOME CARE
    if (parsed.homeCareTravel && parsed.homeCareTravel.legs) {
      const hcLegs = parsed.homeCareTravel.legs.map((l: any) => {
         if (l.description && l.description.includes('Private Commute')) {
            return 'Private Commute';
         }
         let start = l.addressStart;
         let end = l.addressEnd;
         if (!start || !end) {
            const parts = l.description ? l.description.split(' to ') : [];
            if (parts.length === 2) {
               start = start || extractAddress(parts[0]);
               end = end || extractAddress(parts[1]);
            }
         }
         return `${start || 'Unknown'} ➡️ ${end || 'Unknown'}`;
      }).join(' | ');
      if (hcLegs) out.push(hcLegs);
    }

    // PROVIDER TRAVEL (NDIS)
    if (parsed.providerTravel && parsed.providerTravel.legs) {
      const pLegs = parsed.providerTravel.legs.map((l: any) => {
         if (l.distance === 0 && l.description && l.description.includes('Capped')) return 'MMM6 Capped';
         let start = l.addressStart;
         let end = l.addressEnd;
         
         if (!start || !end) {
            const parts = l.description ? l.description.split(' to ') : [];
            if (parts.length === 2) {
               start = start || extractAddress(parts[0]);
               end = end || extractAddress(parts[1]);
            } else {
               const arrowParts = l.description ? l.description.split(' → ') : [];
               if (arrowParts.length === 2) {
                  start = start || extractAddress(arrowParts[0]);
                  end = end || extractAddress(arrowParts[1]);
               }
            }
         }
         return `${start || 'Unknown'} ➡️ ${end || 'Unknown'}`;
      }).join(' | ');
      if (pLegs) out.push(`PT: ${pLegs}`);
    }

    // ABT
    if (parsed.abt && parsed.abt.legs) {
      const aLegs = parsed.abt.legs.map((l: any) => {
         let start = l.addressStart;
         let end = l.addressEnd;
         
         if (!start || !end) {
            const arrowParts = l.description ? l.description.split(' → ') : [];
            if (arrowParts.length === 2) {
               start = start || extractAddress(arrowParts[0]);
               end = end || extractAddress(arrowParts[1]);
            } else {
               const parts = l.description ? l.description.split(' to ') : [];
               if (parts.length === 2) {
                  start = start || extractAddress(parts[0]);
                  end = end || extractAddress(parts[1]);
               }
            }
         }
         return `${start || 'Unknown'} ➡️ ${end || 'Unknown'}`;
      }).join(' | ');
      if (aLegs) out.push(`ABT: ${aLegs}`);
    }
    
    return out.join(' ; ') || logStr;
  } catch (e) {
    return logStr;
  }
};

const ONBOARDING_STEP_LABELS: Record<string, string> = {
  tfn_super: 'Tax File Number & Super',
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
  covid_vaccine: 'COVID Immunisation',
  police_check: 'National Police Check'
};

export default function ComplianceDashboard() {
  const { token, user, settings } = useAuth();

  const getLocalizedDateString = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'N/A';
      
      const tz = settings?.timezone || 'Australia/Perth';
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(d);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      return `${day}-${month}-${year}`;
    } catch (e) {
      const fb = isoString.split('T')[0] || 'N/A'; return fb.includes('-') ? fb.split('-').reverse().join('-') : fb;
    }
  };

  const getLocalizedTimeString = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'N/A';
      const tz = settings?.timezone || 'Australia/Perth';
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      });
      const parts = formatter.formatToParts(d);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      return `${hour}:${minute}`;
    } catch (e) {
      return isoString.split('T')[1]?.substring(0, 5) || 'N/A';
    }
  };

  const [activeTab, setActiveTab] = useLocalStorage<'evidence' | 'staff' | 'mandatory_documents' | 'system_logs'>('compliance_active_tab', 'evidence');
  
  // States for Evidence Pack (Clients)
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useLocalStorage('compliance_selected_client', '');
  const [clientStartDate, setClientStartDate] = useLocalStorage('compliance_client_start', '');
  const [clientEndDate, setClientEndDate] = useLocalStorage('compliance_client_end', '');
  
  const [evidenceMatrix, setEvidenceMatrix] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [isGeneratingEvidence, setIsGeneratingEvidence] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // States for Staff Logbook
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useLocalStorage('compliance_selected_staff', '');
  const [staffStartDate, setStaffStartDate] = useLocalStorage('compliance_staff_start', '');
  const [staffEndDate, setStaffEndDate] = useLocalStorage('compliance_staff_end', '');
  const [staffMatrix, setStaffMatrix] = useState<any[]>([]);
  const [loadingStaffMatrix, setLoadingStaffMatrix] = useState(false);
  const [staffExportError, setStaffExportError] = useState<string | null>(null);
  const [isGeneratingLogbook, setIsGeneratingLogbook] = useState(false);

  // States for Mandatory Documents
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [complianceSearch, setComplianceSearch] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState<number | null>(null);
  const [manageStaffId, setManageStaffId] = useState<number | null>(null);

  // States for Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Pagination states
  const [evidencePage, setEvidencePage] = useState(1);
  const [evidencePageSize, setEvidencePageSize] = useState(50);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(50);
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(50);


  useEffect(() => {
    fetchClients();
    fetchStaff();
    fetchLogs();
  }, [token]);

  useEffect(() => {
    if (clients.length > 0 && selectedClient) {
      if (!clients.some(c => c.id.toString() === selectedClient)) {
        setSelectedClient('');
      }
    }
  }, [clients, selectedClient, setSelectedClient]);

  useEffect(() => {
    if (staffList.length > 0 && selectedStaff) {
      if (!staffList.some(s => s.id.toString() === selectedStaff)) {
        setSelectedStaff('');
      }
    }
  }, [staffList, selectedStaff, setSelectedStaff]);

  useEffect(() => {
    fetchMatrix();
  }, [token, selectedClient, clientStartDate, clientEndDate]);

  useEffect(() => {
    fetchStaffMatrix();
  }, [token, selectedStaff, staffStartDate, staffEndDate]);

  const fetchStaffMatrix = async () => {
    setLoadingStaffMatrix(true);
    try {
      const q = new URLSearchParams();
      if (selectedStaff) q.append('staffId', selectedStaff);
      if (staffStartDate) q.append('startDate', staffStartDate);
      if (staffEndDate) q.append('endDate', staffEndDate);
      const res = await fetch(`/api/compliance/evidence/matrix?${q.toString()}`, { // We can reuse the same endpoint if we add staffId filtering!
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStaffMatrix(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStaffMatrix(false);
    }
  };

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
      
      let filename = 'Compliance_Evidence_Ledger';
      if (selectedClient || clientStartDate || clientEndDate) {
        let namePart = 'Global';
        if (selectedClient) {
          const c = clients.find((client) => client.id === selectedClient);
          if (c) namePart = `${c.first_name || c.firstName}_${c.last_name || c.lastName}`.replace(/\s+/g, '');
        }
        const datePart = [clientStartDate, clientEndDate].filter(Boolean).join('_to_');
        filename = `${filename}_${namePart}${datePart ? `_${datePart}` : ''}`;
      }
      
      a.download = `${filename}.xlsx`;
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

  const downloadStaffLedger = async () => {
    setIsGeneratingLogbook(true);
    setStaffExportError(null);
    try {
      const q = new URLSearchParams();
      if (selectedStaff) q.append('staffId', selectedStaff);
      if (staffStartDate) q.append('startDate', staffStartDate);
      if (staffEndDate) q.append('endDate', staffEndDate);
      const res = await fetch(`/api/compliance/export/evidence?${q.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate staff evidence ledger. Make sure there is data matching your criteria.');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename = 'Staff_Evidence_Ledger';
      if (selectedStaff || staffStartDate || staffEndDate) {
        let namePart = 'Global';
        if (selectedStaff) {
          const s = staffList.find((staff) => staff.id === selectedStaff);
          if (s) namePart = `${s.first_name || s.firstName}_${s.last_name || s.lastName}`.replace(/\s+/g, '');
        }
        const datePart = [staffStartDate, staffEndDate].filter(Boolean).join('_to_');
        filename = `${filename}_${namePart}${datePart ? `_${datePart}` : ''}`;
      }
      
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error: any) {
      setStaffExportError(error?.message || "An unknown error occurred while exporting.");
      setTimeout(() => setStaffExportError(null), 5000);
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
        <button
          onClick={() => setActiveTab('system_logs')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors flex items-center ml-auto ${activeTab === 'system_logs' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          <Search className="w-4 h-4 mr-2" /> Immutable System Logs
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
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Category & Time</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Travel Route</th>
                       <th className="px-4 py-3 whitespace-nowrap">Claimable Travel</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle text-[#E6EDF3]">
                     {evidenceMatrix.length === 0 ? (
                       <tr>
                         <td colSpan={8} className="px-4 py-8 text-center text-[#8B949E]">No evidence records available.</td>
                       </tr>
                     ) : (
                       evidenceMatrix.map((row, idx) => {
                         const startString = row.actual_start_time ? getLocalizedTimeString(row.actual_start_time) : (row.start_time ? getLocalizedTimeString(row.start_time) : 'N/A');
                         const endString = row.actual_finish_time ? getLocalizedTimeString(row.actual_finish_time) : (row.end_time ? getLocalizedTimeString(row.end_time) : 'N/A');
                         
                         let hrs = 0;
                         let qtyOverride = null;
                         try {
                           if (row.services_json) {
                             const srvList = JSON.parse(row.services_json);
                             if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== '') {
                               qtyOverride = parseFloat(srvList[0].qtyOverride);
                             }
                           }
                         } catch (e) {}
                         if (qtyOverride !== null && !isNaN(qtyOverride)) {
                           hrs = qtyOverride;
                         } else {
                           if (row.actual_start_time && row.actual_finish_time) {
                             const aHrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;
                             if (aHrs > 0) {
                               hrs = aHrs;
                             } else {
                               hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                             }
                           } else if (row.start_time && row.end_time) {
                             hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                           }
                         }

                         const isHC = (row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP');
                         const pt_km = row.provider_travel_km || 0;
                         const pt_cost = (pt_km * 1.00).toFixed(2);
                         const abt_km = row.abt_km || 0;
                         const abt_cost = (abt_km * 1.00).toFixed(2);
                         const hasPT = pt_km > 0;
                         const hasABT = abt_km > 0;
                         const isBoth = hasPT && hasABT;

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
                         
                         let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             travelCategoryCell = <span className="text-[#E6EDF3] text-xs font-medium">Inter-Shift Travel ({row.travel_minutes || 0} mins)</span>;
                         } else if (isBoth) {
                             travelCategoryCell = (
                                 <div className="flex flex-col gap-1 w-max">
                                     <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-blue-900/10 border-blue-900/20 text-blue-400 w-fit">Provider Travel</span>
                                     <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-teal/10 border-brand-teal/20 text-brand-teal w-fit">Activity Based Transport</span>
                                 </div>
                             );
                         } else if (hasPT) {
                             travelCategoryCell = <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-blue-900/10 border-blue-900/20 text-blue-400">Provider Travel</span>;
                         } else if (hasABT) {
                             travelCategoryCell = <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-teal/10 border-brand-teal/20 text-brand-teal">Activity Based Transport</span>;
                         }
                         
                         let travelRouteCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             const hcRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log) : `${row.origin_address || 'Unknown'} ➡️ ${row.destination_address || 'Unknown'}`;
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={hcRoute || 'No route logged'}>{hcRoute || 'No route logged'}</div>;
                         } else if (isBoth) {
                             const fullRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log) : `${row.origin_address || 'Unknown'} ➡️ ${row.destination_address || 'Unknown'}`;
                             const routes = (fullRoute || 'No route logged').split(' ; ');
                             travelRouteCell = (
                                 <div className="flex flex-col gap-1 text-xs text-[#E6EDF3] max-w-[200px]">
                                     {routes.map((r, i) => <div key={i} className="truncate" title={r}>{r}</div>)}
                                 </div>
                             );
                         } else if (hasPT) {
                             const ptRoute = row.transport_route_log ? formatRouteLog(row.transport_route_log) : `${row.origin_address || 'Unknown'} ➡️ ${row.destination_address || 'Unknown'}`;
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={ptRoute || 'No route logged'}>{ptRoute || 'No route logged'}</div>;
                         } else if (hasABT) {
                             const abtRoute = formatRouteLog(row.transport_route_log);
                             travelRouteCell = <div className="text-xs text-[#E6EDF3] max-w-[200px] truncate" title={abtRoute || 'No route logged'}>{abtRoute || 'No route logged'}</div>;
                         }
                         
                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
                         if (isHC) {
                             const decHrs = (row.travel_minutes || 0) / 60;
                             claimableTravelCell = <span className="font-mono text-xs text-emerald-400 tracking-tight">{decHrs.toFixed(2)} hrs</span>;
                         } else if (isBoth) {
                             claimableTravelCell = (
                                 <div className="flex flex-col gap-1 font-mono text-xs tracking-tight">
                                     <span className="text-[#E6EDF3]">PT: {pt_km} km (${pt_cost})</span>
                                     <span className="text-[#E6EDF3]">ABT: {abt_km} km (${abt_cost})</span>
                                     <span className="font-bold text-emerald-400 mt-1">Total: ${(parseFloat(pt_cost) + parseFloat(abt_cost)).toFixed(2)}</span>
                                 </div>
                             );
                         } else if (hasPT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">PT: {pt_km} km <span className="text-emerald-400">(${pt_cost})</span></span>;
                         } else if (hasABT) {
                             claimableTravelCell = <span className="font-mono text-xs text-[#E6EDF3]">ABT: {abt_km} km <span className="text-emerald-400">(${abt_cost})</span></span>;
                         }

                         return (
                           <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
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
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelCategoryCell}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{travelRouteCell}</td>
                             <td className="px-4 py-2 whitespace-nowrap">{claimableTravelCell}</td>
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
         <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-visible flex flex-col items-stretch">
           <div className="p-4 md:p-6 border-b border-border-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative">
             <div>
               <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-1"><FileText className="w-5 h-5 mr-2 text-brand-green" /> Staff Logbook (Workforce Compliance)</h3>
               <p className="text-sm text-[#8B949E] max-w-3xl">
                 Produces an Hours Worked Report and a Vehicle Usage Statement showing precise times, shift statuses, and claimed distance cross-referenced against the immutable audit trail.
               </p>
               {staffExportError && (
                 <div className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-md font-medium">
                   {staffExportError}
                 </div>
               )}
             </div>
             
             <button
               onClick={downloadStaffLedger}
               disabled={isGeneratingLogbook || loadingStaffMatrix}
               className="shrink-0 flex items-center px-4 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded-md font-medium text-sm shadow-sm transition-all"
             >
               {isGeneratingLogbook ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> 
               ) : (
                  <Download className="w-4 h-4 mr-2" /> 
               )}
               {isGeneratingLogbook ? 'Exporting...' : 'Download Staff Logbook (Excel)'}
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50">
              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-sm font-medium text-[#8B949E]">Select Staff</label>
                 <select 
                   value={selectedStaff} 
                   onChange={e => setSelectedStaff(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal transition-colors"
                 >
                   <option value="">All Staff (Global Ledger)</option>
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

           <div className="overflow-x-auto">
             {loadingStaffMatrix ? (
                 <div className="flex flex-col items-center justify-center p-12 text-center py-20">
                   <span className="w-8 h-8 border-4 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin mb-4" />
                   <p className="text-[#8B949E] text-sm">Loading logbook...</p>
                 </div>
             ) : (
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="text-xs text-[#E6EDF3] uppercase tracking-wider bg-zinc-800 border-b border-border-subtle font-bold">
                     <tr>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Staff Name</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Service Date</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Shift Timestamps</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Client</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Logged Hrs</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Progress Note Status</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Transport KM</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">Start Odometer</th>
                       <th className="px-4 py-3 whitespace-nowrap border-r border-border-subtle/50">End Odometer</th>
                       <th className="px-4 py-3 whitespace-nowrap">Travel Cost</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle text-[#E6EDF3]">
                     {staffMatrix.length === 0 ? (
                       <tr>
                         <td colSpan={10} className="px-4 py-8 text-center text-[#8B949E]">No staff records available.</td>
                       </tr>
                     ) : (
                       staffMatrix.map((row, idx) => {
                         const startString = row.actual_start_time ? getLocalizedTimeString(row.actual_start_time) : (row.start_time ? getLocalizedTimeString(row.start_time) : 'N/A');
                         const endString = row.actual_finish_time ? getLocalizedTimeString(row.actual_finish_time) : (row.end_time ? getLocalizedTimeString(row.end_time) : 'N/A');
                         
                         let hrs = 0;
                         let qtyOverride = null;
                         try {
                           if (row.services_json) {
                             const srvList = JSON.parse(row.services_json);
                             if (srvList.length > 0 && srvList[0].qtyOverride !== undefined && srvList[0].qtyOverride !== '') {
                               qtyOverride = parseFloat(srvList[0].qtyOverride);
                             }
                           }
                         } catch (e) {}

                         if (qtyOverride !== null && !isNaN(qtyOverride)) {
                           hrs = qtyOverride;
                         } else {
                           if (row.actual_start_time && row.actual_finish_time) {
                             const aHrs = (new Date(row.actual_finish_time).getTime() - new Date(row.actual_start_time).getTime()) / 3600000;
                             if (aHrs > 0) {
                               hrs = aHrs;
                             } else {
                               hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                             }
                           } else if (row.start_time && row.end_time) {
                             hrs = (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 3600000;
                           }
                         }

                         const isHC = (row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP');
                         const hc_km = isHC ? (row.home_care_travel_km || row.provider_travel_km || 0) : 0;
                         const p_km = isHC ? 0 : (row.provider_travel_km || 0);
                         const km = p_km + hc_km + (row.abt_km || 0);

                         let noteBadgeCls = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                         let noteStatusStr = 'Missing';

                         if (row.notes) {
                           noteBadgeCls = 'bg-brand-green/10 border-brand-green/20 text-brand-green';
                           noteStatusStr = 'Completed';
                         } else if (Math.abs(new Date().getTime() - new Date(row.end_time).getTime()) < 48 * 3600000) {
                             noteBadgeCls = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                             noteStatusStr = 'Pending Sync';
                         }
                         
                         return (
                           <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.staff_first} {row.staff_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap text-[#8B949E]">{row.start_time ? getLocalizedDateString(row.start_time) : 'N/A'}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{startString} - {endString}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">{row.client_first} {row.client_last}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{Math.max(0, hrs).toFixed(2)}h</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap">
                               <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border ${noteBadgeCls}`}>
                                  {noteStatusStr}
                               </span>
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">{km} km</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               {row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''} {row.odometer_start_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               {row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''} {row.odometer_end_photo ? '📸' : ''}
                             </td>
                             <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-emerald-400 tracking-tight">
                                {(row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP') 
                                  ? '-' 
                                  : "$" + ((p_km * 1.00) + ((row.abt_km || 0) * 1.00)).toFixed(2)}
                              </td>
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

      {activeTab === 'mandatory_documents' && (
        <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-hidden p-0">
          <div className="p-4 md:p-6 border-b border-border-subtle bg-[#121214]">
            <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-2"><ClipboardList className="w-5 h-5 mr-2 text-brand-teal" /> Global Mandatory Documents</h3>
            <p className="text-sm text-[#8B949E]">
              Summary list of all {Object.keys(ONBOARDING_STEP_LABELS).length} flat matrix mandatory compliance items for active personnel. Staff members receive automatic daily reminders for expiring credentials.
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

                return {
                  expired,
                  expiring,
                  missing,
                  valid,
                  totalUploaded
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
                              <span>Compliance Stats: <strong className="text-[#E6EDF3] font-medium">{stats.totalUploaded} of {Object.keys(ONBOARDING_STEP_LABELS).length}</strong> items uploaded</span>
                              <span>•</span>
                              <span>Missing: <strong className="text-[#E6EDF3] font-medium">{stats.missing}</strong> items</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            {stats.expired === 0 && stats.expiring === 0 && stats.missing === 0 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border bg-brand-green/10 border-brand-green/20 text-brand-green">
                                Fully Compliant
                              </span>
                            )}
                            {stats.expired > 0 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border bg-red-500/10 border-red-500/25 text-red-400">
                                {stats.expired} Expired
                              </span>
                            )}
                            {stats.expiring > 0 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border bg-amber-500/10 border-amber-500/20 text-amber-400">
                                {stats.expiring} Expiring Soon
                              </span>
                            )}
                            {stats.missing > 0 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border bg-zinc-500/10 border-border-subtle text-zinc-400">
                                {stats.missing} Missing
                              </span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setManageStaffId(staff.id);
                              }}
                              className="p-1 px-2.5 bg-brand-teal/10 hover:bg-brand-teal/20 border border-brand-teal/30 rounded text-xs text-brand-teal font-medium inline-flex items-center transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1" />
                              Manage Documents
                            </button>

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
      {activeTab === 'system_logs' && (
      <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-x-auto">
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
                              <div className="flex items-center justify-center p-8">                 <p className="text-[#8B949E] text-sm">No manual modifications found for completed records.</p>               </div>             )}           </div>
        <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-brand-bg/50">
            <div className="text-sm text-[#8B949E]">
                Showing {Math.min((logsPage - 1) * logsPageSize + (auditLogs.length > 0 ? 1 : 0), auditLogs.length)} to {Math.min(logsPage * logsPageSize, auditLogs.length)} of {auditLogs.length} entries
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#8B949E]">Rows per page:</span>
                    <select
                        value={logsPageSize}
                        onChange={(e) => {setLogsPageSize(Number(e.target.value)); setLogsPage(1);}}
                        className="bg-brand-navy border border-border-subtle rounded px-2 py-1 text-sm text-[#E6EDF3] outline-none"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                    </select>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                        disabled={logsPage === 1}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &lt;
                    </button>
                    <span className="text-sm text-[#E6EDF3] px-2">{logsPage} / {Math.ceil(auditLogs.length / logsPageSize) || 1}</span>
                    <button
                        onClick={() => setLogsPage(Math.min(Math.ceil(auditLogs.length / logsPageSize), logsPage + 1))}
                        disabled={logsPage >= Math.ceil(auditLogs.length / logsPageSize)}
                        className="p-1 rounded hover:bg-white/5 disabled:opacity-50 text-[#8B949E] hover:text-[#E6EDF3]"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </div>
        </div>      </div>      )}      {/* Manage Staff Documents Modal */}
      {manageStaffId && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-[#09090b] w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#0E0E10] shrink-0">
              <h2 className="text-xl font-semibold text-white">Manage Mandatory Documents</h2>
              <button
                onClick={() => {
                  setManageStaffId(null);
                  fetchComplianceData(); // Refresh data when closing
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
              <div className="bg-brand-teal/10 border border-brand-teal/20 text-brand-teal px-4 py-3 rounded-lg mb-6 text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>
                  You are viewing this staff member's Onboarding & Compliance portal as an Administrator. You can upload documents and override dates on their behalf.
                </p>
              </div>
              <OnboardingView targetUserId={manageStaffId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}