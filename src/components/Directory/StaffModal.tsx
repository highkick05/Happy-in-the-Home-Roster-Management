import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Edit3, User, Phone, Landmark, DollarSign } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { getAvatarUrl } from '../../utils/avatar';
import AvatarSelector from '../ui/AvatarSelector';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  token: string;
  staff: any;
}

export default function StaffModal({ isOpen, onClose, onSave, token, staff }: StaffModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'personal' | 'financial' | 'payroll'>('general');
  const [positions, setPositions] = useState<any[]>([]);
  const [payItems, setPayItems] = useState<any[]>([]);
  const [xeroEmployees, setXeroEmployees] = useState<any[]>([]);
  const [loadingXero, setLoadingXero] = useState(false);
  const [xeroError, setXeroError] = useState<string>('');
  const [isManualXero, setIsManualXero] = useState(false);

  const fetchXeroEmployees = () => {
    setLoadingXero(true);
    setXeroError('');
    fetch('/api/xero/employees', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          setXeroEmployees(data.employees);
          setXeroError('');
        } else {
          setXeroEmployees(data.employees || []);
          if (data.error) {
            setXeroError(data.error);
          } else if (data.warning) {
            setXeroError(data.warning);
          } else if (!data.connected) {
            setXeroError('Xero is not connected or no employees found. If using OAuth, please ensure Payroll Employees permission is authorized in Settings > Xero.');
          }
        }
      })
      .catch(err => {
        console.error("Failed to load Xero employees", err);
        setXeroError(err.message || "Failed to load Xero employees");
      })
      .finally(() => setLoadingXero(false));
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPositions(data);
        })
        .catch(err => console.error("Failed to load positions", err));

      fetch('/api/settings/pay-items', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPayItems(data);
        })
        .catch(err => console.error("Failed to load pay items", err));

      fetchXeroEmployees();
    }
  }, [isOpen, token]);

  const parseAdditionalPositions = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'STAFF',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    dob: '',
    joinedDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bankName: '',
    bankBsb: '',
    bankAcc: '',
    taxNumber: '',
    superFundName: '',
    superMemberNumber: staff?.super_member_number || '',
    canSwitchAdmin: staff ? !!staff.can_switch_admin : false,
    primaryPosition: staff?.primary_position || '',
    additionalPositions: parseAdditionalPositions(staff?.additional_positions),
    avatarUrl: getAvatarUrl(staff?.avatar_url || Math.random().toString(36).substring(7)),
    payRateWeekdayId: staff?.pay_rate_weekday_id || '',
    payRateSaturdayId: staff?.pay_rate_saturday_id || '',
    payRateSundayId: staff?.pay_rate_sunday_id || '',
    payRatePublicHolidayId: staff?.pay_rate_public_holiday_id || '',
    payRateNdisTravelId: staff?.pay_rate_ndis_travel_id || '',
    payRateHomeCareTravelId: staff?.pay_rate_home_care_travel_id || '',
    xeroEmployeeId: staff?.xero_employee_id || '',
    xeroEmployeeName: staff?.xero_employee_name || '',
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
        joinedDate: staff.joined_date ? staff.joined_date.split('T')[0] : (staff.created_at ? new Date(staff.created_at).toISOString().split('T')[0] : ''),
        emergencyContactName: staff.emergency_contact_name || '',
        emergencyContactPhone: staff.emergency_contact_phone || '',
        bankName: staff.bank_name || '',
        bankBsb: staff.bank_bsb || '',
        bankAcc: staff.bank_acc || '',
        taxNumber: staff.tax_number || '',
        superFundName: staff.super_fund_name || '',
        superMemberNumber: staff?.super_member_number || '',
        canSwitchAdmin: !!staff.can_switch_admin,
        primaryPosition: staff.primary_position || '',
        additionalPositions: parseAdditionalPositions(staff.additional_positions),
        avatarUrl: getAvatarUrl(staff.avatar_url || staff.first_name || 'Staff'),
        payRateWeekdayId: staff.pay_rate_weekday_id || '',
        payRateSaturdayId: staff.pay_rate_saturday_id || '',
        payRateSundayId: staff.pay_rate_sunday_id || '',
        payRatePublicHolidayId: staff.pay_rate_public_holiday_id || '',
        payRateNdisTravelId: staff.pay_rate_ndis_travel_id || '',
        payRateHomeCareTravelId: staff.pay_rate_home_care_travel_id || '',
        xeroEmployeeId: staff.xero_employee_id || '',
        xeroEmployeeName: staff.xero_employee_name || '',
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
        joinedDate: new Date().toISOString().split('T')[0],
        emergencyContactName: '',
        emergencyContactPhone: '',
        bankName: '',
        bankBsb: '',
        bankAcc: '',
        taxNumber: '',
        superFundName: '',
        superMemberNumber: '',
        canSwitchAdmin: false,
        primaryPosition: '',
        additionalPositions: [],
        avatarUrl: getAvatarUrl(Math.random().toString(36).substring(7)),
        payRateWeekdayId: '',
        payRateSaturdayId: '',
        payRateSundayId: '',
        payRatePublicHolidayId: '',
        payRateNdisTravelId: '',
        payRateHomeCareTravelId: '',
        xeroEmployeeId: '',
        xeroEmployeeName: '',
      });
    }
  }, [staff, isOpen]);

  // Helper to find best matching Xero employee for this staff member
  const suggestedXeroMatch = React.useMemo(() => {
    if (!xeroEmployees.length) return null;
    const currentFirst = (formData.firstName || '').trim().toLowerCase();
    const currentLast = (formData.lastName || '').trim().toLowerCase();
    const currentFullName = `${currentFirst} ${currentLast}`.trim();
    const currentEmail = (formData.email || '').trim().toLowerCase();

    if (!currentFirst && !currentLast && !currentEmail) return null;

    // 1. Exact full name match
    let found = xeroEmployees.find(e => (e.name || '').trim().toLowerCase() === currentFullName);
    if (found) return found;

    // 2. First and last name exact match
    found = xeroEmployees.find(e => (e.firstName || '').trim().toLowerCase() === currentFirst && (e.lastName || '').trim().toLowerCase() === currentLast);
    if (found) return found;

    // 3. Email match
    if (currentEmail) {
      found = xeroEmployees.find(e => (e.email || '').trim().toLowerCase() === currentEmail);
      if (found) return found;
    }

    // 4. Contains both first and last name (handles middle names in Xero like "Andrea Marie Cerezo")
    if (currentFirst && currentLast) {
      found = xeroEmployees.find(e => {
        const xn = (e.name || '').toLowerCase();
        return xn.includes(currentFirst) && xn.includes(currentLast);
      });
      if (found) return found;
    }

    return null;
  }, [xeroEmployees, formData.firstName, formData.lastName, formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'primaryPosition') {
      setFormData(prev => ({
        ...prev,
        primaryPosition: value,
        additionalPositions: (prev.additionalPositions || []).filter(p => p !== value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || (!staff && !formData.password?.trim())) {
      setActiveTab('general');
      alert('Please fill in the required profile fields (First Name, Last Name, Email' + (!staff ? ', Password' : '') + ').');
      return;
    }
    if (!formData.phone?.trim()) {
      setActiveTab('personal');
      alert('Please enter a contact phone number in Contact & Personal.');
      return;
    }
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
        {/* Modal Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/[0.08] shrink-0 bg-[#09090b]">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">{staff ? 'Edit Staff Details' : 'Add New Staff'}</h2>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              {staff ? `Manage profile, contact info, pay items, and Xero payroll mapping.` : 'Create a new staff member profile and configure payroll settings.'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/[0.05]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.08] bg-[#0c0d10] overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'general', label: 'Profile & Role', icon: User },
            { id: 'personal', label: 'Contact & Personal', icon: Phone },
            { id: 'financial', label: 'Financial & Tax', icon: Landmark },
            {
              id: 'payroll',
              label: 'Payroll & Xero',
              icon: DollarSign,
              isLinked: !!(formData.xeroEmployeeId || formData.xeroEmployeeName),
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'payroll' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      tab.isLinked
                        ? (isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30')
                        : (isActive ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400')
                    }`}
                  >
                    {tab.isLinked ? 'Linked' : 'Not Linked'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-5">
            {/* TAB 1: Profile & Role */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <AvatarSelector
                  value={formData.avatarUrl}
                  onChange={(url) => setFormData((prev: any) => ({ ...prev, avatarUrl: url }))}
                  token={token}
                  label="Profile Avatar"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Primary Position</label>
                    <select
                      name="primaryPosition"
                      value={formData.primaryPosition}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                    >
                      <option value="">Select a position...</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Additional Positions</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {positions.filter(p => p.name !== formData.primaryPosition).map(p => (
                        <label key={p.id} className="flex items-center space-x-2 text-[12px] text-zinc-300">
                          <input 
                            type="checkbox" 
                            checked={(formData.additionalPositions || []).includes(p.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({ ...prev, additionalPositions: [...(prev.additionalPositions || []), p.name] }));
                              } else {
                                setFormData(prev => ({ ...prev, additionalPositions: (prev.additionalPositions || []).filter(name => name !== p.name) }));
                              }
                            }}
                            className="rounded bg-black/40 border-white/[0.08] text-brand-blue focus:ring-brand-blue w-3.5 h-3.5"
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.role === 'STAFF' && (
                    <div className="md:col-span-2 flex items-center pt-1">
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
              </div>
            )}

            {/* TAB 2: Contact & Personal */}
            {activeTab === 'personal' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Phone *</label>
                    <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Date of Birth</label>
                    <CustomDatePicker align="right" position="bottom" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Joined Date</label>
                    <CustomDatePicker align="right" position="bottom" name="joinedDate" value={formData.joinedDate} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="123 Example St, Suburb, State, 1234" />
                </div>

                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3">Emergency Contact (optional)</h3>
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
              </div>
            )}

            {/* TAB 3: Financial & Tax */}
            {activeTab === 'financial' && (
              <div className="space-y-5">
                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-brand-blue" />
                    <span>Bank Account Details</span>
                  </h3>
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
                </div>

                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3">Tax & Superannuation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Tax File Number (TFN)</label>
                      <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="e.g. 123 456 789" />
                    </div>
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
              </div>
            )}

            {/* TAB 4: Payroll & Xero */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/[0.02] border border-white/[0.08] rounded-lg">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Payroll &amp; Award Rates (Xero)</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Sync Ready
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Link this staff member to Xero Pay Items for automated ordinary hours, weekend penalties, and travel allowances.
                    </p>
                  </div>
                  {payItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const weekday = payItems.find(p => p.name.toLowerCase().includes('schads 2.1') && !p.name.toLowerCase().includes('sat') && !p.name.toLowerCase().includes('sun') && !p.name.toLowerCase().includes('holiday'));
                        const sat = payItems.find(p => p.name.toLowerCase().includes('schads 2.1') && p.name.toLowerCase().includes('sat'));
                        const sun = payItems.find(p => p.name.toLowerCase().includes('schads 2.1') && p.name.toLowerCase().includes('sun'));
                        const pub = payItems.find(p => p.name.toLowerCase().includes('schads 2.1') && (p.name.toLowerCase().includes('holiday') || p.name.toLowerCase().includes('public')));
                        const schadsTravel = payItems.find(p => p.name.toLowerCase().includes('vehicle') && p.name.toLowerCase().includes('schads'));
                        const timeTravel = payItems.find(p => p.name.toLowerCase().includes('time travel') || p.name.toLowerCase().includes('base rate'));

                        setFormData(prev => ({
                          ...prev,
                          payRateWeekdayId: weekday ? weekday.xero_earnings_rate_id : prev.payRateWeekdayId,
                          payRateSaturdayId: sat ? sat.xero_earnings_rate_id : prev.payRateSaturdayId,
                          payRateSundayId: sun ? sun.xero_earnings_rate_id : prev.payRateSundayId,
                          payRatePublicHolidayId: pub ? pub.xero_earnings_rate_id : prev.payRatePublicHolidayId,
                          payRateNdisTravelId: schadsTravel ? schadsTravel.xero_earnings_rate_id : (timeTravel ? timeTravel.xero_earnings_rate_id : prev.payRateNdisTravelId),
                          payRateHomeCareTravelId: schadsTravel ? schadsTravel.xero_earnings_rate_id : (timeTravel ? timeTravel.xero_earnings_rate_id : prev.payRateHomeCareTravelId),
                        }));
                      }}
                      className="px-2.5 py-1 bg-brand-teal/15 hover:bg-brand-teal/25 text-brand-teal border border-brand-teal/30 rounded text-[11px] font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                      title="Automatically apply SCHADS 2.1 Casual shift and travel pay items"
                    >
                      ⚡ Auto-Fill SCHADS 2.1 Preset
                    </button>
                  )}
                </div>

                {/* Xero Employee / Staff Name Mapping */}
                <div className="p-3 bg-black/40 border border-sky-500/25 rounded-lg space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-[12px] font-semibold text-sky-400 flex items-center gap-1.5">
                        <span>Xero Staff / Employee Profile</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          (Links rostered hours to Xero payroll)
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={loadingXero}
                        onClick={fetchXeroEmployees}
                        className="px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Sync and refresh employees from Xero"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingXero ? 'animate-spin' : ''}`} />
                        <span>{loadingXero ? 'Syncing...' : 'Sync Xero Staff'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsManualXero(!isManualXero)}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-zinc-400" />
                        <span>{isManualXero ? 'Pick from List' : 'Enter Manually'}</span>
                      </button>

                      {formData.xeroEmployeeId || formData.xeroEmployeeName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Linked: {formData.xeroEmployeeName || 'Xero Employee'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, xeroEmployeeId: '', xeroEmployeeName: '' }))}
                            className="text-[10px] text-zinc-400 hover:text-rose-400 underline cursor-pointer"
                            title="Unlink this staff member from Xero"
                          >
                            Unlink
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                          Not linked to Xero
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If Xero Error or permissions notice is present */}
                  {xeroError && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-200 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-amber-300">Xero Employee Sync Notice:</p>
                          <p className="text-zinc-300 text-[11px] break-words">{xeroError}</p>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-amber-500/20">
                        <span>To fetch employees automatically, re-authorize with Payroll permissions in Settings &gt; Xero.</span>
                        {!isManualXero && (
                          <button
                            type="button"
                            onClick={() => setIsManualXero(true)}
                            className="text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer shrink-0 ml-2"
                          >
                            Type Name Manually
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual entry inputs */}
                  {isManualXero ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Xero Employee Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="xeroEmployeeName"
                          value={formData.xeroEmployeeName}
                          onChange={(e) => setFormData(prev => ({ ...prev, xeroEmployeeName: e.target.value }))}
                          placeholder="e.g. Jane Doe (as written in Xero)"
                          className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-sky-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">
                          Xero Employee ID / GUID <span className="text-zinc-500">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          name="xeroEmployeeId"
                          value={formData.xeroEmployeeId}
                          onChange={(e) => setFormData(prev => ({ ...prev, xeroEmployeeId: e.target.value }))}
                          placeholder="e.g. 81a95b2c-... (Optional)"
                          className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-sky-400 transition-colors font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Dropdown selection */
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        name="xeroEmployeeId"
                        value={formData.xeroEmployeeId}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const matched = xeroEmployees.find(emp => emp.id === selectedId);
                          setFormData(prev => ({
                            ...prev,
                            xeroEmployeeId: selectedId,
                            xeroEmployeeName: matched ? matched.name : '',
                            ...(matched?.ordinaryEarningsRateID && !prev.payRateWeekdayId ? { payRateWeekdayId: matched.ordinaryEarningsRateID } : {})
                          }));
                        }}
                        className="w-full bg-brand-navy border border-border-subtle rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-sky-400 transition-colors"
                      >
                        <option value="">
                          {xeroEmployees.length === 0
                            ? `-- No Xero Staff Loaded (${loadingXero ? 'Syncing...' : '0 found'}) - Click 'Enter Manually' or 'Sync Xero Staff' --`
                            : `-- Choose Xero Staff Name to Link (${xeroEmployees.length} in Xero) --`}
                        </option>
                        {xeroEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.email ? `• ${emp.email}` : ''} {emp.status !== 'ACTIVE' ? `(${emp.status})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Auto-match suggestion helper banner */}
                  {!formData.xeroEmployeeId && !isManualXero && suggestedXeroMatch && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-sky-500/10 border border-sky-500/30 rounded text-[11px] text-sky-300">
                      <span className="truncate">
                        ✨ Suggested Match: <strong>{suggestedXeroMatch.name}</strong> {suggestedXeroMatch.email ? `(${suggestedXeroMatch.email})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            xeroEmployeeId: suggestedXeroMatch.id,
                            xeroEmployeeName: suggestedXeroMatch.name,
                            ...(suggestedXeroMatch.ordinaryEarningsRateID && !prev.payRateWeekdayId ? { payRateWeekdayId: suggestedXeroMatch.ordinaryEarningsRateID } : {})
                          }));
                        }}
                        className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-brand-navy font-bold rounded text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        Link Now
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Weekday Ordinary Rate</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Mon–Fri</span>
                    </label>
                    <select
                      name="payRateWeekdayId"
                      value={formData.payRateWeekdayId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-blue transition-colors"
                    >
                      <option value="">-- Select Weekday Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Saturday Penalty Rate</span>
                      <span className="text-[10px] text-zinc-500 font-mono">1.4x / Sat</span>
                    </label>
                    <select
                      name="payRateSaturdayId"
                      value={formData.payRateSaturdayId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-blue transition-colors"
                    >
                      <option value="">-- Select Saturday Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Sunday Penalty Rate</span>
                      <span className="text-[10px] text-zinc-500 font-mono">1.8x / Sun</span>
                    </label>
                    <select
                      name="payRateSundayId"
                      value={formData.payRateSundayId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-blue transition-colors"
                    >
                      <option value="">-- Select Sunday Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Public Holiday Rate</span>
                      <span className="text-[10px] text-zinc-500 font-mono">2.2x / Pub Hol</span>
                    </label>
                    <select
                      name="payRatePublicHolidayId"
                      value={formData.payRatePublicHolidayId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-blue transition-colors"
                    >
                      <option value="">-- Select Public Holiday Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Separate Travel Allowances: NDIS vs Home Care */}
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span className="text-emerald-400 font-semibold">NDIS Travel Allowance</span>
                      <span className="text-[10px] text-zinc-500">NDIS Shifts</span>
                    </label>
                    <select
                      name="payRateNdisTravelId"
                      value={formData.payRateNdisTravelId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-emerald-500/30 rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-teal transition-colors"
                    >
                      <option value="">-- Select NDIS Travel Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category} - {p.rate_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span className="text-sky-400 font-semibold">Home Care Travel Allowance</span>
                      <span className="text-[10px] text-zinc-500">HCP Shifts</span>
                    </label>
                    <select
                      name="payRateHomeCareTravelId"
                      value={formData.payRateHomeCareTravelId}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-sky-500/30 rounded-md px-3 py-2 text-[12px] text-white outline-none focus:border-brand-teal transition-colors"
                    >
                      <option value="">-- Select Home Care Travel Pay Item --</option>
                      {payItems.map(p => (
                        <option key={p.id} value={p.xero_earnings_rate_id}>
                          {p.name} ({p.category} - {p.rate_type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer with Stepper and Submit Controls */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between bg-[#121214]/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            {activeTab !== 'general' && (
              <button
                type="button"
                onClick={() => {
                  const tabKeys = ['general', 'personal', 'financial', 'payroll'] as const;
                  const idx = tabKeys.indexOf(activeTab);
                  if (idx > 0) setActiveTab(tabKeys[idx - 1]);
                }}
                className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[13px] font-medium rounded-md transition-colors cursor-pointer"
              >
                Previous
              </button>
            )}

            {activeTab !== 'payroll' ? (
              <button
                type="button"
                onClick={() => {
                  const tabKeys = ['general', 'personal', 'financial', 'payroll'] as const;
                  const idx = tabKeys.indexOf(activeTab);
                  if (idx < tabKeys.length - 1) setActiveTab(tabKeys[idx + 1]);
                }}
                className="px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-white text-[13px] font-medium rounded-md transition-colors cursor-pointer"
              >
                Next Step →
              </button>
            ) : null}

            <button
              type="submit"
              form="staff-form"
              className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors shadow-sm cursor-pointer"
            >
              {staff ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
