import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Ban, CheckCircle, UsersIcon, UserPlus } from 'lucide-react';
import StaffModal from './StaffModal';
import ClientModal from './ClientModal';
import ProviderModal from './ProviderModal';

export default function StaffClientsView() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CLIENTS' | 'PROVIDERS'>('STAFF');

  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight mb-6 md:mb-0">Directory</h2>
        <button 
          onClick={handleAddNew}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green hover:opacity-90 text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full justify-center md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab === 'STAFF' ? 'Staff' : activeTab === 'CLIENTS' ? 'Client' : 'Provider'}
        </button>
      </div>

      <div className="flex space-x-1 bg-brand-navy border border-border-subtle p-1 rounded-lg w-fit max-w-full overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'STAFF' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Staff
        </button>
        <button
          onClick={() => setActiveTab('CLIENTS')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'CLIENTS' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Clients
        </button>
        <button
          onClick={() => setActiveTab('PROVIDERS')}
          className={`px-4 py-2 text-[13px] rounded-md transition-colors ${activeTab === 'PROVIDERS' ? 'bg-brand-bg text-[#E6EDF3] shadow-sm' : 'text-[#8B949E] hover:text-[#E6EDF3]'}`}
        >
          Providers
        </button>
      </div>

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#8B949E]">Loading directory...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E]">
                <th className="px-5 py-4 font-semibold">{activeTab === 'PROVIDERS' ? 'Company Name' : 'Name'}</th>
                {activeTab === 'CLIENTS' && <th className="px-5 py-4 font-semibold">Provider & Services</th>}
                {activeTab === 'CLIENTS' && <th className="px-5 py-4 font-semibold">Funding</th>}
                <th className="px-5 py-4 font-semibold">{activeTab === 'STAFF' ? 'Email/Role' : activeTab === 'CLIENTS' ? 'Contact Info' : 'Contact Info'}</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-sm">
              {activeTab === 'STAFF' && staff.map(s => (
                <tr key={s.id} onClick={() => handleEditStaff(s)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${s.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#E6EDF3] flex items-center">
                      {s.first_name} {s.last_name}
                      {s.status === 'SUSPENDED' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/50 text-red-400">SUSPENDED</span>}
                    </div>
                    <div className="text-[#8B949E] text-xs mt-1">Joined {new Date(s.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#E6EDF3]">{s.email}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-bg text-[#8B949E] border border-border-subtle mt-1">
                      {s.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditStaff(s)} className="p-2 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(s.id, s.status || 'ACTIVE')} 
                      className={`p-2 sm:p-2 text-[#8B949E] hover:text-red-400 transition-colors`}
                      title={s.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                    >
                      {s.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              
              {activeTab === 'CLIENTS' && clients.map(c => (
                <tr key={c.id} onClick={() => handleEditClient(c)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${c.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#E6EDF3] flex items-center">
                      {c.first_name} {c.last_name}
                      {c.status === 'SUSPENDED' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/50 text-red-400">SUSPENDED</span>}
                    </div>
                    <div className="text-[#8B949E] text-xs mt-1">Joined {new Date(c.created_at).toLocaleDateString()} {c.dob ? `• DOB: ${new Date(c.dob).toLocaleDateString()}` : ''}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#E6EDF3] text-sm">{c.provider_name || 'No Provider'}</div>
                    {c.service_ids && c.service_ids.length > 0 && (
                      <div className="text-xs text-[#8B949E] mt-1">{c.service_ids.length} service(s) configured</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#E6EDF3] text-sm">
                      {c.funding_type === 'HOME_CARE' ? (
                        <>Home Care ID: {c.my_aged_care_id || 'N/A'}</>
                      ) : (
                        <>NDIS Number: {c.ndis_number || 'N/A'}</>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {(c.contact_email || c.contact_phone) ? (
                      <div className="text-[#E6EDF3] text-sm">{c.contact_email} {c.contact_phone && `• ${c.contact_phone}`}</div>
                    ) : (
                      <div className="text-[#8B949E] text-sm">No contact info</div>
                    )}
                    {c.representative_name && (
                      <div className="text-[#8B949E] text-xs mt-1">Rep: {c.representative_name}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditClient(c)} className="p-2 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(c.id, c.status || 'ACTIVE')} 
                      className={`p-2 sm:p-2 text-[#8B949E] hover:text-red-400 transition-colors`}
                      title={c.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                    >
                      {c.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}

              {activeTab === 'PROVIDERS' && providers.map(p => (
                <tr key={p.id} onClick={() => handleEditProvider(p)} className={`hover:bg-brand-bg/50 transition-colors cursor-pointer ${p.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#E6EDF3] flex items-center">
                      {p.company_name}
                      {p.status === 'SUSPENDED' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-red-900/50 text-red-400">SUSPENDED</span>}
                    </div>
                    <div className="text-[#8B949E] text-xs mt-1">Joined {new Date(p.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#E6EDF3]">{p.contact_name || 'No Contact Name'}</div>
                    <div className="text-[#8B949E] text-xs mt-1">{p.email} {p.phone && `• ${p.phone}`}</div>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditProvider(p)} className="p-2 text-[#8B949E] hover:text-brand-teal transition-colors rounded-md">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(p.id, p.status || 'ACTIVE')} 
                      className={`p-2 sm:p-2 text-[#8B949E] hover:text-red-400 transition-colors`}
                      title={p.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                    >
                      {p.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}

              {(activeTab === 'STAFF' && staff.length === 0) && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-[#8B949E]">No staff found.</td></tr>
              )}
              {(activeTab === 'CLIENTS' && clients.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[#8B949E]">No clients found.</td></tr>
              )}
              {(activeTab === 'PROVIDERS' && providers.length === 0) && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-[#8B949E]">No providers found.</td></tr>
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
