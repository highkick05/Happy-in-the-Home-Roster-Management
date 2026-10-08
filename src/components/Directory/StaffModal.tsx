import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Edit3, User, Phone, Landmark, DollarSign, Zap } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'personal' | 'financial'>('general');
  const [positions, setPositions] = useState<any[]>([]);
  const [payCategories, setPayCategories] = useState<any[]>([]);
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

      fetch('/api/pay-categories', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPayCategories(data);
        })
        .catch(err => console.error("Failed to load pay categories", err));

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
    payCategoryId: staff?.pay_category_id ? Number(staff.pay_category_id) : null,
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
        payCategoryId: staff.pay_category_id ? Number(staff.pay_category_id) : null,
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
        payCategoryId: null,
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
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl w-[96vw] max-w-5xl xl:max-w-6xl flex flex-col max-h-[92vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#09090b]">
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
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-white/[0.08] bg-[#0c0d10] overflow-x-auto shrink-0 custom-scrollbar">
          {[
            { id: 'general', label: 'Profile & Role', icon: User },
            { id: 'personal', label: 'Contact & Personal', icon: Phone },
            { id: 'financial', label: 'Financial & Tax', icon: Landmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-5">
            {/* TAB 1: Profile & Role */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Avatar & Roles */}
                <div className="lg:col-span-5 space-y-4">
                  <AvatarSelector
                    value={formData.avatarUrl}
                    onChange={(url) => setFormData((prev: any) => ({ ...prev, avatarUrl: url }))}
                    token={token}
                    label="Profile Avatar"
                  />

                  <div className="p-4 bg-black/40 border border-white/[0.08] rounded-xl space-y-3.5">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                      >
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Primary Position &amp; Classification *</label>
                      <select
                        name="primaryPosition"
                        value={formData.primaryPosition}
                        onChange={handleChange}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                      >
                        <option value="">Select a job classification...</option>
                        {positions.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
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
                              className="rounded bg-[#121214] border-white/[0.08] text-brand-blue focus:ring-brand-blue w-3.5 h-3.5"
                            />
                            <span className="truncate">{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Xero Employee Profile Mapping (Simplified, clean) */}
                    <div className="p-3 bg-black/50 border border-sky-500/20 rounded-lg space-y-2.5 mt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <label className="text-[12px] font-semibold text-sky-400 flex items-center gap-1.5">
                          <span>Xero Payroll Profile</span>
                          <span className="text-[10px] text-zinc-400 font-normal">(For timesheets &amp; payslips)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={loadingXero}
                            onClick={fetchXeroEmployees}
                            className="px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingXero ? 'animate-spin' : ''}`} />
                            <span>{loadingXero ? 'Syncing...' : 'Sync Xero'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsManualXero(!isManualXero)}
                            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            <span>{isManualXero ? 'List' : 'Manual'}</span>
                          </button>
                        </div>
                      </div>

                      {formData.xeroEmployeeId || formData.xeroEmployeeName ? (
                        <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            <span className="text-zinc-400 text-[11px]">Linked Employee:</span>
                            <span className="font-semibold text-white">{formData.xeroEmployeeName || 'Linked'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, xeroEmployeeId: '', xeroEmployeeName: '' }))}
                            className="text-[11px] text-zinc-400 hover:text-rose-400 underline cursor-pointer"
                          >
                            Unlink
                          </button>
                        </div>
                      ) : isManualXero ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Type exact Xero employee name..."
                            value={formData.xeroEmployeeName}
                            onChange={(e) => setFormData(prev => ({ ...prev, xeroEmployeeName: e.target.value }))}
                            className="flex-1 bg-[#121214] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue"
                          />
                        </div>
                      ) : (
                        <select
                          value={formData.xeroEmployeeId || ''}
                          onChange={(e) => {
                            const emp = xeroEmployees.find(x => x.id === e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              xeroEmployeeId: e.target.value,
                              xeroEmployeeName: emp ? emp.name : prev.xeroEmployeeName
                            }));
                          }}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-brand-blue"
                        >
                          <option value="">
                            {xeroEmployees.length === 0
                              ? `-- No Xero Staff Loaded (Click 'Sync Xero') --`
                              : `-- Select Xero Staff Profile (${xeroEmployees.length} found) --`}
                          </option>
                          {xeroEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {emp.email ? `(${emp.email})` : ''}
                            </option>
                          ))}
                        </select>
                      )}

                      {!formData.xeroEmployeeId && !isManualXero && suggestedXeroMatch && (
                        <div className="flex items-center justify-between gap-2 p-1.5 bg-sky-500/10 border border-sky-500/30 rounded text-[11px] text-sky-300">
                          <span className="truncate">
                            ✨ Suggested: <strong>{suggestedXeroMatch.name}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                xeroEmployeeId: suggestedXeroMatch.id,
                                xeroEmployeeName: suggestedXeroMatch.name,
                              }));
                            }}
                            className="px-2 py-0.5 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded text-[10px] shrink-0"
                          >
                            Link
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pay Category Selector */}
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Award Pay Category</label>
                      <select
                        name="payCategoryId"
                        value={formData.payCategoryId || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, payCategoryId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors cursor-pointer"
                      >
                        <option value="">-- No Pay Category (Inherit Default) --</option>
                        {payCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Determines ordinary weekday pay rate and weekend / holiday penalty multipliers pushed to Xero.
                      </p>
                    </div>

                    {formData.role === 'STAFF' && (
                      <div className="flex items-center pt-2 border-t border-white/[0.06]">
                        <input
                          type="checkbox"
                          id="canSwitchAdmin"
                          name="canSwitchAdmin"
                          checked={formData.canSwitchAdmin}
                          onChange={(e) => setFormData(prev => ({ ...prev, canSwitchAdmin: e.target.checked }))}
                          className="w-4 h-4 rounded border-white/[0.08] bg-[#121214] text-brand-blue focus:ring-brand-blue"
                        />
                        <label htmlFor="canSwitchAdmin" className="ml-2 block text-[13px] text-zinc-300">
                          Allow switching to Admin portal
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Name, Email & Password */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-5 bg-black/40 border border-white/[0.08] rounded-xl space-y-4">
                    <h3 className="text-sm font-semibold text-white tracking-tight pb-1 border-b border-white/[0.06]">Staff Identity &amp; Credentials</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">First Name *</label>
                        <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Last Name *</label>
                        <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={staff ? 'sm:col-span-2' : ''}>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Email *</label>
                        <input type="email" required name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                      </div>
                      {!staff && (
                        <div>
                          <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Password *</label>
                          <input type="password" required name="password" value={formData.password} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
                        </div>
                      )}
                    </div>
                  </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Tax File Number (TFN)</label>
                      <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="e.g. 123 456 789" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Fund Name</label>
                      <input name="superFundName" value={formData.superFundName} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="Fund Name" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Member Number</label>
                      <input name="superMemberNumber" value={formData.superMemberNumber} onChange={handleChange} className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" placeholder="Member Number" />
                    </div>
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
                  const tabKeys = ['general', 'personal', 'financial'] as const;
                  const idx = tabKeys.indexOf(activeTab);
                  if (idx > 0) setActiveTab(tabKeys[idx - 1]);
                }}
                className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[13px] font-medium rounded-md transition-colors cursor-pointer"
              >
                Previous
              </button>
            )}

            {activeTab !== 'financial' ? (
              <button
                type="button"
                onClick={() => {
                  const tabKeys = ['general', 'personal', 'financial'] as const;
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
