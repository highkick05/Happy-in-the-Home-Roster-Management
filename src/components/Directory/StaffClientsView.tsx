import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Ban, CheckCircle, UsersIcon, UserPlus } from 'lucide-react';
import StaffModal from './StaffModal';
import ClientModal from './ClientModal';
import ProviderModal from './ProviderModal';

export default function StaffClientsView({ type = 'STAFF' }: { type?: 'STAFF' | 'CLIENTS' | 'PROVIDERS' }) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CLIENTS' | 'PROVIDERS'>(type);

  useEffect(() => {
    setActiveTab(type);
  }, [type]);

  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientTab, setClientTab] = useState<'NDIS' | 'HOME_CARE'>('NDIS');

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'STAFF' ? '/api/staff' : activeTab === 'CLIENTS' ? '/api/clients' : '/api/providers';
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'STAFF') setStaff(data);
        else if (activeTab === 'CLIENTS') setClients(data);
        else setProviders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    
    try {
      const endpoint = activeTab === 'STAFF' ? `/api/staff/${id}/status` : activeTab === 'CLIENTS' ? `/api/clients/${id}/status` : `/api/providers/${id}/status`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNew = async () => {
    if (activeTab === 'STAFF') {
      setSelectedStaff(null);
      setIsStaffModalOpen(true);
    } else if (activeTab === 'CLIENTS') {
      setSelectedClient(null);
      setIsClientModalOpen(true);
    } else {
      setSelectedProvider(null);
      setIsProviderModalOpen(true);
    }
  };

  const handleEditStaff = (s: any) => {
    setSelectedStaff(s);
    setIsStaffModalOpen(true);
  };

  const handleEditClient = (c: any) => {
    setSelectedClient(c);
    setIsClientModalOpen(true);
  };

  const handleEditProvider = (p: any) => {
    setSelectedProvider(p);
    setIsProviderModalOpen(true);
  };


  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-zinc-400">You do not have permission to view this page.</div>;
  }

  const isHomeCare = (c: any) => c.funding_type === 'HCP' || c.funding_type === 'Home Care' || c.funding_type === 'HOME_CARE';
  const ndisClients = clients.filter(c => !isHomeCare(c));
  const homeCareClients = clients.filter(c => isHomeCare(c));
  const displayClients = clientTab === 'NDIS' ? ndisClients : homeCareClients;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4 mb-2">
        <div className="flex items-center space-x-6">
          <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight">
             {activeTab === 'STAFF' ? 'Staff Directory' : activeTab === 'CLIENTS' ? 'Client Directory' : 'Provider Directory'}
          </h2>
          {activeTab === 'CLIENTS' && (
             <div className="hidden sm:flex space-x-1 bg-brand-navy border border-border-subtle p-1 rounded-lg shadow-sm">
                <button
                  onClick={() => setClientTab('NDIS')}
                  className={`flex items-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${clientTab === 'NDIS' ? 'bg-brand-bg text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
                >
                  NDIS <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${clientTab === 'NDIS' ? 'bg-[#E6EDF3]/10 text-brand-teal' : 'bg-brand-navy border border-border-subtle'}`}>{ndisClients.length}</span>
                </button>
                <button
                  onClick={() => setClientTab('HOME_CARE')}
                  className={`flex items-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${clientTab === 'HOME_CARE' ? 'bg-brand-bg text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
                >
                  Home Care <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${clientTab === 'HOME_CARE' ? 'bg-[#E6EDF3]/10 text-brand-green' : 'bg-brand-navy border border-border-subtle'}`}>{homeCareClients.length}</span>
                </button>
             </div>
          )}
        </div>
        
        <button 
          onClick={handleAddNew}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green hover:opacity-90 text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full shrink-0 justify-center md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab === 'STAFF' ? 'Staff' : activeTab === 'CLIENTS' ? 'Client' : 'Provider'}
        </button>
      </div>

      {activeTab === 'CLIENTS' && (
          <div className="flex sm:hidden space-x-1 bg-brand-navy border border-border-subtle p-1 rounded-lg shadow-sm mb-4">
            <button
              onClick={() => setClientTab('NDIS')}
              className={`flex-1 flex justify-center items-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${clientTab === 'NDIS' ? 'bg-brand-bg text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            >
              NDIS <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${clientTab === 'NDIS' ? 'bg-[#E6EDF3]/10 text-brand-teal' : 'bg-brand-navy border border-border-subtle'}`}>{ndisClients.length}</span>
            </button>
            <button
              onClick={() => setClientTab('HOME_CARE')}
              className={`flex-1 flex justify-center items-center px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${clientTab === 'HOME_CARE' ? 'bg-brand-bg text-[#E6EDF3]' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
            >
              Home Care <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${clientTab === 'HOME_CARE' ? 'bg-[#E6EDF3]/10 text-brand-green' : 'bg-brand-navy border border-border-subtle'}`}>{homeCareClients.length}</span>
            </button>
         </div>
      )}

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#8B949E]">Loading directory...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E]">
                <th className="px-4 py-3 font-semibold">{activeTab === 'PROVIDERS' ? 'Company Name' : 'Name'}</th>
                {activeTab === 'CLIENTS' && <th className="px-4 py-3 font-semibold">Provider & Services</th>}
                {activeTab === 'CLIENTS' && <th className="px-4 py-3 font-semibold">Funding</th>}
                <th className="px-4 py-3 font-semibold">{activeTab === 'STAFF' ? 'Email/Role' : activeTab === 'CLIENTS' ? 'Contact Info' : 'Contact Info'}</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-[13px]">
              {activeTab === 'STAFF' && staff.map(s => {
                const initials = `${(s.first_name || '').charAt(0)}${(s.last_name || '').charAt(0)}`.toUpperCase();
                return (
                  <tr key={s.id} onClick={() => handleEditStaff(s)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${s.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-[#E6EDF3] flex items-center">
                            {s.first_name} {s.last_name}
                            {s.status === 'SUSPENDED' && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                                SUSPENDED
                              </span>
                            )}
                          </div>
                          <div className="text-[#8B949E] text-xs mt-0.5">Joined {new Date(s.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="text-[#E6EDF3]">{s.email}</div>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider uppercase bg-brand-bg text-[#8B949E] border border-border-subtle mt-0.5">
                        {s.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditStaff(s)} className="p-1.5 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(s.id, s.status || 'ACTIVE')} 
                        className="p-1.5 text-[#8B949E] hover:text-red-400 transition-colors rounded-md hover:bg-white/[0.04]"
                        title={s.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      >
                        {s.status === 'SUSPENDED' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {activeTab === 'CLIENTS' && displayClients.map(c => {
                const initials = `${(c.first_name || '').charAt(0)}${(c.last_name || '').charAt(0)}`.toUpperCase();
                return (
                  <tr key={c.id} onClick={() => handleEditClient(c)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${c.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-[#E6EDF3] flex items-center">
                            {c.first_name} {c.last_name}
                            {c.status === 'SUSPENDED' && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                                SUSPENDED
                              </span>
                            )}
                          </div>
                          <div className="text-[#8B949E] text-xs mt-0.5">
                            Joined {new Date(c.created_at).toLocaleDateString()} {c.dob ? `• DOB: ${new Date(c.dob).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="text-[#E6EDF3]">{c.provider_name || 'No Provider'}</div>
                      {c.service_ids && c.service_ids.length > 0 && (
                        <div className="text-[11px] text-[#8B949E] mt-0.5 font-medium">{c.service_ids.length} service(s) configured</div>
                      )}
                    </td>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="text-[#E6EDF3] font-mono text-xs">
                        {c.funding_type === 'HOME_CARE' ? (
                          <>Home Care ID: {c.my_aged_care_id || 'N/A'}</>
                        ) : (
                          <>NDIS Number: {c.ndis_number || 'N/A'}</>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5">
                      {(c.contact_email || c.contact_phone) ? (
                        <div className="text-[#E6EDF3]">{c.contact_email} {c.contact_phone && `• ${c.contact_phone}`}</div>
                      ) : (
                        <div className="text-[#8B949E] text-xs italic">No contact info</div>
                      )}
                      {c.representative_name && (
                        <div className="text-[#8B949E] text-[11px] mt-0.5">Rep: {c.representative_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 sm:py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditClient(c)} className="p-1.5 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(c.id, c.status || 'ACTIVE')} 
                        className="p-1.5 text-[#8B949E] hover:text-red-400 transition-colors rounded-md hover:bg-white/[0.04]"
                        title={c.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      >
                        {c.status === 'SUSPENDED' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {activeTab === 'PROVIDERS' && providers.map(p => {
                const initials = (p.company_name || '').slice(0, 2).toUpperCase();
                return (
                  <tr key={p.id} onClick={() => handleEditProvider(p)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${p.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {initials || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-[#E6EDF3] flex items-center">
                            {p.company_name}
                            {p.status === 'SUSPENDED' && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                                SUSPENDED
                              </span>
                            )}
                          </div>
                          <div className="text-[#8B949E] text-xs mt-0.5">Joined {new Date(p.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5">
                      <div className="text-[#E6EDF3]">{p.contact_name || 'No Contact Name'}</div>
                      <div className="text-[#8B949E] text-xs mt-0.5">{p.email} {p.phone && `• ${p.phone}`}</div>
                    </td>
                    <td className="px-4 py-2 sm:py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEditProvider(p)} className="p-1.5 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md hover:bg-white/[0.04]">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(p.id, p.status || 'ACTIVE')} 
                        className="p-1.5 text-[#8B949E] hover:text-red-400 transition-colors rounded-md hover:bg-white/[0.04]"
                        title={p.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      >
                        {p.status === 'SUSPENDED' ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {(activeTab === 'STAFF' && staff.length === 0) && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[#8B949E]">No staff found.</td></tr>
              )}
              {(activeTab === 'CLIENTS' && displayClients.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[#8B949E]">No clients found in this category.</td></tr>
              )}
              {(activeTab === 'PROVIDERS' && providers.length === 0) && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[#8B949E]">No providers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSave={() => {
          setIsStaffModalOpen(false);
          fetchData();
        }}
        token={token!}
        staff={selectedStaff}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={() => {
          setIsClientModalOpen(false);
          fetchData();
        }}
        token={token!}
        client={selectedClient}
      />

      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        onSave={() => {
          setIsProviderModalOpen(false);
          fetchData();
        }}
        token={token!}
        provider={selectedProvider}
      />
    </div>
  );
}
