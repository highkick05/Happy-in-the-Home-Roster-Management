import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Phone, Mail, FileText, Calendar, Building, Home, CheckCircle2, Edit2, ClipboardEdit, Calculator } from 'lucide-react';
import ClientModal from './ClientModal';
import ClientRosterModal from './ClientRosterModal';

export default function ClientDashboardView() {
  // Helper to extract text from EditorJS JSON
  const getNotePreview = (notesStr: string) => {
    try {
      if (notesStr.startsWith('{') && notesStr.includes('"blocks"')) {
        const data = JSON.parse(notesStr);
        if (data && data.blocks) {
          const texts = data.blocks
            .filter((b: any) => b.type === 'paragraph' || b.type === 'header' || b.type === 'list')
            .map((b: any) => {
              if (b.type === 'list') {
                 return b.data.items.map((i: string) => i.replace(/<[^>]*>?/gm, '')).join(' ');
              }
              return (b.data.text || '').replace(/<[^>]*>?/gm, '');
            });
          const combined = texts.join(' ').trim();
          if (combined.length > 0) return combined;
          
          if (data.blocks.some((b: any) => b.type === 'image')) {
            return '[Image Attached]';
          }
        }
      }
    } catch (e) {
      // Ignore
    }
    // Fallback if not JSON or parsing fails
    return notesStr;
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [client, setClient] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [fundingRates, setFundingRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, providersRes, servicesRes, notesRes, ratesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/progress-notes/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } })
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
      if (ratesRes.ok) {
        setFundingRates(await ratesRes.json());
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

  const getClientDailyRate = () => {
    if (!client || client.funding_type !== 'HOME_CARE') return null;
    
    const subType = client.home_care_sub_type || 'HCP';
    const levelOrClass = client.home_care_level_or_class || 'Level 1';
    
    if (subType === 'SAH') {
      const levels = fundingRates?.sahFundingLevels || [
        { level: 'Class 1', amountDaily: 29.40 },
        { level: 'Class 2', amountDaily: 43.93 },
        { level: 'Class 3', amountDaily: 60.18 },
        { level: 'Class 4', amountDaily: 81.36 },
        { level: 'Class 5', amountDaily: 108.76 },
        { level: 'Class 6', amountDaily: 131.82 },
        { level: 'Class 7', amountDaily: 159.31 },
        { level: 'Class 8', amountDaily: 213.99 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 29.40;
    } else {
      const levels = fundingRates?.hcpFundingLevels || [
        { level: 'Level 1', amountDaily: 30.10 },
        { level: 'Level 2', amountDaily: 52.93 },
        { level: 'Level 3', amountDaily: 115.22 },
        { level: 'Level 4', amountDaily: 174.68 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 30.10;
    }
  };

  const formatRate = (rate: number | null) => {
    if (rate === null) return '-';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(rate);
  };

  return (
    <div className="w-full flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 shrink-0">
        <div className="flex items-center space-x-4">
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
              Joined {new Date(client.joined_date || client.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Top Right Action Shortcuts */}
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={() => navigate(`/clients/${id}/documents`)}
            className="px-3 py-1.5 min-h-[36px] bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors duration-155 shadow-sm"
            title="Documents"
          >
            <FileText className="w-4 h-4 text-brand-teal" />
            <span>Documents</span>
          </button>
          
          <button 
            type="button"
            onClick={() => navigate(`/clients/${id}/budget`)}
            className="px-3 py-1.5 min-h-[36px] bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors duration-155 shadow-sm"
            title="Budget"
          >
            <Calculator className="w-4 h-4 text-brand-teal" />
            <span>Budget</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1.5 min-h-[36px] bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors duration-155 shadow-sm"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4 text-brand-teal" />
            <span>Edit Profile</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="px-3 py-1.5 min-h-[36px] bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#8B949E] hover:text-[#E6EDF3] rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors duration-155 shadow-sm"
            title="Roster Builder"
          >
            <Calendar className="w-4 h-4 text-brand-blue" />
            <span>Roster Builder</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/progress-notes?client=' + client.id)}
            className="px-3 py-1.5 min-h-[36px] bg-brand-navy border border-border-subtle hover:border-purple-400 text-[#8B949E] hover:text-[#E6EDF3] rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors duration-155 shadow-sm"
            title="Progress Notes"
          >
            <ClipboardEdit className="w-4 h-4 text-purple-400" />
            <span>Progress Notes</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        
        {/* Main Content Grid */}
        <div className="h-full grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-6">
          
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
                    {client.funding_type === 'HOME_CARE' ? `ID: ${client.my_aged_care_id || client.ndis_number || 'N/A'}` : `NDIS: ${client.ndis_number || 'N/A'}`}
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
               <div className={`grid grid-cols-1 ${client.funding_type === 'HOME_CARE' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-6 pb-6 border-b border-border-subtle`}>
                 <div>
                   <div className="text-xs text-[#8B949E] mb-1">Funding Type</div>
                   <div className="text-sm font-medium text-[#E6EDF3]">
                     {client.funding_type === 'HOME_CARE' 
                       ? `Home Care (${client.home_care_sub_type === 'SAH' ? 'SaH' : 'HCP'})` 
                       : 'NDIS'}
                   </div>
                 </div>
                 {client.funding_type === 'HOME_CARE' && (
                     <>
                     <div>
                       <div className="text-xs text-[#8B949E] mb-1">
                       {client.home_care_sub_type === 'SAH' ? 'SaH Class Level' : 'HCP Subsidy Level'}
                     </div>
                   <div className="text-sm font-medium text-[#E6EDF3]">
                       {client.home_care_level_or_class || 'Level 1'}
                     </div>
                     </div>
                     <div>
                 <div className="text-xs text-[#8B949E] mb-1">Daily Funding Rate</div>
                   <div className="text-sm font-medium text-brand-green">
                 {formatRate(getClientDailyRate())} <span className="text-[11px] text-[#8B949E] font-normal">/ day</span>
                     </div>
                     </div>
                     </>
                   )}
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
                         {getNotePreview(note.notes)}
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
