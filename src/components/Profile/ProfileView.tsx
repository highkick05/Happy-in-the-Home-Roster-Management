import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';

export default function ProfileView() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    dob: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankName: '',
    bankBsb: '',
    bankAcc: '',
    taxNumber: '',
    superFundName: '',
    superMemberNumber: '',
    password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          ...data,
          password: '' // never set password from server
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      
      setSuccessMsg('Profile updated successfully.');
      setFormData(prev => ({ ...prev, password: '' })); // clear password field
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight mb-6">Your Profile</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your personal and employment details.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {successMsg && <div className="p-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-md text-sm">{successMsg}</div>}
        {errorMsg && <div className="p-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-md text-sm">{errorMsg}</div>}

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden space-y-6">
          <h2 className="text-lg font-medium text-white border-b border-white/[0.08] pb-3 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">First Name</label>
              <input type="text" value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</label>
              <input type="text" value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
              <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date of Birth</label>
              <CustomDatePicker position="bottom" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Address</label>
              <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden space-y-6">
          <h2 className="text-lg font-medium text-white border-b border-white/[0.08] pb-3 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
              <input type="text" value={formData.emergencyContactName || ''} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
              <input type="text" value={formData.emergencyContactPhone || ''} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden space-y-6">
          <h2 className="text-lg font-medium text-white border-b border-white/[0.08] pb-3 mb-4">Financial Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Bank Name</label>
              <input type="text" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">BSB</label>
              <input type="text" value={formData.bankBsb || ''} onChange={e => setFormData({...formData, bankBsb: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Account Number</label>
              <input type="text" value={formData.bankAcc || ''} onChange={e => setFormData({...formData, bankAcc: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Tax File Number</label>
              <input type="text" value={formData.taxNumber || ''} onChange={e => setFormData({...formData, taxNumber: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Super Fund Name</label>
              <input type="text" value={formData.superFundName || ''} onChange={e => setFormData({...formData, superFundName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Super Member Number</label>
              <input type="text" value={formData.superMemberNumber || ''} onChange={e => setFormData({...formData, superMemberNumber: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden space-y-6">
          <h2 className="text-lg font-medium text-white border-b border-white/[0.08] pb-3 mb-4">Change Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">New Password (leave blank to keep current)</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="flex items-center px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-50">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
