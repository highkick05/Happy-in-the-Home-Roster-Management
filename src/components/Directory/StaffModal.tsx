import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { getAvatarUrl } from '../../utils/avatar';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  token: string;
  staff: any;
}

export default function StaffModal({ isOpen, onClose, onSave, token, staff }: StaffModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'STAFF',
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
    superMemberNumber: staff?.super_member_number || '',
    canSwitchAdmin: staff ? !!staff.can_switch_admin : false,
    avatarUrl: getAvatarUrl(staff?.avatar_url || Math.random().toString(36).substring(7)),
  });

  useEffect(() => {
    if (staff) {
      setFormData({
        email: staff.email || '',
        password: '',
        role: staff.role || 'STAFF',
        firstName: staff.first_name || '',
        lastName: staff.last_name || '',
        phone: staff.phone || '',
        address: staff.address || '',
        dob: staff.dob || '',
        emergencyContactName: staff.emergency_contact_name || '',
        emergencyContactPhone: staff.emergency_contact_phone || '',
        bankName: staff.bank_name || '',
        bankBsb: staff.bank_bsb || '',
        bankAcc: staff.bank_acc || '',
        taxNumber: staff.tax_number || '',
        superFundName: staff.super_fund_name || '',
        superMemberNumber: staff?.super_member_number || '',
        canSwitchAdmin: !!staff.can_switch_admin,
        avatarUrl: getAvatarUrl(staff.avatar_url || staff.first_name || 'Staff'),
      });
    } else {
      setFormData({
        email: '',
        password: '',
        role: 'STAFF',
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
        superMemberNumber: staff?.super_member_number || '',
    canSwitchAdmin: staff ? !!staff.can_switch_admin : false,
        avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7)),
      });
    }
  }, [staff, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = staff ? `/api/staff/${staff.id}` : '/api/staff';
      const method = staff ? 'PUT' : 'POST';
      const body = { ...formData };
      if (staff) {
        delete body.password; // Don't update password on PUT for now in this simple UI
      }
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
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
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-xl w-full max-w-2xl flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/[0.08] shrink-0">
          <h2 className="text-xl font-semibold text-white tracking-tight mb-4">{staff ? 'Edit Staff Details' : 'Add New Staff'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <form id="staff-form" onSubmit={handleSubmit} className="space-y-6 pb-64">
            
                        {/* Profile Avatar Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">Profile Avatar</label>
              <div className="flex items-center gap-4">
                <img src={getAvatarUrl(formData.avatarUrl)} alt="Selected Avatar" className="w-16 h-16 rounded-full bg-[#151515] border border-white/[0.08] object-cover" />
                <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 pt-1 flex gap-2">
                  {[
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=James",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Mary",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Robert",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Patricia",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=John",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Jennifer",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Michael",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Linda",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=David",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Elizabeth",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=William",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Barbara",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Richard",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Susan",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Joseph",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Jessica",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Thomas",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Sarah",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Charles",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Karen",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Christopher",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Lisa",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Daniel",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Nancy",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Matthew",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Betty",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Anthony",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Margaret",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Mark",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Sandra",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Donald",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Ashley",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Steven",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Kimberly",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Paul",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Emily",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Andrew",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Donna",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Joshua",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Michelle",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Kenneth",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Carol",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Kevin",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Amanda",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Brian",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Melissa",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=George",
                    "https://api.dicebear.com/9.x/pixel-art/svg?seed=Deborah",
                    "https://api.dicebear.com/9.x/big-ears/svg?seed=Edward",
                    "https://api.dicebear.com/9.x/adventurer/svg?seed=Stephanie"
                  ].map(url => {
                    return (
                      <img 
                        key={url} 
                        src={url} 
                        alt="avatar option"
                        className={`w-12 h-12 rounded-full cursor-pointer shrink-0 transition-all object-cover ${formData.avatarUrl === url ? 'ring-2 ring-brand-blue scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                        onClick={() => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 gap-4 pb-2">
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {formData.role === 'STAFF' && (
                <div className="md:col-span-2 pt-1 pb-3 flex items-center">
                  <input
                    type="checkbox"
                    id="canSwitchAdmin"
                    name="canSwitchAdmin"
                    checked={formData.canSwitchAdmin}
                    onChange={(e) => setFormData(prev => ({ ...prev, canSwitchAdmin: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/[0.08] bg-black/40 text-brand-blue focus:ring-brand-blue"
                  />
                  <label htmlFor="canSwitchAdmin" className="ml-2 block text-[13px] text-zinc-300">
                    Allow switching to Admin portal
                  </label>
                </div>
              )}
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
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Email *</label>
                <input type="email" required name="email" value={formData.email} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
              </div>
              {!staff && (
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Password *</label>
                  <input type="password" required name="password" value={formData.password} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Phone *</label>
                <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Date of Birth</label>
                <CustomDatePicker align="right" position="bottom" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Address</label>
              <input name="address" value={formData.address} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="123 Example St, Suburb, State, 1234" />
            </div>

            <div className="pt-4 border-t border-white/[0.08]">
              <h3 className="text-md font-medium text-white mb-4">Emergency Contact (optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Name</label>
                  <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Phone</label>
                  <input name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08]">
              <h3 className="text-md font-medium text-white mb-4">Financial & Tax (optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Bank Name</label>
                  <input name="bankName" value={formData.bankName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="e.g. CommBank" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">BSB</label>
                  <input name="bankBsb" value={formData.bankBsb} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="xxx-xxx" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Number</label>
                  <input name="bankAcc" value={formData.bankAcc} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="xxxxxxxx" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Tax File Number</label>
                  <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                </div>
                <div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Fund Name</label>
                  <input name="superFundName" value={formData.superFundName} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="Fund Name" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Member Number</label>
                  <input name="superMemberNumber" value={formData.superMemberNumber} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="Member Number" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-white/[0.08] flex justify-end space-x-3 bg-[#121214]/50">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" form="staff-form" className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors">
            {staff ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}
