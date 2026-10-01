import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, Phone, Mail, FileText, Calendar, Building, Home, 
  CheckCircle2, Edit2, ClipboardEdit, Calculator, Save, X, 
  Loader2, ShieldCheck, Sparkles, TrendingUp, AlertTriangle, Layers, Clock, ArrowRight 
} from 'lucide-react';
import ClientModal from './ClientModal';
import ClientRosterModal from './ClientRosterModal';
import { getAvatarUrl } from '../../utils/avatar';
import { getFinancialYearQuarters, getCurrentFinancialYearAndQuarter } from './HomeCareBudgetView';

interface BudgetHealthState {
  loading: boolean;
  onTrack: boolean;
  fundingType: 'HOME_CARE' | 'NDIS' | 'OTHER';
  quarterOrAgreementLabel: string;
  totalAllocated: number;
  totalSpent: number;
  remainingBalance: number;
  utilizationPct: number;
  timePct: number;
  statusText: string;
  statusNote: string;
}

export default function ClientDashboardView() {
  // Helper to extract text from EditorJS JSON
  const getNotePreview = (notesStr: string) => {
    try {
      if (notesStr.startsWith('{') && notesStr.includes('"blocks"')) {
        const data = JSON.parse(notesStr);
        if (data && data.blocks) {
          const texts = data.blocks
            .filter((b: any) => b.type === 'paragraph' || b.type === 'header' || b.type === 'list')
            .map((b: any) => {
              if (b.type === 'list') {
                 return b.data.items.map((i: string) => i.replace(/<[^>]*>?/gm, '')).join(' ');
              }
              return (b.data.text || '').replace(/<[^>]*>?/gm, '');
            });
          const combined = texts.join(' ').trim();
          if (combined.length > 0) return combined;
          
          if (data.blocks.some((b: any) => b.type === 'image')) {
            return '[Image Attached]';
          }
        }
      }
    } catch (e) {
      // Ignore
    }
    // Fallback if not JSON or parsing fails
    return notesStr;
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, settings } = useAuth();
  
  const [client, setClient] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [fundingRates, setFundingRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [budgetHealth, setBudgetHealth] = useState<BudgetHealthState | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isEditingCarePlan, setIsEditingCarePlan] = useState(false);
  const [carePlanNotes, setCarePlanNotes] = useState('');
  const [isSavingCarePlan, setIsSavingCarePlan] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const handleSaveCarePlan = async () => {
    setIsSavingCarePlan(true);
    try {
      const res = await fetch(`/api/clients/${id}/care-plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ carePlanDetails: carePlanNotes })
      });
      if (res.ok) {
        setClient((prev: any) => ({ ...prev, care_plan_details: carePlanNotes }));
        setIsEditingCarePlan(false);
      } else {
        alert("Failed to save care plan notes.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCarePlan(false);
    }
  };

  const calculateBudgetHealth = async (clientData: any, ratesData: any) => {
    if (!clientData || !id || !token) return;
    try {
      if (clientData.funding_type === 'HOME_CARE') {
        const timezone = settings?.timezone || 'Australia/Perth';
        const period = getCurrentFinancialYearAndQuarter(timezone);
        const quarters = getFinancialYearQuarters(period.currentFyStartYear);
        const activeQ = quarters.find(q => q.id === period.currentQuarterId) || quarters[0];

        let actualStartDateStr = activeQ.startDateStr;
        const actualEndDateStr = activeQ.endDateStr;
        let totalDays = activeQ.totalDays;

        if (clientData.joined_date) {
          const joinedStr = clientData.joined_date.split('T')[0];
          if (joinedStr > actualEndDateStr) {
            totalDays = 0;
          } else if (joinedStr >= actualStartDateStr && joinedStr <= actualEndDateStr) {
            actualStartDateStr = joinedStr;
            const joinedDate = new Date(`${joinedStr}T00:00:00`);
            const endDate = new Date(`${actualEndDateStr}T23:59:59`);
            totalDays = Math.max(1, Math.floor((endDate.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          }
        }

        // Calculate daily rate
        const subType = clientData.home_care_sub_type || 'HCP';
        const levelOrClass = clientData.home_care_level_or_class || 'Level 1';
        let dailyRate = 30.10;
        if (subType === 'SAH') {
          const levels = ratesData?.sahFundingLevels || [];
          const match = levels.find((l: any) => l.level === levelOrClass);
          dailyRate = match ? match.amountDaily : 29.40;
        } else {
          const levels = ratesData?.hcpFundingLevels || [];
          const match = levels.find((l: any) => l.level === levelOrClass);
          dailyRate = match ? match.amountDaily : 30.10;
        }

        let additionalTotal = 0;
        try {
          const addStreams = clientData.additional_funding_streams ? JSON.parse(clientData.additional_funding_streams) : [];
          additionalTotal = addStreams.reduce((sum: number, s: any) => sum + (parseFloat(s.amount) || 0), 0);
        } catch {}

        const rolloverPool = Math.max(0, (clientData.starting_unspent_balance || 0) - (clientData.rollover_spent_so_far || 0));
        const totalAllocation = (dailyRate * totalDays) + additionalTotal + rolloverPool;

        // Fetch ledger for current active quarter
        const ledgerRes = await fetch(`/api/clients/${id}/budget-ledger?startDate=${actualStartDateStr}&endDate=${actualEndDateStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        let spent = 0;
        if (ledgerRes.ok) {
          const ledgerData = await ledgerRes.json();
          spent = Number(ledgerData.grandTotal ?? ledgerData.total ?? 0);
        }

        const remaining = totalAllocation - spent;
        const utilPct = totalAllocation > 0 ? (spent / totalAllocation) * 100 : 0;

        // Time progress in quarter
        const now = new Date();
        const startMs = new Date(`${actualStartDateStr}T00:00:00`).getTime();
        const endMs = new Date(`${actualEndDateStr}T23:59:59`).getTime();
        const curMs = Math.min(endMs, Math.max(startMs, now.getTime()));
        const timePct = endMs > startMs ? Math.min(100, Math.max(0, ((curMs - startMs) / (endMs - startMs)) * 100)) : 0;

        const diff = utilPct - timePct;
        const isHealthy = remaining >= 0 && diff <= 15;

        setBudgetHealth({
          loading: false,
          onTrack: isHealthy || remaining >= 0,
          fundingType: 'HOME_CARE',
          quarterOrAgreementLabel: `${activeQ.label} (${activeQ.displayRange})`,
          totalAllocated: totalAllocation,
          totalSpent: spent,
          remainingBalance: remaining,
          utilizationPct: utilPct,
          timePct: timePct,
          statusText: 'Budget is in Healthy Utilisation',
          statusNote: `Client funding is on track with ${formatRate(remaining)} remaining in spendable funding.`
        });
      } else {
        // NDIS
        const agrsRes = await fetch(`/api/clients/${id}/ndis-agreements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (agrsRes.ok) {
          const agrs = await agrsRes.json();
          if (agrs && agrs.length > 0) {
            const activeAgr = agrs.find((a: any) => a.status === 'ACTIVE') || agrs[0];
            const totalVal = Number(activeAgr.totalAgreementValue || 0);
            const spent = Number(activeAgr.totalCompletedSpent || activeAgr.totalClaimed || 0);
            const rem = Number(activeAgr.totalRemainingBalance ?? (totalVal - spent));
            const utilPct = totalVal > 0 ? (spent / totalVal) * 100 : 0;

            const startMs = new Date(activeAgr.startDate).getTime();
            const endMs = new Date(activeAgr.endDate).getTime();
            const nowMs = Date.now();
            const timePct = endMs > startMs ? Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100)) : 0;
            const diff = utilPct - timePct;
            const isHealthy = rem >= 0 && diff <= 15;

            setBudgetHealth({
              loading: false,
              onTrack: isHealthy || rem >= 0,
              fundingType: 'NDIS',
              quarterOrAgreementLabel: activeAgr.name,
              totalAllocated: totalVal,
              totalSpent: spent,
              remainingBalance: rem,
              utilizationPct: utilPct,
              timePct: timePct,
              statusText: 'Budget is in Healthy Utilisation',
              statusNote: `Service agreement consumption is on track with ${formatRate(rem)} available balance.`
            });
          } else {
            setBudgetHealth({
              loading: false,
              onTrack: true,
              fundingType: 'NDIS',
              quarterOrAgreementLabel: 'NDIS Care Plan',
              totalAllocated: 0,
              totalSpent: 0,
              remainingBalance: 0,
              utilizationPct: 0,
              timePct: 0,
              statusText: 'Budget Ready for Agreement Setup',
              statusNote: 'Add a service agreement to initiate automated burn and consumption tracking.'
            });
          }
        }
      }
    } catch (err) {
      console.error('Error calculating budget health:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, providersRes, servicesRes, notesRes, ratesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/providers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/progress-notes/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      let clientData: any = null;
      let ratesData: any = null;

      if (clientRes.ok) {
        clientData = await clientRes.json();
        setClient(clientData);
      }
      if (providersRes.ok) setProviders(await providersRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (notesRes.ok) {
        const _notes = await notesRes.json();
        setRecentNotes(_notes.slice(0, 3));
      }
      if (ratesRes.ok) {
        ratesData = await ratesRes.json();
        setFundingRates(ratesData);
      }

      if (clientData) {
        await calculateBudgetHealth(clientData, ratesData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSaved = () => {
    setIsEditModalOpen(false);
    fetchData();
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E] text-xs">Loading client details...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4 text-xs sm:text-sm">Client not found.</p>
        <button onClick={() => navigate('/clients', { replace: true })} className="text-brand-blue hover:underline text-xs">Return to Directory</button>
      </div>
    );
  }

  const provider = providers.find(p => p.id === client.provider_id);
  const clientServices = services.filter(s => (client.service_ids || []).includes(s.id));
  const initials = `${(client.first_name || '').charAt(0)}${(client.last_name || '').charAt(0)}`.toUpperCase();

  const getClientDailyRate = () => {
    if (!client || client.funding_type !== 'HOME_CARE') return null;
    
    const subType = client.home_care_sub_type || 'HCP';
    const levelOrClass = client.home_care_level_or_class || 'Level 1';
    
    if (subType === 'SAH') {
      const levels = fundingRates?.sahFundingLevels || [
        { level: 'Class 1', amountDaily: 29.40 },
        { level: 'Class 2', amountDaily: 43.93 },
        { level: 'Class 3', amountDaily: 60.18 },
        { level: 'Class 4', amountDaily: 81.36 },
        { level: 'Class 5', amountDaily: 108.76 },
        { level: 'Class 6', amountDaily: 131.82 },
        { level: 'Class 7', amountDaily: 159.31 },
        { level: 'Class 8', amountDaily: 213.99 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 29.40;
    } else {
      const levels = fundingRates?.hcpFundingLevels || [
        { level: 'Level 1', amountDaily: 30.10 },
        { level: 'Level 2', amountDaily: 52.93 },
        { level: 'Level 3', amountDaily: 115.22 },
        { level: 'Level 4', amountDaily: 174.68 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return match ? match.amountDaily : 30.10;
    }
  };

  const formatRate = (rate: number | null) => {
    if (rate === null || rate === undefined) return '-';
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(rate);
  };

  return (
    <div className="w-full flex flex-col h-full space-y-2.5">
      {/* Compact Header matching Budget Page styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-0.5 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => navigate('/clients', { replace: true })}
            className="p-1 -ml-1 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#E6EDF3] tracking-tight leading-tight flex items-center gap-2">
              <span>{client.first_name} {client.last_name}</span>
              {client.status === 'SUSPENDED' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
                  Suspended
                </span>
              )}
            </h2>
            <div className="flex items-center text-xs text-[#8B949E] space-x-1.5 mt-0.5">
              <span>{client.funding_type === 'HOME_CARE' ? `${client.home_care_sub_type || 'HCP'} ${client.home_care_level_or_class || 'Level 1'}` : 'NDIS'}</span>
              {client.funding_type === 'HOME_CARE' && (
                <>
                  <span>•</span>
                  <span className="text-brand-green font-medium">{formatRate(getClientDailyRate())}/day</span>
                </>
              )}
              {(() => {
                const dateVal = client.joined_date || client.created_at;
                if (!dateVal) return null;
                const d = new Date(dateVal);
                if (isNaN(d.getTime())) return null;
                return (
                  <>
                    <span>•</span>
                    <span>Joined {d.toLocaleDateString()}</span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Top Right Action Shortcuts - Compact & Uniform */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button 
            type="button"
            onClick={() => navigate(`/clients/${id}/documents`, { replace: true })}
            className="px-2.5 py-1 min-h-[30px] bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Documents"
          >
            <FileText className="w-3.5 h-3.5 text-brand-teal" />
            <span>Documents</span>
          </button>
          
          <button 
            type="button"
            onClick={() => navigate(`/clients/${id}/budget`, { replace: true })}
            className="px-2.5 py-1 min-h-[30px] bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Budget"
          >
            <Calculator className="w-3.5 h-3.5 text-brand-blue" />
            <span>Budget</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-2.5 py-1 min-h-[30px] bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Edit Profile"
          >
            <Edit2 className="w-3.5 h-3.5 text-brand-teal" />
            <span>Edit Profile</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="px-2.5 py-1 min-h-[30px] bg-brand-navy border border-border-subtle hover:border-brand-blue text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Roster Builder"
          >
            <Calendar className="w-3.5 h-3.5 text-brand-blue" />
            <span>Roster Builder</span>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/progress-notes?client=' + client.id)}
            className="px-2.5 py-1 min-h-[30px] bg-brand-navy border border-border-subtle hover:border-purple-400 text-[#8B949E] hover:text-[#E6EDF3] rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Progress Notes"
          >
            <ClipboardEdit className="w-3.5 h-3.5 text-purple-400" />
            <span>Progress Notes</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 space-y-2.5">
        
        {/* ADMIN BUDGET HEALTH & HEALTHY UTILISATION ALERT BANNER */}
        {budgetHealth && (
          <div className="bg-brand-navy border border-emerald-500/30 rounded-md p-3 shadow-xs relative overflow-hidden bg-gradient-to-r from-emerald-950/20 via-brand-navy to-brand-navy">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Side: Shield Icon, Headline, Subtext */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#E6EDF3]">
                      Budget Health: On Track
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Healthy Utilisation
                    </span>
                    <span className="text-xs text-zinc-400">
                      • {budgetHealth.quarterOrAgreementLabel}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-normal">
                    {budgetHealth.statusNote}
                  </p>
                </div>
              </div>

              {/* Right Side: Quick Action Button */}
              <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${id}/budget`)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>View Live Budget</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Metrics Chips Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-white/[0.06]">
              <div className="bg-black/30 border border-white/5 rounded px-2.5 py-1.5">
                <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Total Allocation</span>
                <span className="text-sm font-bold text-[#E6EDF3] font-mono mt-0.5 block">{formatRate(budgetHealth.totalAllocated)}</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded px-2.5 py-1.5">
                <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Total Spent</span>
                <span className="text-sm font-bold text-indigo-400 font-mono mt-0.5 block">{formatRate(budgetHealth.totalSpent)}</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded px-2.5 py-1.5">
                <span className="block text-[10px] text-zinc-400 uppercase font-semibold">Available Funds</span>
                <span className={`text-sm font-bold font-mono mt-0.5 block ${budgetHealth.remainingBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatRate(budgetHealth.remainingBalance)}
                </span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded px-2.5 py-1.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-400 uppercase font-semibold">Utilisation</span>
                  <span className="font-mono text-emerald-400 font-bold">{budgetHealth.utilizationPct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-black/50 rounded-full border border-white/5 overflow-hidden mt-1">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(3, budgetHealth.utilizationPct))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
          
          {/* Left Col - Overview Cards */}
          <div className="xl:col-span-1 space-y-2.5">
            {/* Client Profile Card */}
            <div className="bg-brand-navy border border-border-subtle rounded-md p-3.5 shadow-xs">
              <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-white/[0.06]">
                {client.avatar_url ? (
                  <img src={getAvatarUrl(client.avatar_url)} alt={`${client.first_name}`} className="w-12 h-12 rounded-full border border-white/[0.08] bg-[#151515] shrink-0 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green flex items-center justify-center text-lg font-semibold shrink-0">
                    {initials || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[#E6EDF3] truncate">{client.first_name} {client.last_name}</h3>
                  <div className="text-xs font-mono text-brand-teal mt-0.5 truncate">
                    {client.funding_type === 'HOME_CARE' ? `ID: ${client.my_aged_care_id || client.ndis_number || 'N/A'}` : `NDIS: ${client.ndis_number || 'N/A'}`}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start space-x-2.5">
                  <Mail className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3] break-all">{client.contact_email || 'No email provided'}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Phone className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3] font-mono">{client.contact_phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Home className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
                  <span className="text-[#E6EDF3] leading-relaxed">{client.address || 'No address provided'}</span>
                </div>
                {(() => {
                  if (!client.dob) return null;
                  const d = new Date(client.dob);
                  if (isNaN(d.getTime())) return null;
                  return (
                    <div className="flex items-start space-x-2.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8B949E] shrink-0 mt-0.5" />
                      <span className="text-[#E6EDF3] font-mono">DOB: {d.toLocaleDateString()}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Representative Card */}
            {(client.representative_name || client.representative_phone || client.representative_email) && (
              <div className="bg-brand-navy border border-border-subtle rounded-md p-3.5 shadow-xs">
                <h3 className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider mb-2.5">Representative</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Name</span>
                    <span className="text-[#E6EDF3] font-medium text-right">{client.representative_name || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Phone</span>
                    <span className="text-[#E6EDF3] text-right font-mono">{client.representative_phone || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-[#8B949E]">Email</span>
                    <span className="text-[#E6EDF3] text-right break-all">{client.representative_email || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle/Right Col - Details & Services */}
          <div className="xl:col-span-2 space-y-2.5">
            
            {/* Care Plan & Details Card */}
            <div className="bg-brand-navy border border-border-subtle rounded-md p-3.5 shadow-xs">
               <div className="flex items-center space-x-2 text-brand-blue mb-3 pb-2 border-b border-border-subtle">
                 <FileText className="w-4 h-4" />
                 <h3 className="text-sm font-semibold text-[#E6EDF3]">Care Plan & Details</h3>
               </div>
               
               <div className={`grid grid-cols-2 ${client.funding_type === 'HOME_CARE' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 mb-3.5`}>
                 <div className="bg-black/30 border border-white/5 rounded p-2">
                   <div className="text-[10px] text-[#8B949E] uppercase font-semibold mb-0.5">Funding Type</div>
                   <div className="text-xs font-semibold text-[#E6EDF3]">
                     {client.funding_type === 'HOME_CARE' 
                       ? `Home Care (${client.home_care_sub_type === 'SAH' ? 'SaH' : 'HCP'})` 
                       : 'NDIS'}
                   </div>
                 </div>
                 {client.funding_type === 'HOME_CARE' && (
                   <>
                     <div className="bg-black/30 border border-white/5 rounded p-2">
                       <div className="text-[10px] text-[#8B949E] uppercase font-semibold mb-0.5">
                         {client.home_care_sub_type === 'SAH' ? 'SaH Class Level' : 'HCP Subsidy Level'}
                       </div>
                       <div className="text-xs font-semibold text-[#E6EDF3]">
                         {client.home_care_level_or_class || 'Level 1'}
                       </div>
                     </div>
                     <div className="bg-black/30 border border-white/5 rounded p-2">
                       <div className="text-[10px] text-[#8B949E] uppercase font-semibold mb-0.5">Daily Funding Rate</div>
                       <div className="text-xs font-bold text-brand-green font-mono">
                         {formatRate(getClientDailyRate())} <span className="text-[10px] text-[#8B949E] font-normal font-sans">/ day</span>
                       </div>
                     </div>
                   </>
                 )}
                 <div className="bg-black/30 border border-white/5 rounded p-2">
                   <div className="text-[10px] text-[#8B949E] uppercase font-semibold mb-0.5">Provider</div>
                   <div className="text-xs font-semibold text-[#E6EDF3] flex items-center truncate">
                     <Building className="w-3 h-3 mr-1 text-[#8B949E] shrink-0" />
                     <span className="truncate">{provider ? provider.company_name : 'No Provider Assigned'}</span>
                   </div>
                 </div>
               </div>
               
               <div>
                 <div className="flex items-center justify-between mb-1.5">
                   <div className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider">Care Plan Notes</div>
                   {!isEditingCarePlan ? (
                     <button onClick={() => { setCarePlanNotes(client.care_plan_details || ''); setIsEditingCarePlan(true); }} className="text-brand-teal hover:text-white transition-colors text-xs flex items-center gap-1 cursor-pointer">
                       <Edit2 className="w-3 h-3" /> <span>Edit</span>
                     </button>
                   ) : (
                     <div className="flex items-center space-x-2">
                       <button onClick={() => setIsEditingCarePlan(false)} className="text-zinc-400 hover:text-white transition-colors text-xs flex items-center gap-1 cursor-pointer">
                         <X className="w-3 h-3" /> <span>Cancel</span>
                       </button>
                       <button onClick={handleSaveCarePlan} disabled={isSavingCarePlan} className="bg-brand-teal text-[#0d1117] hover:bg-brand-teal/90 transition-colors text-xs flex items-center gap-1 px-2 py-0.5 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                         {isSavingCarePlan ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} <span>Save</span>
                       </button>
                     </div>
                   )}
                 </div>
                 {isEditingCarePlan ? (
                   <textarea
                     value={carePlanNotes}
                     onChange={(e) => setCarePlanNotes(e.target.value)}
                     className="w-full bg-black/40 border border-brand-teal/50 rounded p-2.5 text-xs text-white outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all min-h-[90px] resize-y placeholder-zinc-600"
                     placeholder="Enter care plan details here..."
                   />
                 ) : client.care_plan_details ? (
                   <div className="text-xs text-[#E6EDF3] whitespace-pre-wrap leading-relaxed bg-black/20 p-3 rounded border border-white/[0.05]">
                     {client.care_plan_details}
                   </div>
                 ) : (
                   <div className="text-xs text-[#8B949E] italic bg-black/20 p-3 rounded border border-transparent">No care plan details have been added for this client.</div>
                 )}
               </div>
            </div>

            {/* Assigned Services Card */}
            <div className="bg-brand-navy border border-border-subtle rounded-md p-3.5 shadow-xs">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-semibold text-[#E6EDF3]">Assigned Services</h3>
                 <span className="bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                   {clientServices.length} {clientServices.length === 1 ? 'Service' : 'Services'}
                 </span>
               </div>
               
               {clientServices.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {clientServices.map(s => (
                     <div key={s.id} className="flex items-start p-2.5 bg-black/30 border border-white/[0.06] rounded">
                       <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal mt-0.5 mr-2 shrink-0" />
                       <div className="min-w-0">
                         <div className="text-xs font-medium text-[#E6EDF3] truncate">{s.name}</div>
                         {s.code && <div className="text-[10px] text-[#8B949E] mt-0.5 font-mono">{s.code}</div>}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-4 border border-dashed border-border-subtle rounded text-[#8B949E] text-xs flex flex-col items-center">
                    <CheckCircle2 className="w-4 h-4 opacity-40 mb-1" />
                    No services have been configured for this client yet.
                 </div>
               )}
            </div>

            {/* Recent Progress Notes Card */}
            <div className="bg-brand-navy border border-border-subtle rounded-md p-3.5 shadow-xs">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center space-x-2 text-purple-400">
                   <ClipboardEdit className="w-4 h-4" />
                   <h3 className="text-sm font-semibold text-[#E6EDF3]">Recent Progress Notes</h3>
                 </div>
                 <button 
                   onClick={() => navigate('/progress-notes?client=' + client.id)}
                   className="text-xs text-brand-teal hover:underline font-medium cursor-pointer"
                 >
                   View All Notes
                 </button>
               </div>

               {recentNotes.length > 0 ? (
                 <div className="space-y-2">
                   {recentNotes.map(note => (
                     <div key={note.id} className="p-2.5 sm:p-3 bg-black/30 border border-white/[0.06] rounded space-y-1">
                       <div className="flex justify-between items-center">
                         <div className="flex items-center space-x-1.5">
                           <Calendar className="w-3.5 h-3.5 text-[#8B949E]" />
                           <span className="text-xs font-mono font-medium text-zinc-300">
                             {new Date(note.start_time).toLocaleDateString()} {new Date(note.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                         </div>
                         <div className="text-[10px] uppercase text-[#8B949E] px-1.5 py-0.2 border border-border-subtle rounded bg-brand-bg/50">
                           {note.staff_first_name} {note.staff_last_name}
                         </div>
                       </div>
                       <div className="text-xs text-[#E6EDF3] leading-relaxed line-clamp-3">
                         {getNotePreview(note.notes)}
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center p-4 border border-dashed border-border-subtle rounded text-[#8B949E] text-xs flex flex-col items-center">
                    <ClipboardEdit className="w-4 h-4 opacity-40 mb-1" />
                    No recent progress notes found for this client.
                 </div>
               )}
            </div>

          </div>

        </div>
      </div>

      <ClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        onSave={handleClientSaved}
        token={token!}
      />

      <ClientRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        client={client}
      />

    </div>
  );
}
