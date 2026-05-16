import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import ClientRosterTemplates from './ClientRosterTemplates';
import CustomDatePicker from '../ui/CustomDatePicker';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  token: string;
  client: any;
}

export default function ClientModal({ isOpen, onClose, onSave, token, client }: ClientModalProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ROSTER'>('DETAILS');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    ndisNumber: '',
    carePlanDetails: '',
    contactEmail: '',
    contactPhone: '',
    providerId: '',
    dob: '',
    fundingType: 'NDIS',
    myAgedCareId: '',
    address: '',
    representativeName: '',
    representativePhone: '',
    representativeEmail: '',
    serviceIds: [] as number[],
  });

  useEffect(() => {
    if (isOpen) {
      fetch('/api/providers', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load providers');
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : [];
        } catch(e) {
          return [];
        }
      })
      .then(data => setProviders(data))
      .catch(console.error);

      fetch('/api/services', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load services');
        const text = await res.text();
        try {
          return text ? JSON.parse(text) : [];
        } catch(e) {
          return [];
        }
      })
      .then(data => setServices(data))
      .catch(console.error);
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        ndisNumber: client.ndis_number || '',
        carePlanDetails: client.care_plan_details || '',
        contactEmail: client.contact_email || '',
        contactPhone: client.contact_phone || '',
        providerId: client.provider_id || '',
        dob: client.dob || '',
        fundingType: client.funding_type || 'NDIS',
        myAgedCareId: client.my_aged_care_id || '',
        address: client.address || '',
        representativeName: client.representative_name || '',
        representativePhone: client.representative_phone || '',
        representativeEmail: client.representative_email || '',
        serviceIds: client.service_ids || [],
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        ndisNumber: '',
        carePlanDetails: '',
        contactEmail: '',
        contactPhone: '',
        providerId: '',
        dob: '',
        fundingType: 'NDIS',
        myAgedCareId: '',
        address: '',
        representativeName: '',
        representativePhone: '',
        representativeEmail: '',
        serviceIds: [],
      });
    }
  }, [client, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleService = (serviceId: number) => {
    setFormData(prev => {
      const isSelected = prev.serviceIds.includes(serviceId);
      if (isSelected) {
        return { ...prev, serviceIds: prev.serviceIds.filter(id => id !== serviceId) };
      } else {
        return { ...prev, serviceIds: [...prev.serviceIds, serviceId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = client ? `/api/clients/${client.id}` : '/api/clients';
      const method = client ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        onSave();
        onClose();
      } else {
        let err;
        try {
          err = await res.json();
        } catch (_e) {
          err = { error: `Server error: ${res.status}` };
        }
        alert(err.error || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 xl:p-8" onClick={onClose}>
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-xl w-[98vw] max-w-[2400px] h-[95vh] lg:h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex border-b border-white/[0.08] shrink-0 flex-col">
          <div className="flex justify-between items-start pt-4 px-4">
            <div className="flex flex-col shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight mb-4">{client ? 'Edit Client Details' : 'Add New Client'}</h2>
              {client && (
                <div className="flex space-x-6 text-sm font-medium mt-6 mt-auto">
                  <button 
                    onClick={() => setActiveTab('DETAILS')}
                    className={`pb-3 border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}
                  >
                    Client Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('ROSTER')}
                    className={`pb-3 border-b-2 transition-colors ${activeTab === 'ROSTER' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}
                  >
                    Roster Builder
                  </button>
                </div>
              )}
            </div>
            
            <div className="mx-6 flex-1"></div>

            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col lg:flex-row">
          
          {/* Main Area */}
          {activeTab === 'ROSTER' && client ? (
             <div className="flex-1 w-full bg-[#09090b] min-h-0 overflow-y-auto">
               <ClientRosterTemplates client={client} />
             </div>
          ) : (
            <>
              {/* Left Column: Client Form Details */}
              <div className="w-full lg:w-[30%] shrink-0 p-4 overflow-y-auto custom-scrollbar">
            <form id="client-form" onSubmit={handleSubmit} className="space-y-6 pb-64">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">First Name *</label>
                  <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Last Name *</label>
                  <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Date of Birth</label>
                  <CustomDatePicker position="bottom" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Funding Type</label>
                  <select name="fundingType" value={formData.fundingType} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                    <option value="NDIS">NDIS</option>
                    <option value="HOME_CARE">Home Care</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.fundingType === 'NDIS' && (
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">NDIS Number</label>
                    <input name="ndisNumber" value={formData.ndisNumber} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                )}
                {formData.fundingType === 'HOME_CARE' && (
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Home Care ID</label>
                    <input name="myAgedCareId" value={formData.myAgedCareId} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                )}
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Provider</label>
                  <select name="providerId" value={formData.providerId} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                    <option value="">No Provider</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Email</label>
                  <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Phone</label>
                  <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
              </div>

              <div className="border-t border-white/[0.08] pt-6">
                <h3 className="text-[14px] font-medium text-white mb-4">Representative / Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Name</label>
                    <input name="representativeName" value={formData.representativeName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Phone</label>
                    <input name="representativePhone" value={formData.representativePhone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Email</label>
                    <input type="email" name="representativeEmail" value={formData.representativeEmail} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Care Plan Details / Notes</label>
                <textarea name="carePlanDetails" value={formData.carePlanDetails} onChange={handleChange} rows={4} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
              </div>
            </form>
          </div>

          {/* Middle Column: Available Services List */}
          <div className="w-full lg:flex-1 p-4 lg:border-l border-t lg:border-t-0 border-white/[0.08] flex flex-col min-h-0 bg-[#121214]/30 shrink-0">
            <h3 className="text-base font-medium text-white mb-1">Available Services</h3>
            <p className="text-xs text-zinc-500 mb-4">Select services for this client to assign them easily when creating a shift.</p>
            
            <input 
              type="text"
              placeholder="Search services..." 
              value={serviceSearchQuery} 
              onChange={e => setServiceSearchQuery(e.target.value)} 
              className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" 
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {services
                .filter(s => formData.fundingType === s.type || (!s.type))
                .filter(s => 
                  s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || 
                  (s.code && s.code.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                )
                .sort((a, b) => (a.code || '').localeCompare(b.code || ''))
                .map(service => {
                  const isSelected = formData.serviceIds.includes(service.id);
                  return (
                    <div 
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`flex items-start p-3 rounded-md cursor-pointer border transition-colors ${
                        isSelected ? 'bg-indigo-900/20 border-brand-teal/50' : 'bg-[#09090b] border-white/[0.08] hover:border-white/[0.12]'
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center mr-3 ${
                        isSelected ? 'bg-indigo-500 border-brand-teal' : 'border-zinc-600 bg-[#121214]'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-brand-teal' : 'text-zinc-300'}`}>
                          {service.name}
                        </div>
                        {service.code && (
                          <div className="text-xs text-zinc-500 mt-1">Code: {service.code}</div>
                        )}
                      </div>
                    </div>
                  )
              })}
              
              {services.filter(s => formData.fundingType === s.type || (!s.type)).length === 0 && (
                <div className="text-sm text-zinc-500 p-4 text-center border border-dashed border-white/[0.08] rounded-md">
                  No available services to add.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Services */}
          <div className="w-full lg:flex-1 p-4 lg:border-l border-t lg:border-t-0 border-white/[0.08] flex flex-col min-h-0 bg-[#121214]/50 shrink-0">
            <h3 className="text-base font-medium text-white mb-1">Personalised Services List</h3>
            <p className="text-xs text-zinc-500 mb-4">You have added the following services.</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {formData.serviceIds.length === 0 ? (
                 <div className="text-sm text-zinc-500 p-4 text-center border border-dashed border-white/[0.08] rounded-md">
                   No services selected.
                 </div>
               ) : (
                 services.filter(s => formData.serviceIds.includes(s.id)).map(service => (
                    <div key={service.id} className="flex flex-col items-start p-3 rounded-md border border-brand-teal/30 bg-indigo-900/10">
                        <div className="flex w-full justify-between items-start">
                          <div className="flex-1 pr-2">
                            <div className="text-sm font-medium text-brand-teal">
                              {service.name}
                            </div>
                            {service.code && (
                              <div className="text-xs text-zinc-500 mt-1">Code: {service.code}</div>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => toggleService(service.id)}
                            className="mt-0.5 text-zinc-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-400/10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                    </div>
                 ))
               )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/[0.08] flex justify-between items-center text-xs">
              <span className="text-zinc-400">Selected Services:</span>
              <span className="bg-indigo-500/20 text-brand-teal px-2 py-1 rounded-full font-medium">
                {formData.serviceIds.length}
              </span>
            </div>
          </div>
          </>
          )}
        </div>

        {activeTab === 'DETAILS' && (
          <div className="p-4 border-t border-white/[0.08] flex justify-end space-x-3 bg-[#121214]/50 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" form="client-form" className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors">
              {client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
