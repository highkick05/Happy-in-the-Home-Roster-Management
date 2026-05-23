import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Phone, Mail, FileText, Calendar, Building, Home, CheckCircle2, Edit2, ClipboardEdit } from 'lucide-react';
import ClientModal from './ClientModal';
import ClientRosterModal from './ClientRosterModal';

export default function ClientDashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [client, setClient] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, providersRes, servicesRes, notesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/progress-notes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClient(clientData);
      }
      if (providersRes.ok) setProviders(await providersRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (notesRes.ok) {
        const _notes = await notesRes.json();
        // The endpoint returns ordered by start_time ASC. So getting the last 3 means the 3 most recent in time.
        // We'll reverse it so the absolute most recent is first.
        setRecentNotes(_notes.slice(-3).reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSaved = () => {
    setIsEditModalOpen(false);
    fetchData();
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E]">Loading client details...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">Client not found.</p>
        <button onClick={() => navigate('/clients')} className="text-brand-teal hover:underline">Return to Directory</button>
      </div>
    );
  }

  const provider = providers.find(p => p.id === client.provider_id);
  const clientServices = services.filter(s => (client.service_ids || []).includes(s.id));
  const initials = `${(client.first_name || '').charAt(0)}${(client.last_name || '').charAt(0)}`.toUpperCase();

  return (
    <div className="w-full flex flex-col h-full space-y-6">
      <div className="flex items-center space-x-4 mb-2 shrink-0">
        <button 
          onClick={() => navigate('/clients')}
          className="p-2 -ml-2 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight flex items-center">
            {client.first_name} {client.last_name}
            {client.status === 'SUSPENDED' && (
              <span className="ml-3 px-2 py-0.5 rounded text-xs font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                Suspended
              </span>
            )}
          </h2>
          <div className="text-[#8B949E] text-sm mt-1">
            Joined {new Date(client.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Side Menu Shortcuts */}
        <div className="w-full md:w-20 shrink-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-visible">
           <button 
             type="button"
             onClick={() => setIsEditModalOpen(true)}
             className="w-16 h-16 shrink-0 rounded-xl bg-brand-navy border border-border-subtle hover:bg-brand-bg/50 hover:border-brand-teal transition-colors flex flex-col items-center justify-center text-[#8B949E] hover:text-brand-teal group shadow-sm"
             title="Edit Profile"
           >
             <Edit2 className="w-5 h-5 mb-1.5" />
             <span className="text-[10px] font-medium leading-none text-center px-1">Edit</span>
           </button>
           
           <button 
             type="button"
             onClick={() => setIsRosterModalOpen(true)}
             className="w-16 h-16 shrink-0 rounded-xl bg-brand-navy border border-border-subtle hover:bg-brand-bg/50 hover:border-brand-blue transition-colors flex flex-col items-center justify-center text-[#8B949E] hover:text-brand-blue group shadow-sm"
             title="Roster Builder"
           >
             <Calendar className="w-5 h-5 mb-1.5" />
             <span className="text-[10px] font-medium leading-none text-center px-1">Roster Builder</span>
           </button>

           <button 
             type="button"
             onClick={() => navigate('/progress-notes?client=' + client.id)}
             className="w-16 h-16 shrink-0 rounded-xl bg-brand-navy border border-border-subtle hover:bg-brand-bg/50 hover:border-purple-400 transition-colors flex flex-col items-center justify-center text-[#8B949E] hover:text-purple-400 group shadow-sm"
             title="Progress Notes"
           >
             <ClipboardEdit className="w-5 h-5 mb-1.5" />
             <span className="text-[10px] font-medium leading-none text-center px-1">Notes</span>
           </button>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-6">
          
          {/* Left Col - Overview */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-2xl font-semibold shrink-0">
                  {initials || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#E6EDF3]">{client.first_name} {client.last_name}</h3>
                  <div className="text-sm font-mono text-brand-teal mt-1">
                    {client.funding_type === 'HOME_CARE' ? `ID: ${client.my_aged_care_id || 'N/A'}` : `NDIS: ${client.ndis_number || 'N/A'}`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 text-sm">
                  <Mail className="w-4 h-4 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3] break-all">{client.contact_email || 'No email provided'}</span>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <Phone className="w-4 h-4 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3]">{client.contact_phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <Home className="w-4 h-4 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3] leading-relaxed">{client.address || 'No address provided'}</span>
                </div>
                {client.dob && (
                  <div className="flex items-start space-x-3 text-sm">
                    <Calendar className="w-4 h-4 text-[#8B949E] shrink-0 mt-0.5" />
                    <span className="text-[#E6EDF3]">DOB: {new Date(client.dob).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {(client.representative_name || client.representative_phone || client.representative_email) && (
              <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider mb-4">Representative</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Name</span>
                    <span className="text-[#E6EDF3] font-medium text-right">{client.representative_name || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Phone</span>
                    <span className="text-[#E6EDF3] text-right">{client.representative_phone || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Email</span>
                    <span className="text-[#E6EDF3] text-right">{client.representative_email || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle/Right Col - Details & Services */}
          <div className="xl:col-span-2 space-y-6">
            
            <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm">
               <div className="flex items-center space-x-2 text-brand-blue mb-4">
                 <FileText className="w-5 h-5" />
                 <h3 className="text-base font-semibold text-[#E6EDF3]">Care Plan & Details</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-border-subtle">
                 <div>
                   <div className="text-xs text-[#8B949E] mb-1">Funding Type</div>
                   <div className="text-sm font-medium text-[#E6EDF3]">
                     {client.funding_type === 'HOME_CARE' ? 'Home Care Package' : 'NDIS'}
                   </div>
                 </div>
                 <div>
                   <div className="text-xs text-[#8B949E] mb-1">Provider</div>
                   <div className="text-sm font-medium text-[#E6EDF3] flex items-center">
                     <Building className="w-3.5 h-3.5 mr-2 text-[#8B949E]" />
                     {provider ? provider.company_name : 'No Provider Assigned'}
                   </div>
                 </div>
               </div>
               
               <div>
                 <div className="text-xs text-[#8B949E] mb-2">Care Plan Notes</div>
                 {client.care_plan_details ? (
                   <div className="text-sm text-[#E6EDF3] whitespace-pre-wrap leading-relaxed bg-brand-bg/50 p-4 rounded-md border border-border-subtle">
                     {client.care_plan_details}
                   </div>
                 ) : (
                   <div className="text-sm text-[#8B949E] italic">No care plan details have been added for this client.</div>
                 )}
               </div>
            </div>

            <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-base font-semibold text-[#E6EDF3]">Assigned Services</h3>
                 <span className="bg-brand-green/10 text-brand-green px-2.5 py-1 rounded-full text-xs font-semibold">
                   {clientServices.length} Services
                 </span>
               </div>
               
               {clientServices.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {clientServices.map(s => (
                     <div key={s.id} className="flex items-start p-3 bg-brand-bg/30 border border-border-subtle rounded-lg">
                       <CheckCircle2 className="w-4 h-4 text-brand-teal mt-0.5 mr-3 shrink-0" />
                       <div>
                         <div className="text-sm font-medium text-[#E6EDF3]">{s.name}</div>
                         {s.code && <div className="text-xs text-[#8B949E] mt-0.5 font-mono">{s.code}</div>}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-6 border border-dashed border-border-subtle rounded-lg text-[#8B949E] text-sm flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-brand-bg/50 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-5 h-5 opacity-40" />
                    </div>
                    No services have been configured for this client yet.
                 </div>
               )}
            </div>

            <div className="bg-brand-navy border border-border-subtle rounded-xl p-6 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-2 text-purple-400">
                   <ClipboardEdit className="w-5 h-5" />
                   <h3 className="text-base font-semibold text-[#E6EDF3]">Recent Progress Notes</h3>
                 </div>
                 <button 
                   onClick={() => navigate('/progress-notes?client=' + client.id)}
                   className="text-xs text-brand-teal hover:underline font-medium"
                 >
                   View All Notes
                 </button>
               </div>

               {recentNotes.length > 0 ? (
                 <div className="space-y-3">
                   {recentNotes.map(note => (
                     <div key={note.id} className="p-4 bg-brand-bg/30 border border-border-subtle rounded-lg space-y-2">
                       <div className="flex justify-between items-start mb-1">
                         <div className="flex items-center space-x-2">
                           <Calendar className="w-4 h-4 text-[#8B949E]" />
                           <span className="text-xs font-medium text-[#E6EDF3]">
                             {new Date(note.start_time).toLocaleDateString()} {new Date(note.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                         </div>
                         <div className="text-[10px] uppercase text-[#8B949E] px-2 py-0.5 border border-border-subtle rounded bg-brand-bg/50">
                           {note.staff_first_name} {note.staff_last_name}
                         </div>
                       </div>
                       <div className="text-sm text-[#E6EDF3] leading-relaxed line-clamp-3">
                         {note.notes}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-6 border border-dashed border-border-subtle rounded-lg text-[#8B949E] text-sm flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-brand-bg/50 flex items-center justify-center mb-3">
                      <ClipboardEdit className="w-5 h-5 opacity-40" />
                    </div>
                    No recent progress notes found for this client.
                 </div>
               )}
            </div>

          </div>

        </div>
      </div>

      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        onSave={handleClientSaved}
        token={token!}
      />

      <ClientRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        client={client}
      />

    </div>
  );
}
