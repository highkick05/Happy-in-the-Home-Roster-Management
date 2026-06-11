import React, { useState, useEffect } from 'react';
import { X, Check, Calendar } from 'lucide-react';
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    ndisNumber: '',
    carePlanDetails: '',
    contactEmail: '',
    contactPhone: '',
    providerId: '',
    dob: '',
    joinedDate: '',
    fundingType: 'NDIS',
    myAgedCareId: '',
    homeCareSubType: 'HCP',
    homeCareLevelOrClass: 'Level 1',
    address: '',
    representativeName: '',
    representativePhone: '',
    representativeEmail: '',
    serviceIds: [] as number[],
    careCoordinationFee: 20,
    billingTier: 'SAH_Full_Pensioner',
    historicalMonthlyCap: 0,
    assessedIndependencePct: 0,
    assessedEverydayLivingPct: 0,
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
        joinedDate: client.joined_date ? client.joined_date.split('T')[0] : (client.created_at ? new Date(client.created_at).toISOString().split('T')[0] : ''),
        fundingType: client.funding_type || 'NDIS',
        myAgedCareId: client.my_aged_care_id || '',
        homeCareSubType: client.home_care_sub_type || 'HCP',
        homeCareLevelOrClass: client.home_care_level_or_class || 'Level 1',
        address: client.address || '',
        representativeName: client.representative_name || '',
        representativePhone: client.representative_phone || '',
        representativeEmail: client.representative_email || '',
        serviceIds: client.service_ids || [],
        careCoordinationFee: client.care_coordination_fee !== undefined && client.care_coordination_fee !== null ? client.care_coordination_fee : 20,
        billingTier: client.billing_tier || 'SAH_Full_Pensioner',
        historicalMonthlyCap: client.historical_monthly_cap !== undefined && client.historical_monthly_cap !== null ? client.historical_monthly_cap : 0,
        assessedIndependencePct: client.assessed_independence_pct !== undefined && client.assessed_independence_pct !== null ? client.assessed_independence_pct : 0,
        assessedEverydayLivingPct: client.assessed_everyday_living_pct !== undefined && client.assessed_everyday_living_pct !== null ? client.assessed_everyday_living_pct : 0,
        ndisAgreementStartDate: client.ndis_agreement_start_date || '',
        ndisAgreementEndDate: client.ndis_agreement_end_date || '',
        ndisAgreementBudget: client.ndis_agreement_budget !== undefined && client.ndis_agreement_budget !== null ? client.ndis_agreement_budget : 0,
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
        joinedDate: '',
        fundingType: 'NDIS',
        myAgedCareId: '',
        homeCareSubType: 'HCP',
        homeCareLevelOrClass: 'Level 1',
        address: '',
        representativeName: '',
        representativePhone: '',
        representativeEmail: '',
        serviceIds: [],
        careCoordinationFee: 20,
        billingTier: 'SAH_Full_Pensioner',
        historicalMonthlyCap: 0,
        assessedIndependencePct: 0,
        assessedEverydayLivingPct: 0,
        ndisAgreementStartDate: '',
        ndisAgreementEndDate: '',
        ndisAgreementBudget: 0,
      });
    }
  }, [client, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'homeCareSubType') {
        updated.homeCareLevelOrClass = value === 'SAH' ? 'Class 1' : 'Level 1';
      } else if (name === 'fundingType' && value === 'HOME_CARE') {
        if (!updated.homeCareSubType) updated.homeCareSubType = 'HCP';
        if (!updated.homeCareLevelOrClass) updated.homeCareLevelOrClass = 'Level 1';
      } else if (name === 'billingTier') {
        if (value === 'Grandfathered') {
          updated.assessedIndependencePct = 0;
          updated.assessedEverydayLivingPct = 0;
        } else if (value === 'SAH_Full_Pensioner') {
          updated.assessedIndependencePct = 5;
          updated.assessedEverydayLivingPct = 17.5;
        } else if (value === 'SAH_Self_Funded') {
          updated.assessedIndependencePct = 50;
          updated.assessedEverydayLivingPct = 80;
        } else if (value === 'SAH_Part_Pensioner' || value === 'Hybrid') {
          updated.assessedIndependencePct = 0;
          updated.assessedEverydayLivingPct = 0;
        }
      }
      return updated;
    });
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
          <div className="flex justify-between items-start pt-4 pb-4 px-4">
            <div className="flex flex-col shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight">{client ? 'Edit Client Details' : 'Add New Client'}</h2>
            </div>
            
            <div className="mx-6 flex-1"></div>

            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
          
          {/* Main Area */}
          <>
            {/* Left Column: Client Form Details */}
              <div className="w-full lg:w-[30%] p-4 overflow-y-auto custom-scrollbar min-h-0">
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
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Joined Date</label>
                  <CustomDatePicker align="right" position="bottom" name="joinedDate" value={formData.joinedDate} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Funding Type</label>
                  <select name="fundingType" value={formData.fundingType} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                    <option value="NDIS">NDIS</option>
                    <option value="HOME_CARE">Home Care</option>
                  </select>
                </div>
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
              </div>

              {formData.fundingType === 'HOME_CARE' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Funding Model</label>
                    <select name="homeCareSubType" value={formData.homeCareSubType} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                      <option value="HCP">Home Care Package (HCP)</option>
                      <option value="SAH">Support at Home (SaH)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                      {formData.homeCareSubType === 'SAH' ? 'SaH Class Level' : 'HCP Subsidy Level'}
                    </label>
                    <select name="homeCareLevelOrClass" value={formData.homeCareLevelOrClass} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                      {formData.homeCareSubType === 'SAH' ? (
                        <>
                          <option value="Class 1">Class 1</option>
                          <option value="Class 2">Class 2</option>
                          <option value="Class 3">Class 3</option>
                          <option value="Class 4">Class 4</option>
                          <option value="Class 5">Class 5</option>
                          <option value="Class 6">Class 6</option>
                          <option value="Class 7">Class 7</option>
                          <option value="Class 8">Class 8</option>
                        </>
                      ) : (
                        <>
                          <option value="Level 1">Level 1</option>
                          <option value="Level 2">Level 2</option>
                          <option value="Level 3">Level 3</option>
                          <option value="Level 4">Level 4</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Care Coordination (%)</label>
                    <input type="number" step="0.01" name="careCoordinationFee" value={formData.careCoordinationFee} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                </div>
              )}

              {formData.fundingType === 'HOME_CARE' && (
                <div className="border-t border-white/[0.08] pt-4">
                  <h3 className="text-[14px] font-medium text-white mb-4">Billing & Participant Contribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Billing / Contribution Tier</label>
                      <select name="billingTier" value={formData.billingTier} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                        <option value="Grandfathered">Transitional: Grandfathered</option>
                        <option value="Hybrid">Transitional: Hybrid</option>
                        <option value="SAH_Full_Pensioner">Support at Home: Full Pensioner</option>
                        <option value="SAH_Part_Pensioner">Support at Home: Part Pensioner / CSHC</option>
                        <option value="SAH_Self_Funded">Support at Home: Self-Funded</option>
                      </select>
                    </div>

                    {formData.billingTier === 'Hybrid' && (
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Historical Monthly Cap ($)</label>
                        <input type="number" step="0.01" name="historicalMonthlyCap" value={formData.historicalMonthlyCap} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Assessed Independence Co-pay (%)</label>
                      <input type="number" step="0.01" min="0" max="100" name="assessedIndependencePct" value={formData.assessedIndependencePct} onChange={handleChange} disabled={['Grandfathered', 'SAH_Full_Pensioner', 'SAH_Self_Funded'].includes(formData.billingTier)} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Assessed Everyday Living Co-pay (%)</label>
                      <input type="number" step="0.01" min="0" max="100" name="assessedEverydayLivingPct" value={formData.assessedEverydayLivingPct} onChange={handleChange} disabled={['Grandfathered', 'SAH_Full_Pensioner', 'SAH_Self_Funded'].includes(formData.billingTier)} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                    </div>
                  </div>
                </div>
              )}

              {formData.fundingType === 'NDIS' && (
                <div className="border-t border-white/[0.08] pt-4">
                  <h3 className="text-[14px] font-medium text-white mb-4">NDIS Service Agreement Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Start Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="ndisAgreementStartDate"
                          value={formData.ndisAgreementStartDate}
                          onChange={handleChange}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-md pl-3 pr-10 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                        />
                        <Calendar className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">End Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          name="ndisAgreementEndDate"
                          value={formData.ndisAgreementEndDate}
                          onChange={handleChange}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-md pl-3 pr-10 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
                        />
                        <Calendar className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Total Agreement Funds ($)</label>
                    <input type="number" step="0.01" name="ndisAgreementBudget" value={formData.ndisAgreementBudget} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                </div>
              )}

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
          <div className="w-full lg:flex-1 p-4 lg:border-l border-t lg:border-t-0 border-white/[0.08] flex flex-col min-h-0 bg-[#121214]/30">
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
          <div className="w-full lg:flex-1 p-4 lg:border-l border-t lg:border-t-0 border-white/[0.08] flex flex-col min-h-0 bg-[#121214]/50">
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
        </div>

        <div className="p-4 border-t border-white/[0.08] flex justify-end space-x-3 bg-[#121214]/50 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" form="client-form" className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors">
            {client ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
