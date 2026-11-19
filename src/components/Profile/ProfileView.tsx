import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, RefreshCw, Lock } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { getAvatarUrl } from '../../utils/avatar';
import AvatarSelector from '../ui/AvatarSelector';

export default function ProfileView() {
  const { token, user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const isStaffLockedAddress = user?.role !== 'ADMIN';

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

  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

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
        setProfileLoaded(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!profileLoaded) {
      setErrorMsg('Profile is still loading. Please wait a moment and try again.');
      return;
    }

    const cleanFirst = (formData.firstName || '').trim();
    const cleanLast = (formData.lastName || '').trim();
    const cleanPhone = (formData.phone || '').trim();
    const cleanAddress = (formData.address || '').trim();

    if (!cleanFirst || !cleanLast || !cleanPhone) {
      setErrorMsg('First Name, Last Name, and Phone Number are required and cannot be left blank.');
      return;
    }

    if (!isStaffLockedAddress && !cleanAddress) {
      setErrorMsg('Residential Address is required for shift travel calculations and cannot be left blank.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        firstName: cleanFirst,
        lastName: cleanLast,
        phone: cleanPhone,
        address: cleanAddress,
      };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      
      if (user) {
        updateUser({
          ...user,
          firstName: cleanFirst,
          lastName: cleanLast,
          avatarUrl: formData.avatarUrl,
        });
      }

      setSuccessMsg('Profile updated successfully.');
      setFormData(prev => ({ ...prev, firstName: cleanFirst, lastName: cleanLast, phone: cleanPhone, address: cleanAddress, password: '' })); // clear password field
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
        <div className="bg-brand-navy border border-border-subtle rounded-xl p-4 md:p-5 shadow-sm">
          <AvatarSelector
            value={formData.avatarUrl}
            onChange={(url) => setFormData(prev => ({ ...prev, avatarUrl: url }))}
            token={token || ''}
            label="Profile Avatar"
          />
        </div>

        {successMsg && <div className="p-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-md text-sm">{successMsg}</div>}
        {errorMsg && <div className="p-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-md text-sm">{errorMsg}</div>}

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-4 shadow-lg relative space-y-6">
          <h2 className="text-[11px] uppercase tracking-wider font-semibold text-white border-b border-white/[0.08] pb-2 mb-3">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">First Name <span className="text-red-400">*</span></label>
              <input type="text" required value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Last Name <span className="text-red-400">*</span></label>
              <input type="text" required value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Phone <span className="text-red-400">*</span></label>
              <input type="text" required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Date of Birth</label>
              <CustomDatePicker position="bottom" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                  Address {!isStaffLockedAddress && <span className="text-red-400">*</span>}
                </label>
                {isStaffLockedAddress && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    <Lock className="w-2.5 h-2.5" />
                    Locked (Admin Only)
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address || ''}
                  readOnly={isStaffLockedAddress}
                  disabled={isStaffLockedAddress}
                  required={!isStaffLockedAddress}
                  onChange={e => {
                    if (!isStaffLockedAddress) {
                      setFormData({ ...formData, address: e.target.value });
                    }
                  }}
                  placeholder={isStaffLockedAddress ? 'No address on file — please contact an administrator' : '123 Example St, Suburb, State, 1234'}
                  className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isStaffLockedAddress
                      ? 'bg-zinc-900/70 border border-white/[0.06] text-zinc-400 cursor-not-allowed select-none pr-8'
                      : 'bg-black/40 border border-white/[0.08] text-white focus:border-brand-blue placeholder-zinc-600'
                  }`}
                />
                {isStaffLockedAddress && (
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>
              {isStaffLockedAddress && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  Locked for shift travel calculations — please contact an administrator if your residential address needs to be updated.
                </p>
              )}
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
