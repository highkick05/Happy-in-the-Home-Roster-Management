import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  User,
  Phone,
  Landmark,
  DollarSign,
  FileText,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Ban,
  CheckCircle,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Users,
  Layers,
  ExternalLink,
  Loader2
} from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import AvatarSelector from '../ui/AvatarSelector';
import EmploymentContractModal from './EmploymentContractModal';
import { getAvatarUrl } from '../../utils/avatar';

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

export default function StaffDashboardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'personal' | 'financial' | 'xero' | 'all'>('general');
  const [positions, setPositions] = useState<any[]>([]);
  const [payCategories, setPayCategories] = useState<any[]>([]);
  const [payItems, setPayItems] = useState<any[]>([]);
  const [xeroEmployees, setXeroEmployees] = useState<any[]>([]);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [loadingXero, setLoadingXero] = useState(false);
  const [xeroError, setXeroError] = useState<string>('');
  const [isManualXero, setIsManualXero] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
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
    superMemberNumber: '',
    canSwitchAdmin: false,
    primaryPosition: '',
    additionalPositions: [] as string[],
    avatarUrl: '',
    payRateWeekdayId: '',
    payRateSaturdayId: '',
    payRateSundayId: '',
    payRatePublicHolidayId: '',
    payRateNdisTravelId: '',
    payRateHomeCareTravelId: '',
    payCategoryId: null as number | null,
    xeroEmployeeId: '',
    xeroEmployeeName: '',
    isExternal: false,
    externalProvider: 'Mable',
  });

  const fetchXeroEmployees = () => {
    if (!token) return;
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
        console.error('Failed to load Xero employees', err);
        setXeroError(err.message || 'Failed to load Xero employees');
      })
      .finally(() => setLoadingXero(false));
  };

  const fetchStaffAndMetadata = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [staffRes, posRes, catRes, itemsRes, clientsRes] = await Promise.all([
        fetch('/api/staff?t=' + Date.now(), { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/pay-categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/settings/pay-items', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/clients?t=' + Date.now(), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (posRes.ok) {
        const posData = await posRes.json();
        if (Array.isArray(posData)) {
          const hasCareCoord = posData.some((p: any) => p.name === 'Care Coordinator');
          setPositions(hasCareCoord ? posData : [...posData, { id: 9999, name: 'Care Coordinator' }]);
        }
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData)) setPayCategories(catData);
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        if (Array.isArray(itemsData)) setPayItems(itemsData);
      }

      let foundStaff: any = null;
      if (staffRes.ok) {
        const staffList = await staffRes.json();
        if (Array.isArray(staffList)) {
          foundStaff = staffList.find((s: any) => String(s.id) === String(id));
        }
      }

      if (clientsRes.ok) {
        const clientsList = await clientsRes.json();
        if (Array.isArray(clientsList)) {
          setAssignedClients(
            clientsList.filter((c: any) => c.status !== 'SUSPENDED' && String(c.care_coordinator_id || '') === String(id))
          );
        }
      }

      if (foundStaff) {
        setStaff(foundStaff);
        const rawEmail = foundStaff.email || '';
        const cleanEmail = rawEmail.endsWith('@external.local') ? '' : rawEmail;
        setFormData({
          email: cleanEmail,
          role: foundStaff.role || 'STAFF',
          firstName: foundStaff.first_name || '',
          lastName: foundStaff.last_name || '',
          phone: foundStaff.phone || '',
          address: foundStaff.address || '',
          dob: foundStaff.dob || '',
          joinedDate: foundStaff.joined_date
            ? foundStaff.joined_date.split('T')[0]
            : foundStaff.created_at
              ? new Date(foundStaff.created_at).toISOString().split('T')[0]
              : '',
          emergencyContactName: foundStaff.emergency_contact_name || '',
          emergencyContactPhone: foundStaff.emergency_contact_phone || '',
          bankName: foundStaff.bank_name || '',
          bankBsb: foundStaff.bank_bsb || '',
          bankAcc: foundStaff.bank_acc || '',
          taxNumber: foundStaff.tax_number || '',
          superFundName: foundStaff.super_fund_name || '',
          superMemberNumber: foundStaff.super_member_number || '',
          canSwitchAdmin: !!foundStaff.can_switch_admin,
          primaryPosition: foundStaff.primary_position || '',
          additionalPositions: parseAdditionalPositions(foundStaff.additional_positions),
          avatarUrl: getAvatarUrl(foundStaff.avatar_url || foundStaff.first_name || 'Staff'),
          payRateWeekdayId: foundStaff.pay_rate_weekday_id || '',
          payRateSaturdayId: foundStaff.pay_rate_saturday_id || '',
          payRateSundayId: foundStaff.pay_rate_sunday_id || '',
          payRatePublicHolidayId: foundStaff.pay_rate_public_holiday_id || '',
          payRateNdisTravelId: foundStaff.pay_rate_ndis_travel_id || '',
          payRateHomeCareTravelId: foundStaff.pay_rate_home_care_travel_id || '',
          payCategoryId: foundStaff.pay_category_id ? Number(foundStaff.pay_category_id) : null,
          xeroEmployeeId: foundStaff.xero_employee_id || '',
          xeroEmployeeName: foundStaff.xero_employee_name || '',
          isExternal: !!foundStaff.is_external,
          externalProvider: foundStaff.external_provider || 'Mable',
        });
      }
    } catch (err) {
      console.error('Error loading staff dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndMetadata();
    fetchXeroEmployees();
  }, [id, token]);

  const suggestedXeroMatch = useMemo(() => {
    if (!xeroEmployees.length) return null;
    const currentFirst = (formData.firstName || '').trim().toLowerCase();
    const currentLast = (formData.lastName || '').trim().toLowerCase();
    const currentFullName = `${currentFirst} ${currentLast}`.trim();
    const currentEmail = (formData.email || '').trim().toLowerCase();

    if (!currentFirst && !currentLast && !currentEmail) return null;

    let found = xeroEmployees.find(e => (e.name || '').trim().toLowerCase() === currentFullName);
    if (found) return found;

    found = xeroEmployees.find(
      e =>
        (e.firstName || '').trim().toLowerCase() === currentFirst &&
        (e.lastName || '').trim().toLowerCase() === currentLast
    );
    if (found) return found;

    if (currentEmail) {
      found = xeroEmployees.find(e => (e.email || '').trim().toLowerCase() === currentEmail);
      if (found) return found;
    }

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveMessage(null);

    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setActiveTab('general');
      setSaveMessage({
        type: 'error',
        text: 'Please fill in the required profile fields (First Name, Last Name).'
      });
      return;
    }
    if (!formData.isExternal && !formData.email?.trim()) {
      setActiveTab('general');
      setSaveMessage({
        type: 'error',
        text: 'Please fill in the required Email address for internal staff.'
      });
      return;
    }
    if (!formData.isExternal && !formData.phone?.trim()) {
      setActiveTab('personal');
      setSaveMessage({
        type: 'error',
        text: 'Please enter a contact phone number in Contact & Personal.'
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setStaff((prev: any) => ({
          ...prev,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
          dob: formData.dob,
          joined_date: formData.joinedDate,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          bank_name: formData.bankName,
          bank_bsb: formData.bankBsb,
          bank_acc: formData.bankAcc,
          tax_number: formData.taxNumber,
          super_fund_name: formData.superFundName,
          super_member_number: formData.superMemberNumber,
          can_switch_admin: formData.canSwitchAdmin,
          primary_position: formData.primaryPosition,
          additional_positions: formData.additionalPositions,
          avatar_url: formData.avatarUrl,
          pay_category_id: formData.payCategoryId,
          xero_employee_id: formData.xeroEmployeeId,
          xero_employee_name: formData.xeroEmployeeName,
          is_external: formData.isExternal ? 1 : 0,
          external_provider: formData.externalProvider || 'Mable',
        }));
        setSaveMessage({ type: 'success', text: 'Staff profile changes saved successfully.' });
        setTimeout(() => {
          setSaveMessage(prev => (prev?.type === 'success' ? null : prev));
        }, 3500);
      } else {
        const err = await res.json();
        setSaveMessage({ type: 'error', text: err.error || 'Failed to save staff details.' });
      }
    } catch (err) {
      console.error(err);
      setSaveMessage({ type: 'error', text: 'Network error while saving staff profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!staff) return;
    const currentStatus = staff.status || 'ACTIVE';
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    try {
      const res = await fetch(`/api/staff/${staff.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStaff((prev: any) => ({ ...prev, status: newStatus }));
        setSaveMessage({
          type: 'success',
          text: `Staff member ${newStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'} successfully.`
        });
        setTimeout(() => {
          setSaveMessage(prev => (prev?.type === 'success' ? null : prev));
        }, 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-4 text-zinc-400">You do not have permission to view this page.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8B949E] text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-brand-teal" />
        <span>Loading staff dashboard...</span>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 bg-brand-navy border border-border-subtle rounded-xl text-center space-y-3">
        <p className="text-sm text-[#8B949E]">Staff member not found.</p>
        <button
          onClick={() => navigate('/staff', { replace: true })}
          className="px-3 py-1.5 bg-brand-teal/15 text-brand-teal border border-brand-teal/30 rounded-md text-xs font-medium hover:bg-brand-teal/25 transition-colors cursor-pointer"
        >
          Back to Staff Directory
        </button>
      </div>
    );
  }

  const isCareCoordinator =
    formData.primaryPosition === 'Care Coordinator' ||
    (formData.additionalPositions || []).includes('Care Coordinator');

  const selectedPayCategory = payCategories.find(c => Number(c.id) === Number(formData.payCategoryId));
  const initials = `${(formData.firstName || '').charAt(0)}${(formData.lastName || '').charAt(0)}`.toUpperCase();

  const showGeneral = activeTab === 'general' || activeTab === 'all';
  const showPersonal = activeTab === 'personal' || activeTab === 'all';
  const showFinancial = !formData.isExternal && (activeTab === 'financial' || activeTab === 'all');
  const showXero = !formData.isExternal && (activeTab === 'xero' || activeTab === 'all');

  return (
    <div className="w-full flex flex-col h-full space-y-3">
      {/* Top Header matching ClientDashboardView */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/staff', { replace: true })}
            className="p-1.5 -ml-1 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.05] cursor-pointer"
            title="Back to Staff Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {formData.avatarUrl ? (
            <img
              src={getAvatarUrl(formData.avatarUrl)}
              alt={formData.firstName}
              className="w-10 h-10 rounded-full border border-white/[0.1] bg-[#151515] shrink-0 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal flex items-center justify-center text-sm font-semibold shrink-0">
              {initials || '?'}
            </div>
          )}

          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#E6EDF3] tracking-tight leading-tight flex items-center gap-2 flex-wrap">
              <span>
                {formData.firstName} {formData.lastName}
              </span>
              {formData.isExternal ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border bg-amber-500/15 text-amber-300 border-amber-500/30">
                  EXTERNAL • {formData.externalProvider || 'Mable'}
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${
                    formData.role === 'ADMIN'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : 'bg-brand-teal/10 text-brand-teal border-brand-teal/25'
                  }`}
                >
                  {formData.role}
                </span>
              )}
              {formData.primaryPosition && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                  {formData.primaryPosition}
                </span>
              )}
              {isCareCoordinator && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  Care Coordinator
                </span>
              )}
              {staff.status === 'SUSPENDED' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                  Suspended
                </span>
              )}
            </h2>

            <div className="flex items-center text-xs text-[#8B949E] space-x-2 mt-0.5 flex-wrap">
              <span>
                {formData.email
                  ? formData.email
                  : formData.isExternal
                    ? `Roster-Only Profile (${formData.externalProvider || 'Mable'})`
                    : 'No email'}
              </span>
              {formData.phone && (
                <>
                  <span>•</span>
                  <span>{formData.phone}</span>
                </>
              )}
              {!formData.isExternal && selectedPayCategory && (
                <>
                  <span>•</span>
                  <span className="text-brand-teal font-medium">{selectedPayCategory.name}</span>
                </>
              )}
              {formData.joinedDate && (
                <>
                  <span>•</span>
                  <span>Joined {new Date(formData.joinedDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Action Shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!formData.isExternal && (
            <button
              type="button"
              onClick={() => setIsContractModalOpen(true)}
              className="px-2.5 py-1.5 min-h-[32px] bg-brand-navy border border-border-subtle hover:border-emerald-400/60 text-[#8B949E] hover:text-[#E6EDF3] rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
              title="Generate Employment Contract"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Employment Contract</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-2.5 py-1.5 min-h-[32px] bg-brand-navy border rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer ${
              staff.status === 'SUSPENDED'
                ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                : 'border-border-subtle hover:border-red-400/60 text-[#8B949E] hover:text-red-400'
            }`}
            title={staff.status === 'SUSPENDED' ? 'Unsuspend Staff Member' : 'Suspend Staff Member'}
          >
            {staff.status === 'SUSPENDED' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reactivate</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5 text-red-400" />
                <span>Suspend</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="px-3.5 py-1.5 min-h-[32px] bg-brand-blue hover:bg-brand-teal text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveMessage && (
        <div
          className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between shrink-0 ${
            saveMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{saveMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-6 space-y-3 custom-scrollbar">
        {/* Quick Overview Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-brand-navy border border-border-subtle rounded-lg px-3.5 py-2.5">
            <span className="block text-[10px] text-[#8B949E] uppercase font-semibold tracking-wider">
              Role &amp; Classification
            </span>
            <div className="text-xs sm:text-sm font-semibold text-[#E6EDF3] mt-1 truncate">
              {formData.primaryPosition || (formData.role === 'ADMIN' ? 'Administrator' : 'Support Worker')}
            </div>
            <span className="text-[11px] text-[#8B949E] mt-0.5 block truncate">
              {formData.additionalPositions?.length
                ? `+${formData.additionalPositions.length} additional: ${formData.additionalPositions.join(', ')}`
                : `Portal Role: ${formData.role}`}
            </span>
          </div>

          <div className="bg-brand-navy border border-border-subtle rounded-lg px-3.5 py-2.5">
            <span className="block text-[10px] text-[#8B949E] uppercase font-semibold tracking-wider">
              {formData.isExternal ? 'External Platform / Agency' : 'Award Pay Category'}
            </span>
            <div className={`text-xs sm:text-sm font-semibold mt-1 truncate ${formData.isExternal ? 'text-amber-300' : 'text-brand-teal'}`}>
              {formData.isExternal
                ? `${formData.externalProvider || 'Mable'} (Roster-Only)`
                : selectedPayCategory
                  ? selectedPayCategory.name
                  : 'Default / Unassigned'}
            </div>
            <span className="text-[11px] text-[#8B949E] mt-0.5 block truncate">
              {formData.isExternal ? 'Client Invoicing Active' : 'SCHADS / Fair Work Classification'}
            </span>
          </div>

          <div className="bg-brand-navy border border-border-subtle rounded-lg px-3.5 py-2.5">
            <span className="block text-[10px] text-[#8B949E] uppercase font-semibold tracking-wider">
              {formData.isExternal ? 'Payroll & Travel Rules' : 'Xero Payroll Status'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  formData.isExternal
                    ? 'bg-amber-400'
                    : formData.xeroEmployeeId || formData.xeroEmployeeName
                      ? 'bg-sky-400'
                      : 'bg-zinc-600'
                }`}
              />
              <span className="text-xs sm:text-sm font-semibold text-[#E6EDF3] truncate">
                {formData.isExternal
                  ? 'Excluded from Xero & Travel'
                  : formData.xeroEmployeeName || (formData.xeroEmployeeId ? 'Linked to Xero' : 'Not Linked')}
              </span>
            </div>
            <span className="text-[11px] text-[#8B949E] mt-0.5 block truncate">
              {formData.isExternal
                ? '0 km automatic travel • Billed externally'
                : formData.xeroEmployeeId || formData.xeroEmployeeName
                  ? 'Timesheets & payslips ready'
                  : 'Link in Xero Payroll tab'}
            </span>
          </div>

          <div className="bg-brand-navy border border-border-subtle rounded-lg px-3.5 py-2.5">
            <span className="block text-[10px] text-[#8B949E] uppercase font-semibold tracking-wider">
              {isCareCoordinator ? 'Assigned Clients Portfolio' : 'Emergency & Banking'}
            </span>
            {isCareCoordinator ? (
              <>
                <div className="text-xs sm:text-sm font-semibold text-purple-300 mt-1 truncate">
                  {assignedClients.length} Active {assignedClients.length === 1 ? 'Client' : 'Clients'}
                </div>
                <span className="text-[11px] text-[#8B949E] mt-0.5 block truncate">
                  Care Coordinator Portfolio
                </span>
              </>
            ) : (
              <>
                <div className="text-xs sm:text-sm font-semibold text-[#E6EDF3] mt-1 truncate">
                  {formData.bankName || (formData.bankAcc ? 'Bank Configured' : 'Bank Not Set')}
                </div>
                <span className="text-[11px] text-[#8B949E] mt-0.5 block truncate">
                  Emergency: {formData.emergencyContactName || 'Not provided'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Section Navigation Bar */}
        <div className="bg-brand-navy border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border-subtle bg-[#0c0d10] overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'general', label: 'Profile & Role', icon: User },
                { id: 'personal', label: 'Contact & Personal', icon: Phone },
                ...(!formData.isExternal
                  ? [
                      { id: 'financial', label: 'Financial & Tax', icon: Landmark },
                      { id: 'xero', label: 'Xero Payroll', icon: DollarSign },
                    ]
                  : []),
                { id: 'all', label: 'All Sections', icon: Layers },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
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

            <span className="hidden md:inline text-[11px] text-[#8B949E]">
              Manage profile, contact info, pay items, and Xero payroll mapping
            </span>
          </div>

          {/* Form Content */}
          <form id="staff-dashboard-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            {/* SECTION 1: Profile & Role */}
            {showGeneral && (
              <div className="space-y-4">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
                    <User className="w-4 h-4 text-brand-blue" />
                    <h3 className="text-sm font-semibold text-white">Profile &amp; Role</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Avatar & Roles */}
                  <div className="lg:col-span-5 space-y-4">
                    <AvatarSelector
                      value={formData.avatarUrl}
                      onChange={url => setFormData(prev => ({ ...prev, avatarUrl: url }))}
                      token={token!}
                      label="Profile Avatar"
                    />

                    <div className="p-4 bg-black/40 border border-white/[0.08] rounded-xl space-y-3.5">
                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Staff Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, isExternal: false }))}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                              !formData.isExternal
                                ? 'bg-brand-blue/15 border-brand-blue text-white shadow-xs'
                                : 'bg-[#121214] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="font-semibold">Internal Employee</div>
                            <div className="text-[10px] opacity-75 mt-0.5">Payroll, Travel &amp; App Login</div>
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
                              }))
                            }
                            className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                              formData.isExternal
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-xs'
                                : 'bg-[#121214] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="font-semibold">External Worker</div>
                            <div className="text-[10px] opacity-75 mt-0.5">Mable / Roster-Only</div>
                          </button>
                        </div>
                      </div>

                      {formData.isExternal && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg space-y-2">
                          <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                            External Platform / Agency Name
                          </label>
                          <input
                            type="text"
                            name="externalProvider"
                            value={formData.externalProvider}
                            onChange={handleChange}
                            placeholder="e.g. Mable, Hireup, Agency..."
                            className="w-full bg-[#121214] border border-amber-500/30 rounded-md px-3 py-1.5 text-[13px] text-white outline-none focus:border-amber-400 transition-colors"
                          />
                          <div className="flex items-center gap-1.5 pt-0.5">
                            {['Mable', 'Hireup', 'Agency'].map(preset => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, externalProvider: preset }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                                  formData.externalProvider === preset
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                                    : 'bg-black/40 border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-amber-200/80 leading-relaxed pt-1">
                            Roster-Only Mode: Appears on Roster, Client Invoices (both NDIS &amp; Home Care / Trilogy Care), and Trilogy Care Planning. Excluded from automatic Travel Calculations and Xero Pay Runs.
                          </p>
                        </div>
                      )}

                      {!formData.isExternal && (
                        <div>
                          <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Role *</label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                          >
                            <option value="STAFF">Staff</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          Primary Position &amp; Classification *
                        </label>
                        <select
                          name="primaryPosition"
                          value={formData.primaryPosition}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              primaryPosition: val,
                              additionalPositions: (prev.additionalPositions || []).filter(p => p !== val),
                              canSwitchAdmin: val === 'Care Coordinator' ? true : prev.canSwitchAdmin,
                            }));
                          }}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                        >
                          <option value="">Select a job classification...</option>
                          {positions.map(p => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Additional Positions</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {positions
                            .filter(p => p.name !== formData.primaryPosition)
                            .map(p => (
                              <label
                                key={p.id}
                                className="flex items-center space-x-2 text-[12px] text-zinc-300 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={(formData.additionalPositions || []).includes(p.name)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        additionalPositions: [...(prev.additionalPositions || []), p.name],
                                        canSwitchAdmin: p.name === 'Care Coordinator' ? true : prev.canSwitchAdmin,
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        additionalPositions: (prev.additionalPositions || []).filter(
                                          name => name !== p.name
                                        ),
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
                              onChange={e => setFormData(prev => ({ ...prev, canSwitchAdmin: e.target.checked }))}
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

                  {/* Right Column: Name, Email & Assigned Clients */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-5 bg-black/40 border border-white/[0.08] rounded-xl space-y-4">
                      <h3 className="text-sm font-semibold text-white tracking-tight pb-1 border-b border-white/[0.06]">
                        Staff Identity &amp; Credentials
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">First Name *</label>
                          <input
                            required
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Last Name *</label>
                          <input
                            required
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                          {formData.isExternal ? 'Email (Optional for External Worker)' : 'Email *'}
                        </label>
                        <input
                          type="email"
                          required={!formData.isExternal}
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={formData.isExternal ? 'Not required for Roster-Only external workers' : ''}
                          className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        />
                      </div>
                    </div>

                    {/* If Care Coordinator or has assigned clients, show Assigned Clients Portfolio Card */}
                    {(isCareCoordinator || assignedClients.length > 0) && (
                      <div className="p-5 bg-black/40 border border-purple-500/25 rounded-xl space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            <h3 className="text-sm font-semibold text-white">
                              Care Coordinator Client Portfolio ({assignedClients.length})
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Clients Directory</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {assignedClients.length === 0 ? (
                          <p className="text-xs text-zinc-400">
                            No active clients are currently assigned to {formData.firstName} as Care Coordinator.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                            {assignedClients.map(c => (
                              <div
                                key={c.id}
                                onClick={() => navigate(`/clients/${c.id}`)}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-[#121214] border border-white/[0.06] hover:border-purple-400/40 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={getAvatarUrl(c.avatar_url || c.first_name || 'Client')}
                                    alt={c.first_name}
                                    className="w-7 h-7 rounded-full object-cover border border-white/[0.08] shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-[#E6EDF3] truncate">
                                      {c.first_name} {c.last_name}
                                    </div>
                                    <div className="text-[10px] text-[#8B949E] truncate">
                                      {c.funding_type === 'HOME_CARE' || c.funding_type === 'Home Care' || c.funding_type === 'HCP'
                                        ? 'Home Care'
                                        : 'NDIS'}
                                      {c.provider_name ? ` • ${c.provider_name}` : ''}
                                    </div>
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Contact & Personal */}
            {showPersonal && (
              <div className="space-y-5">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08] pt-2">
                    <Phone className="w-4 h-4 text-brand-blue" />
                    <h3 className="text-sm font-semibold text-white">Contact &amp; Personal</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">
                      {formData.isExternal ? 'Phone (Optional)' : 'Phone *'}
                    </label>
                    <input
                      required={!formData.isExternal}
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Date of Birth</label>
                    <CustomDatePicker
                      align="right"
                      position="bottom"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Joined Date</label>
                    <CustomDatePicker
                      align="right"
                      position="bottom"
                      name="joinedDate"
                      value={formData.joinedDate}
                      onChange={handleChange}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Address</label>
                  <input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                    placeholder="123 Example St, Suburb, State, 1234"
                  />
                </div>

                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3">Emergency Contact (optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Name</label>
                      <input
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contact Phone</label>
                      <input
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Financial & Tax */}
            {showFinancial && (
              <div className="space-y-5">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08] pt-2">
                    <Landmark className="w-4 h-4 text-brand-blue" />
                    <h3 className="text-sm font-semibold text-white">Financial &amp; Tax</h3>
                  </div>
                )}
                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-brand-blue" />
                    <span>Bank Account Details</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Bank Name</label>
                      <input
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="e.g. CommBank"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">BSB</label>
                      <input
                        name="bankBsb"
                        value={formData.bankBsb}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="xxx-xxx"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Account Number</label>
                      <input
                        name="bankAcc"
                        value={formData.bankAcc}
                        onChange={handleChange}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="xxxxxxxx"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-black/40 border border-white/[0.08] rounded-lg">
                  <h3 className="text-sm font-semibold text-white mb-3">Tax &amp; Superannuation</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Tax File Number (TFN)</label>
                      <input
                        name="taxNumber"
                        value={formData.taxNumber}
                        onChange={handleChange}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="e.g. 123 456 789"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Fund Name</label>
                      <input
                        name="superFundName"
                        value={formData.superFundName}
                        onChange={handleChange}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="Fund Name"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Super Member Number</label>
                      <input
                        name="superMemberNumber"
                        value={formData.superMemberNumber}
                        onChange={handleChange}
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600"
                        placeholder="Member Number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: Xero Payroll */}
            {showXero && (
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
                            <span className="font-semibold text-white text-[13px]">
                              {formData.xeroEmployeeName || 'Linked'}
                            </span>
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
                          onChange={e => setFormData(prev => ({ ...prev, xeroEmployeeName: e.target.value }))}
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
                          onChange={e => {
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
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            payCategoryId: e.target.value ? Number(e.target.value) : null
                          }))
                        }
                        className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors cursor-pointer"
                      >
                        <option value="">-- No Pay Category (Inherit Default) --</option>
                        {payCategories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Page Footer Controls */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/staff', { replace: true })}
                className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Back to Staff List
              </button>

              <div className="flex items-center space-x-2">
                {activeTab !== 'all' && activeTab !== 'general' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabKeys = ['general', 'personal', 'financial', 'xero'] as const;
                      const idx = tabKeys.indexOf(activeTab as any);
                      if (idx > 0) setActiveTab(tabKeys[idx - 1]);
                    }}
                    className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[13px] font-medium rounded-md transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                )}

                {activeTab !== 'all' && activeTab !== 'xero' && (
                  <button
                    type="button"
                    onClick={() => {
                      const tabKeys = ['general', 'personal', 'financial', 'xero'] as const;
                      const idx = tabKeys.indexOf(activeTab as any);
                      if (idx < tabKeys.length - 1) setActiveTab(tabKeys[idx + 1]);
                    }}
                    className="px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-white text-[13px] font-medium rounded-md transition-colors cursor-pointer"
                  >
                    Next Step →
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-[13px] font-medium rounded-md transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {isContractModalOpen && (
        <EmploymentContractModal
          staffMember={{
            ...staff,
            first_name: formData.firstName || staff.first_name,
            last_name: formData.lastName || staff.last_name,
            email: formData.email || staff.email,
            phone: formData.phone || staff.phone,
            address: formData.address || staff.address,
            primary_position: formData.primaryPosition || staff.primary_position,
            pay_category_id: formData.payCategoryId ?? staff.pay_category_id,
          }}
          onClose={() => setIsContractModalOpen(false)}
        />
      )}
    </div>
  );
}
