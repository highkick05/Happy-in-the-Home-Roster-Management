import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, RefreshCw } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { getAvatarUrl } from '../../utils/avatar';

export default function ProfileView() {
  const { token, user, updateUser } = useAuth();
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
    password: '',
    avatarUrl: ''
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
          password: '', // never set password from server
          avatarUrl: getAvatarUrl(data.avatarUrl || data.firstName || 'Staff')
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
      
      if (user) {
        updateUser({
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          avatarUrl: formData.avatarUrl,
        });
      }

      setSuccessMsg('Profile updated successfully.');
      setFormData(prev => ({ ...prev, password: '' })); // clear password field
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHardReset = async () => {
    if (window.confirm("Are you sure? This will log you out, clear all offline data, and refresh the app to ensure you have the latest updates.")) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) await registration.unregister();
      }
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) await caches.delete(key);
      }
      window.location.reload(); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 md:px-0">
      <div className="mb-4">
        <h1 className="text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0">Your Profile</h1>
        <p className="text-zinc-400 text-xs mt-0">Manage your personal and employment details.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Profile Avatar Selection */}
        <div className="bg-brand-navy border border-border-subtle rounded-xl p-4 md:p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-[#E6EDF3] tracking-tight">Profile Avatar</h2>
          <div className="flex items-center gap-4">
            <img src={getAvatarUrl(formData.avatarUrl || 'Staff')} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08]" />
            <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
              {["Doctor", "Nurse", "Medic", "Healer", "Therapist", "Surgeon", "Caregiver", "Health", "Pulse", "Life", "Trippy", "Neon", "Cosmic", "Quantum", "Psychedelic", "Aura", "Vibe", "Zen", "Mind", "Soul", "Cyborg", "Nexus", "Synth", "Bio", "Nano", "Glitch", "Echo", "Flux", "Nova", "Apex"].map(seed => {
                const url = getAvatarUrl(seed);
                return (
                  <img 
                    key={seed} 
                    src={url} 
                    alt={seed}
                    className={`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all ${formData.avatarUrl === url ? 'ring-2 ring-brand-teal scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                    onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {successMsg && <div className="p-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-md text-sm">{successMsg}</div>}
        {errorMsg && <div className="p-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-md text-sm">{errorMsg}</div>}

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-4 shadow-lg relative space-y-6">
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">First Name</label>
              <input type="text" value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Last Name</label>
              <input type="text" value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Phone</label>
              <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Date of Birth</label>
              <CustomDatePicker position="bottom" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Address</label>
              <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-4 shadow-lg relative space-y-6">
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3">Emergency Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Name</label>
              <input type="text" value={formData.emergencyContactName || ''} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Phone</label>
              <input type="text" value={formData.emergencyContactPhone || ''} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-4 shadow-lg relative space-y-6">
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3">Financial Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Bank Name</label>
              <input type="text" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">BSB</label>
              <input type="text" value={formData.bankBsb || ''} onChange={e => setFormData({...formData, bankBsb: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Account Number</label>
              <input type="text" value={formData.bankAcc || ''} onChange={e => setFormData({...formData, bankAcc: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Tax File Number</label>
              <input type="text" value={formData.taxNumber || ''} onChange={e => setFormData({...formData, taxNumber: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Super Fund Name</label>
              <input type="text" value={formData.superFundName || ''} onChange={e => setFormData({...formData, superFundName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Super Member Number</label>
              <input type="text" value={formData.superMemberNumber || ''} onChange={e => setFormData({...formData, superMemberNumber: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-4 shadow-lg relative space-y-6">
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3">Change Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">New Password (leave blank to keep current)</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
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

      <div className="mt-12 pt-8 border-t border-border-subtle">
        <h3 className="text-sm font-semibold text-[#E6EDF3] uppercase tracking-wide mb-2">System Maintenance</h3>
        <p className="text-xs text-[#8B949E] mb-4 max-w-md">
          If you are experiencing issues with data not updating or the app behaving unexpectedly, use this button to perform a complete cache reset.
        </p>
        <button 
          onClick={handleHardReset}
          className="flex items-center px-4 py-2 bg-brand-navy hover:bg-brand-bg border border-border-subtle text-red-400 rounded-md text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Hard Reset App Cache
        </button>
      </div>
    </div>
  );
}
