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
  const [activeTab, setActiveTab] = useState<'general' | 'personal' | 'financial' | 'xero'>('general');
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
          if (Array.isArray(data)) {
            const hasCareCoord = data.some((p: any) => p.name === 'Care Coordinator');
            setPositions(hasCareCoord ? data : [...data, { id: 9999, name: 'Care Coordinator' }]);
          }
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
    isExternal: Boolean(staff?.is_external),
    externalProvider: staff?.external_provider || 'Mable',
  });

  useEffect(() => {
    if (staff) {
      const rawEmail = staff.email || '';
      const cleanEmail = String(rawEmail).endsWith('@external.local') ? '' : rawEmail;
      setFormData({
        email: cleanEmail,
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
        primaryPosition: staff.primary_position || 'Support Worker',
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
        isExternal: Boolean(staff.is_external),
        externalProvider: staff.external_provider || 'Mable',
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
        primaryPosition: 'Support Worker',
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
        isExternal: false,
        externalProvider: 'Mable',
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
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setActiveTab('general');
      alert('Please enter a First Name and Last Name.');
      return;
    }
    if (!formData.isExternal) {
      if (!formData.email?.trim() || (!staff && !formData.password?.trim())) {
        setActiveTab('general');
        alert('Please fill in the required profile fields (First Name, Last Name, Email' + (!staff ? ', Password' : '') + ').');
        return;
      }
      if (!formData.phone?.trim()) {
        setActiveTab('personal');
        alert('Please enter a contact phone number in Contact & Personal.');
        return;
      }
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
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl w-[96vw] max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] flex flex-col h-[86vh] max-h-[880px] min-h-[580px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
            ...(!formData.isExternal
              ? [
                  { id: 'financial', label: 'Financial & Tax', icon: Landmark },
                  { id: 'xero', label: 'Xero Payroll', icon: DollarSign },
                ]
              : []),
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
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Staff Type *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isExternal: false }))}
                          className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer text-left ${
                            !formData.isExternal
                              ? 'bg-brand-teal/15 text-brand-teal border-brand-teal/40'
                              : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                          }`}
                        >
                          <div>Internal Employee</div>
                          <div className="text-[10px] font-normal opacity-80 mt-0.5">Portal login &amp; Xero Payroll</div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({
                              ...prev,
                              isExternal: true,
                              role: 'STAFF',
                              canSwitchAdmin: false,
                              primaryPosition: prev.primaryPosition || 'Support Worker',
                              externalProvider: prev.externalProvider || 'Mable',
                            }))
                          }
                          className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer text-left ${
                            formData.isExternal
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              : 'bg-[#121214] text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                          }`}
                        >
                          <div>External Worker</div>
                          <div className="text-[10px] font-normal opacity-80 mt-0.5">Mable / Roster-Only</div>
                        </button>
                      </div>
                    </div>

                    {formData.isExternal && (
                      <div>
                        <label className="block text-[12px] font-medium text-amber-300 mb-1.5">External Platform / Agency *</label>
                        <input
                          name="externalProvider"
                          value={formData.externalProvider}
                          onChange={handleChange}
                          placeholder="e.g. Mable, Hireup, Agency"
                          className="w-full bg-[#121214] border border-amber-500/30 rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-amber-400 transition-colors placeholder-zinc-600"
                        />
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {['Mable', 'Hireup', 'Agency'].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, externalProvider: preset }))}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                                formData.externalProvider === preset
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-zinc-200'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!formData.isExternal && (
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
                    )}

                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Primary Position &amp; Classification *</label>
                      <select
                        name="primaryPosition"
                        value={formData.primaryPosition}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            primaryPosition: val,
                            canSwitchAdmin: (!prev.isExternal && val === 'Care Coordinator') ? true : prev.canSwitchAdmin,
                          }));
                        }}
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
                          <label key={p.id} className="flex items-center space-x-2 text-[12px] text-zinc-300 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={(formData.additionalPositions || []).includes(p.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    additionalPositions: [...(prev.additionalPositions || []), p.name],
                                    canSwitchAdmin: (!prev.isExternal && p.name === 'Care Coordinator') ? true : prev.canSwitchAdmin,
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    additionalPositions: (prev.additionalPositions || []).filter(name => name !== p.name),
                                  }));
                                }
                              }}
                              className="rounded bg-[#121214] border-white/[0.08] text-brand-blue focus:ring-brand-blue w-3.5 h-3.5"
                            />
                            <span className="truncate flex items-center gap-1.5">
                              {p.name}
                              {p.name === 'Care Coordinator' && (
                                <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                                  Admin
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {!formData.isExternal && formData.role === 'STAFF' && (
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="canSwitchAdmin"
                            name="canSwitchAdmin"
                            checked={
                              formData.canSwitchAdmin ||
                              formData.primaryPosition === 'Care Coordinator' ||
                              (formData.additionalPositions || []).includes('Care Coordinator')
                            }
                            onChange={(e) => setFormData(prev => ({ ...prev, canSwitchAdmin: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/[0.08] bg-[#121214] text-brand-blue focus:ring-brand-blue"
                          />
                          <label htmlFor="canSwitchAdmin" className="ml-2 block text-[13px] text-zinc-300">
                            Allow switching to Admin portal
                          </label>
                        </div>
                        {(formData.primaryPosition === 'Care Coordinator' ||
                          (formData.additionalPositions || []).includes('Care Coordinator')) && (
                          <span className="text-[10px] text-purple-300 font-medium">
                            Auto-enabled for Care Coordinator
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Name, Email & Password */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-5 bg-black/40 border border-white/[0.08] rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <h3 className="text-sm font-semibold text-white tracking-tight">Staff Identity &amp; Credentials</h3>
                      {formData.isExternal && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Roster-Only • {formData.externalProvider || 'Mable'}
                        </span>
                      )}
                    </div>

                    {formData.isExternal && (
                      <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[12px] text-amber-200/90 leading-relaxed space-y-3">
                        <div>
                          <strong className="text-amber-200">Roster-Only External Worker:</strong> Only First Name &amp; Last Name are required.
                        </div>

                        <div className="p-2.5 rounded-md bg-black/30 border border-amber-500/20 text-[11.5px] text-amber-100/90">
                          <span className="font-semibold text-amber-300">Invoice Privacy Guarantee:</span> When client invoices are generated for completed shifts, <strong>only the staff member&apos;s First &amp; Last Name</strong> appear on the invoice (e.g. <em>&ldquo;Provided by First Last&rdquo;</em>). The <strong>External Platform / Agency</strong> name ({formData.externalProvider || 'Mable'}) is strictly for internal portal reference and is <strong>never</strong> shown on client invoices.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 rounded-md bg-emerald-500/[0.07] border border-emerald-500/20 space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                              <span>✓ Included In</span>
                            </div>
                            <ul className="space-y-1 text-[11px] text-zinc-200/90 list-disc list-inside leading-snug">
                              <li><strong className="text-white">Roster Management:</strong> NDIS, Home Care (Trilogy Care), Respite/STA, Historical shifts &amp; Roster Templates</li>
                              <li><strong className="text-white">Client Invoicing:</strong> Generates NDIS &amp; Home Care invoices and supports merged invoices (staff name only)</li>
                              <li><strong className="text-white">Progress Notes &amp; Charts:</strong> Admins can log/edit clinical notes on their shifts</li>
                              <li><strong className="text-white">Budgets &amp; Trilogy Planning:</strong> Counts toward NDIS &amp; Home Care budget utilization</li>
                              <li><strong className="text-white">Staff Directory &amp; Activity:</strong> Listed with platform badge &amp; trackable in Staff Activity hours</li>
                              <li><strong className="text-white">Compliance Matrix:</strong> Completed shifts included in NDIA/Home Care audit exports</li>
                            </ul>
                          </div>

                          <div className="p-2.5 rounded-md bg-rose-500/[0.07] border border-rose-500/20 space-y-1.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                              <span>✕ Not Included In (Excluded)</span>
                            </div>
                            <ul className="space-y-1 text-[11px] text-zinc-200/90 list-disc list-inside leading-snug">
                              <li><strong className="text-white">Portal Login &amp; Admin Access:</strong> Roster-only profile (no password or portal sign-in)</li>
                              <li><strong className="text-white">Xero Payroll &amp; Pay Runs:</strong> Excluded from Xero employee linking, SCHADS pay rates &amp; timesheets</li>
                              <li><strong className="text-white">All Travel Calculations:</strong> Excluded from Provider Travel, Home Care Travel (Client Gap), ABT &amp; route cascades ($0 / 0 km)</li>
                              <li><strong className="text-white">Live Chat &amp; Shift Broadcasts:</strong> Hidden from Live Chat &amp; excluded from Open Shift Broadcasts</li>
                              <li><strong className="text-white">Onboarding Hub &amp; Checks:</strong> Excluded from internal onboarding checklists &amp; expiry alerts</li>
                              <li><strong className="text-white">Vehicles &amp; Travel Logs:</strong> Excluded from company vehicle assignments &amp; odometer logs</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

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
                      <div className={staff || formData.isExternal ? 'sm:col-span-2' : ''}>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Email {formData.isExternal ? '(optional)' : '*'}
                        </label>
                        <input
                          type="email"
                          required={!formData.isExternal}
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={formData.isExternal ? 'Optional contact email (no login required)' : ''}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        />
                      </div>
                      {!staff && !formData.isExternal && (
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
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                      Phone {formData.isExternal ? '(optional)' : '*'}
                    </label>
                    <input required={!formData.isExternal} name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600" />
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

            {/* TAB 4: Xero Payroll */}
            {activeTab === 'xero' && (
              <div className="space-y-5">
                <div className="p-5 bg-black/40 border border-white/[0.08] rounded-xl space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight pb-1 border-b border-white/[0.06] flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-sky-400" />
                      <span>Xero Payroll Integration &amp; Pay Categories</span>
                    </h3>
                    <p className="text-[12px] text-zinc-400 mt-1">
                      Link this staff member to their Xero employee profile and award classification for seamless timesheet pushing and payslip generation.
                    </p>
                  </div>

                  {xeroError && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-xs text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">Xero Sync Notice</p>
                        <p className="text-zinc-400">{xeroError}</p>
                      </div>
                    </div>
                  )}

                  {/* Xero Employee Profile Mapping Card */}
                  <div className="p-4 bg-black/50 border border-sky-500/20 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-[13px] font-semibold text-sky-400 flex items-center gap-1.5">
                          <span>Xero Payroll Profile</span>
                          <span className="text-[11px] text-zinc-400 font-normal">(For timesheets &amp; payslips)</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Matches worked roster shifts directly to the employee in Xero Payroll AU.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={loadingXero}
                          onClick={fetchXeroEmployees}
                          className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingXero ? 'animate-spin' : ''}`} />
                          <span>{loadingXero ? 'Syncing...' : 'Sync Xero'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsManualXero(!isManualXero)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <span>{isManualXero ? 'List Selection' : 'Manual Entry'}</span>
                        </button>
                      </div>
                    </div>

                    {formData.xeroEmployeeId || formData.xeroEmployeeName ? (
                      <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 px-3.5 py-2.5 rounded-lg text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                          <div>
                            <span className="text-zinc-400 text-[11px] block">Linked Xero Employee:</span>
                            <span className="font-semibold text-white text-[13px]">{formData.xeroEmployeeName || 'Linked'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, xeroEmployeeId: '', xeroEmployeeName: '' }))}
                          className="text-[11px] text-zinc-400 hover:text-rose-400 underline cursor-pointer px-2 py-1 rounded hover:bg-white/[0.04]"
                        >
                          Unlink Profile
                        </button>
                      </div>
                    ) : isManualXero ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Type exact Xero employee name (e.g. Andrea Cerezo)..."
                          value={formData.xeroEmployeeName}
                          onChange={(e) => setFormData(prev => ({ ...prev, xeroEmployeeName: e.target.value }))}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                        />
                        <p className="text-[11px] text-zinc-500">
                          Enter the exact employee name as registered in Xero Payroll AU.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
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
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
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
                        <p className="text-[11px] text-zinc-500">
                          Select the matching staff profile synced from Xero.
                        </p>
                      </div>
                    )}

                    {!formData.xeroEmployeeId && !isManualXero && suggestedXeroMatch && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-xs text-sky-300">
                        <span className="truncate">
                          ✨ Suggested match based on name/email: <strong>{suggestedXeroMatch.name}</strong>
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
                          className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded text-[11px] shrink-0 cursor-pointer shadow-sm"
                        >
                          Link Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Award Pay Category Card */}
                  <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg space-y-2.5">
                    <div>
                      <label className="block text-[13px] font-semibold text-white mb-1">Award Pay Category</label>
                      <p className="text-[11px] text-zinc-400 mb-2">
                        Sets the Fair Work SCHADS classification (e.g. Level 2.1 Casual), base ordinary hourly rate, and Saturday, Sunday &amp; Public Holiday multipliers.
                      </p>
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
                  const tabKeys = ['general', 'personal', 'financial', 'xero'] as const;
                  const idx = tabKeys.indexOf(activeTab);
                  if (idx > 0) setActiveTab(tabKeys[idx - 1]);
                }}
                className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[13px] font-medium rounded-md transition-colors cursor-pointer"
              >
                Previous
              </button>
            )}

            {activeTab !== 'xero' ? (
              <button
                type="button"
                onClick={() => {
                  const tabKeys = ['general', 'personal', 'financial', 'xero'] as const;
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
