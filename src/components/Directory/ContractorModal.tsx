import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  token: string;
  contractor: any;
}

export default function ContractorModal({ isOpen, onClose, onSave, token, contractor }: ContractorModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (contractor) {
      setFormData({
        companyName: contractor.company_name || '',
        contactName: contractor.contact_name || '',
        email: contractor.email || '',
        phone: contractor.phone || '',
        address: contractor.address || ''
      });
    } else {
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        address: ''
      });
    }
  }, [contractor, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = contractor ? `/api/contractors/${contractor.id}` : '/api/contractors';
      const method = contractor ? 'PUT' : 'POST';
      
      const payload = {
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        contractor_type: 'Service' // Default type since we removed the selector
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save service');
      onSave();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Failed to save service');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1b1e] rounded-xl border border-white/[0.05] w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">{contractor ? 'Edit Service' : 'Add New Service'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Company Name *</label>
              <input required name="companyName" value={formData.companyName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Name</label>
              <input name="contactName" value={formData.contactName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
          
          <div>
            <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/[0.05]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-brand-blue/20">
              {contractor ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
