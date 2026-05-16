import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, Users, Briefcase, FileCheck, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import CustomDatePicker from '../ui/CustomDatePicker';

export default function ComplianceDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'evidence' | 'staff'>('evidence');
  
  // States for Evidence Pack (Clients)
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');
  const [isGeneratingEvidence, setIsGeneratingEvidence] = useState(false);

  // States for Staff Logbook
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffStartDate, setStaffStartDate] = useState('');
  const [staffEndDate, setStaffEndDate] = useState('');
  const [isGeneratingLogbook, setIsGeneratingLogbook] = useState(false);

  // States for Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchStaff();
    fetchLogs();
  }, [token]);

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
    if (!selectedClient || !clientStartDate || !clientEndDate) return;
    setIsGeneratingEvidence(true);
    try {
      const res = await fetch(`/api/compliance/evidence?clientId=${selectedClient}&startDate=${clientStartDate}&endDate=${clientEndDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate evidence pack');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const formatYMDtoDMY = (ymd: string) => ymd ? ymd.split('-').reverse().join('-') : '';
      a.download = `Evidence_Pack_Client_${selectedClient}_${formatYMDtoDMY(clientStartDate)}_to_${formatYMDtoDMY(clientEndDate)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert("Error generating evidence pack. " + error);
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
      </div>

      {activeTab === 'evidence' && (
        <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-sm overflow-visible p-4 md:p-6">
           <h3 className="text-lg font-medium text-[#E6EDF3] flex items-center mb-2"><FileCheck className="w-5 h-5 mr-2 text-brand-teal" /> Generate Client Evidence Pack</h3>
           <p className="text-sm text-[#8B949E] mb-6 max-w-4xl">
             Consolidates the Service Delivery Log, Progress Note Archive, and Transport Evidence into a single standard PDF file ready for NDIA or Home Care auditors.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                 <label className="text-sm font-medium text-[#8B949E]">Select Client</label>
                 <select 
                   value={selectedClient} 
                   onChange={e => setSelectedClient(e.target.value)}
                   className="w-full bg-brand-navy border border-border-subtle rounded-md p-2.5 text-sm text-[#E6EDF3] focus:ring-1 focus:ring-brand-teal transition-colors"
                 >
                   <option value="">-- Choose Client --</option>
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

           <button
             onClick={downloadEvidencePack}
             disabled={!selectedClient || !clientStartDate || !clientEndDate || isGeneratingEvidence}
             className="flex items-center px-5 py-2.5 bg-gradient-to-r from-brand-teal to-brand-green disabled:opacity-50 text-white rounded-md font-medium text-sm shadow-sm transition-all shadow-sm"
           >
             {isGeneratingEvidence ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> 
             ) : (
                <Download className="w-4 h-4 mr-2" /> 
             )}
             {isGeneratingEvidence ? 'Generating Pack...' : 'Download Evidence Pack (PDF)'}
           </button>
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
