import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Printer, Calendar, User, Search, RefreshCw, FileText } from 'lucide-react';
import PrintableClinicalChart from './PrintableClinicalChart';

export default function ProgressNotesView() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const defaultEndDate = new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(searchParams.get('client') || '');
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<any>(null);

  useEffect(() => {
    fetchClients(selectedClientId);
  }, [token]);

  useEffect(() => {
    if (selectedClientId) {
      fetchNotes();
      fetchClientDetails(selectedClientId);
      setSearchParams(prev => { prev.set('client', selectedClientId); return prev; }, { replace: true });
    } else {
      setNotes([]);
      setSelectedClientData(null);
      setSearchParams(prev => { prev.delete('client'); return prev; }, { replace: true });
    }
  }, [selectedClientId, startDate, endDate, token]);

  const fetchClients = async (currentSelectedId: string) => {
    try {
      const res = await fetch('/api/progress-notes/clients', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => a.first_name.localeCompare(b.first_name));
        setClients(sorted);
        if (!currentSelectedId && sorted.length > 0) {
          setSelectedClientId(sorted[0].id.toString());
        } else if (currentSelectedId && !sorted.some((c: any) => c.id.toString() === currentSelectedId)) {
          setSelectedClientId(sorted.length > 0 ? sorted[0].id.toString() : '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotes = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      let url = `/api/progress-notes/${selectedClientId}?`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setNotes(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSelectedClientData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg print:bg-white print:h-auto overflow-hidden print:overflow-visible relative print:block">
      
      {/* --- WEB UI HEADER / FILTER BAR --- */}
      <div className="shrink-0 flex flex-col space-y-4 px-4 sm:px-8 py-6 bg-brand-navy border-b border-border-subtle print:hidden shadow-sm z-10 w-full relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight">Progress Notes</h1>
            <p className="text-sm text-[#8B949E] mt-1">Unified chronological timeline to review multi-staff shift progress notes.</p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex gap-3 w-full sm:w-auto">
            <button 
              onClick={handlePrint}
              disabled={!selectedClientId}
              className="px-4 py-2 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-md font-medium text-sm flex items-center hover:bg-brand-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Clinical Chart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Select Client <span className="text-red-400">*</span></label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-white/[0.08] text-white rounded-md text-sm focus:outline-none focus:border-brand-teal appearance-none transition-colors"
                title="Client Selector"
              >
                <option value="">-- Choose a client --</option>
                {clients.sort((a,b) => a.first_name.localeCompare(b.first_name)).map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
             <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Start Date</label>
             <div className="relative">
              <Calendar className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
               <input
                 type="date"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-white/[0.08] text-[#E6EDF3] rounded-md text-sm focus:outline-none focus:border-brand-teal transition-colors"
                 title="Start Date"
               />
             </div>
          </div>
          <div>
             <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">End Date</label>
             <div className="relative">
              <Calendar className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
               <input
                 type="date"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-[#09090b] border border-white/[0.08] text-[#E6EDF3] rounded-md text-sm focus:outline-none focus:border-brand-teal transition-colors"
                 title="End Date"
               />
             </div>
          </div>
        </div>
      </div>

      {/* --- WEB UI MAIN CONTENT AREA --- */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto w-full print:hidden">
        <div className="p-4 sm:p-8 w-full max-w-5xl mx-auto space-y-6">
          {!selectedClientId ? (
             <div className="w-full flex justify-center pb-12 overflow-x-auto print:hidden">
               <div className="w-full min-w-[700px] max-w-[900px] shadow-2xl overflow-hidden rounded-sm ring-1 ring-white/10 scale-95 origin-top relative group">
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 opacity-100">
                   <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6">
                     <FileText className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No Client Selected</h3>
                   <p className="text-white/80 max-w-md mx-auto text-sm leading-relaxed text-center">
                     Progress notes are individualized health records. Please select a client from the dropdown above to view their unified timeline.
                   </p>
                 </div>
                 <div className="pointer-events-none select-none">
                   <PrintableClinicalChart clientData={null} notes={[]} period={{start: startDate, end: endDate}} />
                 </div>
               </div>
             </div>
          ) : loading ? (
             <div className="flex justify-center p-12 w-full">
                <RefreshCw className="w-8 h-8 text-brand-teal animate-spin opacity-60" />
             </div>
          ) : notes.length === 0 ? (
             <div className="w-full flex justify-center pb-12 overflow-x-auto">
               <div className="w-full min-w-[700px] max-w-[900px] shadow-2xl overflow-hidden rounded-sm ring-1 ring-white/10 scale-95 origin-top relative group">
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                   <Search className="w-12 h-12 text-white mb-4" />
                   <h3 className="text-xl font-bold text-white mb-2">No progress notes match the current filters.</h3>
                   <p className="text-white/80 max-w-sm text-center">
                     Showing blank template. You can print this blank chart for physical records.
                   </p>
                 </div>
                 <PrintableClinicalChart notes={[]} clientData={selectedClientData} period={{start: startDate, end: endDate}} />
               </div>
             </div>
          ) : (
            <div className="space-y-6 relative ml-3 w-full max-w-4xl">
              <div className="absolute top-0 bottom-0 left-[21px] w-px bg-white/[0.05]" />
              
              {notes.map((note) => {
                 const startTime = new Date(note.start_time);
                 const dateStr = startTime.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                 const timeStr = startTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
                 const endTimeStr = note.end_time ? new Date(note.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : '-';
                 
                 return (
                    <div key={note.id} className="relative pl-12 pr-4 sm:pr-0">
                       <div className="absolute left-0 top-6 w-11 flex justify-center">
                         <div className="w-3 h-3 rounded-full bg-brand-teal border-[3px] border-brand-bg shadow-[0_0_0_4px_rgba(20,184,166,0.1)] shrink-0 z-10" />
                       </div>
                       
                       <div className="bg-[#09090b] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm group hover:border-brand-teal/40 transition-colors w-full">
                          <div className="px-5 py-4 border-b border-white/[0.05] bg-white/[0.01] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <Calendar className="w-4 h-4 text-brand-teal" />
                                 <span className="font-semibold text-[#E6EDF3] tracking-tight">{dateStr}</span>
                                 <span className="text-[#8B949E] text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded mx-1">{timeStr} - {endTimeStr}</span>
                               </div>
                               <div className="text-xs text-[#8B949E] flex items-center">
                                 <span className="text-[#8B949E]">Service Type:</span>
                                 <span className="text-brand-blue ml-1.5 bg-brand-blue/10 px-1.5 py-0.5 rounded mr-3">{note.service_name || 'General Support'} {note.service_type === 'HOME_CARE' ? '(HCP)' : '(NDIS)'}</span>
                               </div>
                            </div>
                            <div className="flex items-center text-sm">
                               <div className="w-7 h-7 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple flex items-center justify-center text-[10px] font-semibold shrink-0 mr-2">
                                 {`${(note.staff_first_name || '').charAt(0)}${(note.staff_last_name || '').charAt(0)}`}
                               </div>
                               <span className="text-[#E6EDF3] font-medium">{note.staff_first_name} {note.staff_last_name}</span>
                               <span className="text-[#8B949E] text-xs ml-1.5">({note.staff_role === 'ADMIN' ? 'Admin' : 'Support Worker'})</span>
                            </div>
                          </div>
                          <div className="px-5 py-6">
                            <div className="text-sm text-[#E6EDF3] whitespace-pre-wrap leading-relaxed">
                               {note.notes}
                            </div>
                          </div>
                       </div>
                    </div>
                 );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- PRINTABLE CLINICAL CHART (Hidden in Web UI, visible in Print) --- */}
      <div className="hidden print:block bg-white w-full text-black print:overflow-visible">
        <PrintableClinicalChart 
           notes={notes} 
           clientData={selectedClientData} 
           period={{start: startDate, end: endDate}} 
        />
      </div>

    </div>
  );
}
