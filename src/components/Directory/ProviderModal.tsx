import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  token: string;
  provider: any;
}

export default function ProviderModal({ isOpen, onClose, onSave, token, provider }: ProviderModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        companyName: provider.company_name || '',
        contactName: provider.contact_name || '',
        email: provider.email || '',
        phone: provider.phone || '',
        address: provider.address || '',
      });
    } else {
      setFormData({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
      });
    }
  }, [provider, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = provider ? `/api/providers/${provider.id}` : '/api/providers';
      const method = provider ? 'PUT' : 'POST';
      
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
        const err = await res.json();
        alert(err.error || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/[0.08]">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-4">{provider ? 'Edit Provider Details' : 'Add New Provider'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <form id="provider-form" onSubmit={handleSubmit} className="space-y-6">
            
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
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Invoice Email</label>
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

          </form>
        </div>

        <div className="p-4 border-t border-white/[0.08] flex justify-end space-x-3 bg-[#121214]/50">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" form="provider-form" className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors">
            {provider ? 'Save Changes' : 'Add Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}
