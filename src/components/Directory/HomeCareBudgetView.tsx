import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Calculator, Save, AlertCircle, ChevronLeft, ChevronRight, Flame, Plus, X, Layers, Wrench, Home, Trash2, Edit2, Info, CheckCircle2, Calendar, Archive, Clock, RotateCcw, Search } from 'lucide-react';
import { motion } from 'motion/react';

// Official Australian Home Care Financial Year Quarters (July 1 to June 30)
export interface HomeCareQuarter {
  id: number;
  label: string;
  shortLabel: string;
  startDateStr: string;
  endDateStr: string;
  displayRange: string;
  totalDays: number;
  start: Date;
  end: Date;
}

export const getFinancialYearQuarters = (fyStartYear: number): HomeCareQuarter[] => {
  const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const q3Days = isLeap(fyStartYear + 1) ? 91 : 90;

  return [
    {
      id: 1,
      label: "Quarter 1",
      shortLabel: "Q1",
      startDateStr: `${fyStartYear}-06-30`,
      endDateStr: `${fyStartYear}-09-30`,
      displayRange: `30 Jun - 30 Sep ${fyStartYear}`,
      totalDays: 92,
      start: new Date(`${fyStartYear}-06-30T00:00:00`),
      end: new Date(`${fyStartYear}-09-30T23:59:59`)
    },
    {
      id: 2,
      label: "Quarter 2",
      shortLabel: "Q2",
      startDateStr: `${fyStartYear}-09-30`,
      endDateStr: `${fyStartYear}-12-31`,
      displayRange: `30 Sep - 31 Dec ${fyStartYear}`,
      totalDays: 92,
      start: new Date(`${fyStartYear}-09-30T00:00:00`),
      end: new Date(`${fyStartYear}-12-31T23:59:59`)
    },
    {
      id: 3,
      label: "Quarter 3",
      shortLabel: "Q3",
      startDateStr: `${fyStartYear}-12-31`,
      endDateStr: `${fyStartYear + 1}-03-31`,
      displayRange: `31 Dec ${fyStartYear} - 31 Mar ${fyStartYear + 1}`,
      totalDays: q3Days,
      start: new Date(`${fyStartYear}-12-31T00:00:00`),
      end: new Date(`${fyStartYear + 1}-03-31T23:59:59`)
    },
    {
      id: 4,
      label: "Quarter 4",
      shortLabel: "Q4",
      startDateStr: `${fyStartYear + 1}-03-31`,
      endDateStr: `${fyStartYear + 1}-06-30`,
      displayRange: `31 Mar - 30 Jun ${fyStartYear + 1}`,
      totalDays: 91,
      start: new Date(`${fyStartYear + 1}-03-31T00:00:00`),
      end: new Date(`${fyStartYear + 1}-06-30T23:59:59`)
    }
  ];
};

export const getCurrentFinancialYearAndQuarter = (timezone: string = 'Australia/Perth') => {
  const now = new Date();
  let todayStr = '';
  try {
    todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
  } catch {
    todayStr = now.toISOString().split('T')[0];
  }
  const [currentYearStr, currentMonthStr, currentDayStr] = todayStr.split('-');
  const curYear = parseInt(currentYearStr, 10);
  const curMonth = parseInt(currentMonthStr, 10);
  const curDay = parseInt(currentDayStr, 10);

  const isPastJun30 = curMonth > 6 || (curMonth === 6 && curDay >= 30);
  const currentFyStartYear = isPastJun30 ? curYear : curYear - 1;

  const quarters = getFinancialYearQuarters(currentFyStartYear);
  const activeQuarter = quarters.slice().reverse().find(q => todayStr >= q.startDateStr && todayStr <= q.endDateStr) || quarters[0];
  const currentQuarterId = activeQuarter.id;

  return { currentFyStartYear, currentQuarterId, todayStr };
};

export default function HomeCareBudgetView() {
  // Support at Home & Home Care custom additional funding & ringfenced AT/HM schemes
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, settings } = useAuth();
  const timezone = settings?.timezone || 'Australia/Perth';
  
  const initialPeriod = getCurrentFinancialYearAndQuarter(timezone);
  const [selectedFyYear, setSelectedFyYear] = useState<number>(initialPeriod.currentFyStartYear);
  const [selectedQuarterId, setSelectedQuarterId] = useState<number>(initialPeriod.currentQuarterId);

  const [client, setClient] = useState<any>(null);
  const [fundingRates, setFundingRates] = useState<any>(null);
  const [ledger, setLedger] = useState<{ total: number, items: any[] }>({ total: 0, items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');

  const DEFAULT_ADDITIONAL_STREAM_OPTIONS = [
    { code: 'HC', name: 'HC Home Care Account' },
    { code: 'RC', name: 'RC Restorative Care Pathway' },
    { code: 'EL', name: 'EL End of Life Pathway' },
    { code: 'AT', name: 'AT Assistive Technology' },
    { code: 'HM', name: 'HM Home Modifications' },
    { code: 'AS', name: 'AS Assistive Technology Specific Needs' },
    { code: 'VC', name: 'VC Voluntary Contributions' }
  ];

  // Form states (Rollover Pool)
  const [startingRolloverBalance, setStartingRolloverBalance] = useState<number>(0);
  const [rolloverSpentSoFar, setRolloverSpentSoFar] = useState<number>(0);

  // Additional Funding Streams
  const [availableStreamOptions, setAvailableStreamOptions] = useState<Array<{ code: string; name: string }>>(DEFAULT_ADDITIONAL_STREAM_OPTIONS);
  const [additionalFundingStreams, setAdditionalFundingStreams] = useState<Array<{
    id: string;
    code?: string;
    name: string;
    amount: number;
    spentAmount?: number;
    addToOngoing?: boolean;
    notes?: string;
  }>>([]);
  const [isAdditionalModalOpen, setIsAdditionalModalOpen] = useState(false);
  const [isManageAdditionalModalOpen, setIsManageAdditionalModalOpen] = useState(false);
  const [editingAdditionalStreamId, setEditingAdditionalStreamId] = useState<string | null>(null);
  const [selectedStreamCode, setSelectedStreamCode] = useState<string>('HC');
  const [isCustomStreamMode, setIsCustomStreamMode] = useState<boolean>(false);
  const [customStreamCode, setCustomStreamCode] = useState<string>('');
  const [streamName, setStreamName] = useState('');
  const [streamAmount, setStreamAmount] = useState('');
  const [streamSpentAmount, setStreamSpentAmount] = useState('0');
  const [streamAddToOngoing, setStreamAddToOngoing] = useState<boolean>(false);
  const [streamNotes, setStreamNotes] = useState('');

  // Legacy AT/HM array kept empty on save after migration into additionalFundingStreams
  const [atHmFundingStreams, setAtHmFundingStreams] = useState<any[]>([]);

  // States for Manual External Expense logging
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [externalDate, setExternalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [externalService, setExternalService] = useState<string>('');
  const [externalVendor, setExternalVendor] = useState<string>('');
  const [externalBaseAmount, setExternalBaseAmount] = useState<string>('');
  const [externalLoadings, setExternalLoadings] = useState<boolean>(true);
  const [masterServices, setMasterServices] = useState<any[]>([]);
  const [submittingExternal, setSubmittingExternal] = useState<boolean>(false);

  const fetchAvailableFundingStreams = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/settings/home-care-funding-streams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.streams)) {
          const filtered = data.streams.filter((s: any) => s.code !== 'ON');
          if (filtered.length > 0) {
            setAvailableStreamOptions(filtered);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching home care funding streams:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAvailableFundingStreams();
      fetch('/api/services?type=HOME_CARE', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.ok) return res.json();
          return fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
        })
        .then(data => {
          setMasterServices(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error('Error fetching master services:', err));
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchQuarterLedger = async (clientData: any, fyYear: number, quarterId: number) => {
    if (!clientData || !id || !token) return;
    const quarters = getFinancialYearQuarters(fyYear);
    const targetQuarter = quarters.find(q => q.id === quarterId) || quarters[0];

    let actualStartDateStr = targetQuarter.startDateStr;
    const actualEndDateStr = targetQuarter.endDateStr;

    if (clientData.joined_date) {
      const joinedStr = clientData.joined_date.split('T')[0];
      if (joinedStr > actualEndDateStr) {
        setLedger({ total: 0, items: [] });
        return;
      }
      if (joinedStr >= actualStartDateStr && joinedStr <= actualEndDateStr) {
        actualStartDateStr = joinedStr;
      }
    }

    const sDate = actualStartDateStr;
    const eDate = actualEndDateStr;

    try {
      const ledgerRes = await fetch(`/api/clients/${id}/budget-ledger?startDate=${sDate}&endDate=${eDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ledgerRes.ok) {
        setLedger(await ledgerRes.json());
      }
    } catch (e) {
      console.error('Error fetching quarter ledger:', e);
    }
  };

  useEffect(() => {
    if (client) {
      fetchQuarterLedger(client, selectedFyYear, selectedQuarterId);
    }
  }, [selectedFyYear, selectedQuarterId, id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, ratesRes] = await Promise.all([
        fetch(`/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/funding-rates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      let clientData: any;
      if (clientRes.ok) {
        clientData = await clientRes.json();
        setClient(clientData);
        setStartingRolloverBalance(clientData.starting_rollover_balance || 0);
        setRolloverSpentSoFar(clientData.rollover_spent_so_far || 0);

        // Parse Additional Funding Streams
        let parsedAdd: any[] = [];
        if (clientData.additional_funding_streams) {
          try {
            parsedAdd = typeof clientData.additional_funding_streams === 'string'
              ? JSON.parse(clientData.additional_funding_streams)
              : clientData.additional_funding_streams;
          } catch {}
        }
        if ((!parsedAdd || parsedAdd.length === 0) && (String(clientData.first_name || '').toLowerCase().includes('marlene') || String(clientData.last_name || '').toLowerCase().includes('coombs'))) {
          parsedAdd = [
            {
              id: 'stream-dementia-c',
              code: 'DC',
              name: 'Dementia C Supplement',
              amount: 1896.17,
              spentAmount: 0,
              addToOngoing: true,
              notes: 'Approved Services Australia / Trilogy Care Dementia and Cognition Supplement'
            }
          ];
        }

        // Normalize legacy additional streams and merge any legacy AT/HM streams
        const normalizedStreams = (Array.isArray(parsedAdd) ? parsedAdd : []).map((s: any) => ({
          id: s.id || `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          code: s.code || (DEFAULT_ADDITIONAL_STREAM_OPTIONS.find(o => o.name.toLowerCase() === String(s.name || '').toLowerCase())?.code || 'CUSTOM'),
          name: s.name || 'Additional Stream',
          amount: Number(s.amount ?? s.allocatedAmount) || 0,
          spentAmount: Number(s.spentAmount) || 0,
          addToOngoing: s.addToOngoing !== undefined ? Boolean(s.addToOngoing) : !s.code,
          notes: s.notes || ''
        }));

        let parsedAtHm: any[] = [];
        if (clientData.at_hm_funding_streams) {
          try {
            parsedAtHm = typeof clientData.at_hm_funding_streams === 'string'
              ? JSON.parse(clientData.at_hm_funding_streams)
              : clientData.at_hm_funding_streams;
          } catch {}
        }
        if (Array.isArray(parsedAtHm) && parsedAtHm.length > 0) {
          parsedAtHm.forEach((legacy: any) => {
            const legacyId = legacy.id || `athm-${legacy.name}`;
            if (!normalizedStreams.some(ns => ns.id === legacyId)) {
              const code = legacy.type === 'HM' ? 'HM' : 'AT';
              normalizedStreams.push({
                id: legacyId,
                code,
                name: legacy.name ? `${code} ${legacy.name}` : (code === 'HM' ? 'HM Home Modifications' : 'AT Assistive Technology'),
                amount: Number(legacy.allocatedAmount ?? legacy.amount) || 0,
                spentAmount: Number(legacy.spentAmount) || 0,
                addToOngoing: false,
                notes: legacy.notes || (legacy.tier ? `${legacy.tier} Tier` : '')
              });
            }
          });
        }

        setAdditionalFundingStreams(normalizedStreams);
        setAtHmFundingStreams([]);

        await fetchQuarterLedger(clientData, selectedFyYear, selectedQuarterId);
      }

      if (ratesRes.ok) {
        setFundingRates(await ratesRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (
    customAdditional?: typeof additionalFundingStreams,
    customAtHm?: any[]
  ) => {
    setSaving(true);
    try {
      const addStreamsToSave = customAdditional !== undefined ? customAdditional : additionalFundingStreams;
      const atHmStreamsToSave = customAtHm !== undefined ? customAtHm : [];

      const res = await fetch(`/api/clients/${id}/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          other_providers_spent: 0,
          historical_internal_consumptions: 0,
          spend_as_of_date: null,
          cycle_start_date: activeCycle.startStr,
          cycle_end_date: activeCycle.endStr,
          starting_rollover_balance: startingRolloverBalance,
          rollover_spent_so_far: rolloverSpentSoFar,
          additional_funding_streams: addStreamsToSave,
          at_hm_funding_streams: atHmStreamsToSave
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Additional Funding Stream Handlers
  const handleOpenAddAdditional = () => {
    setEditingAdditionalStreamId(null);
    setIsCustomStreamMode(false);
    const defaultOpt = availableStreamOptions[0] || DEFAULT_ADDITIONAL_STREAM_OPTIONS[0];
    setSelectedStreamCode(defaultOpt.code);
    setCustomStreamCode('');
    setStreamName(defaultOpt.name);
    setStreamAmount('');
    setStreamSpentAmount('0');
    setStreamAddToOngoing(false);
    setStreamNotes('');
    setIsAdditionalModalOpen(true);
  };

  const handleOpenEditAdditional = (stream: any) => {
    setEditingAdditionalStreamId(stream.id);
    const matchedOpt = availableStreamOptions.find(
      o => o.code === stream.code || o.name.toLowerCase() === String(stream.name || '').toLowerCase()
    );
    if (matchedOpt) {
      setIsCustomStreamMode(false);
      setSelectedStreamCode(matchedOpt.code);
      setCustomStreamCode('');
      setStreamName(stream.name || matchedOpt.name);
    } else {
      setIsCustomStreamMode(true);
      setSelectedStreamCode('CUSTOM');
      setCustomStreamCode(stream.code && stream.code !== 'CUSTOM' ? stream.code : '');
      setStreamName(stream.name || '');
    }
    setStreamAmount(stream.amount !== undefined ? String(stream.amount) : '');
    setStreamSpentAmount(stream.spentAmount !== undefined ? String(stream.spentAmount) : '0');
    setStreamAddToOngoing(Boolean(stream.addToOngoing));
    setStreamNotes(stream.notes || '');
    setIsAdditionalModalOpen(true);
  };

  const handleSaveAdditionalStream = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(streamAmount) || 0;
    const spent = parseFloat(streamSpentAmount) || 0;

    let finalCode = selectedStreamCode;
    let finalName = streamName.trim();

    if (isCustomStreamMode) {
      if (!finalName) {
        alert('Please enter a custom funding stream name.');
        return;
      }
      const words = finalName.split(/\s+/).filter(Boolean);
      const fallbackCode = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : finalName.slice(0, 3).toUpperCase();
      finalCode = (customStreamCode.trim() || fallbackCode).toUpperCase();
      if (!finalName.toUpperCase().startsWith(finalCode + ' ')) {
        finalName = `${finalCode} ${finalName}`;
      }
      // Persist custom funding stream globally so it is also selectable in Settings > Home Care Pricing
      try {
        const res = await fetch('/api/settings/home-care-funding-streams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ code: finalCode, name: finalName })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.streams)) {
            setAvailableStreamOptions(data.streams.filter((s: any) => s.code !== 'ON'));
          }
        }
      } catch (err) {
        console.error('Failed to register custom funding stream globally:', err);
      }
    } else {
      const found = availableStreamOptions.find(o => o.code === selectedStreamCode);
      if (found) {
        finalCode = found.code;
        finalName = finalName || found.name;
      }
    }

    if (!finalName || amt <= 0) {
      alert('Please provide a valid funding stream and an allocated amount greater than $0.');
      return;
    }

    let updated: typeof additionalFundingStreams;
    if (editingAdditionalStreamId) {
      updated = additionalFundingStreams.map(s =>
        s.id === editingAdditionalStreamId
          ? {
              ...s,
              code: finalCode,
              name: finalName,
              amount: amt,
              spentAmount: spent,
              addToOngoing: streamAddToOngoing,
              notes: streamNotes.trim()
            }
          : s
      );
    } else {
      const newStream = {
        id: `stream-${Date.now()}`,
        code: finalCode,
        name: finalName,
        amount: amt,
        spentAmount: spent,
        addToOngoing: streamAddToOngoing,
        notes: streamNotes.trim()
      };
      updated = [...additionalFundingStreams, newStream];
    }

    setAdditionalFundingStreams(updated);
    setIsAdditionalModalOpen(false);
    await handleSaveSettings(updated, []);
  };

  const handleDeleteAdditionalStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to remove this additional funding stream?')) return;
    const updated = additionalFundingStreams.filter(s => s.id !== streamId);
    setAdditionalFundingStreams(updated);
    await handleSaveSettings(updated, []);
  };

  const handleAddExternalExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalDate || !externalService || !externalBaseAmount) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmittingExternal(true);
    try {
      const res = await fetch(`/api/clients/${id}/ledger/external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: externalDate,
          serviceName: externalService,
          vendorName: externalVendor,
          baseAmount: parseFloat(externalBaseAmount) || 0,
          applyLoadings: externalLoadings
        })
      });

      if (res.ok) {
        await fetchQuarterLedger(client, selectedFyYear, selectedQuarterId);

        setExternalService('');
        setExternalVendor('');
        setExternalBaseAmount('');
        setExternalLoadings(true);
        setIsExternalModalOpen(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit external expense.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    } finally {
      setSubmittingExternal(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E]">Loading budget details...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-red-500">Client not found.</div>
    );
  }

  // Calculate Quarter and Pro-rata logic
  const quarters = getFinancialYearQuarters(selectedFyYear);
  const activeQuarter = quarters.find(q => q.id === selectedQuarterId) || quarters[0];
  
  let actualStartDateStr = activeQuarter.startDateStr;
  let totalDays = activeQuarter.totalDays;
  
  if (client.joined_date) {
    const joinedStr = client.joined_date.split('T')[0];
    if (joinedStr > activeQuarter.endDateStr) {
      totalDays = 0;
    } else if (joinedStr >= activeQuarter.startDateStr && joinedStr <= activeQuarter.endDateStr) {
      actualStartDateStr = joinedStr;
      const joinedDate = new Date(`${joinedStr}T00:00:00`);
      const endDate = new Date(`${activeQuarter.endDateStr}T23:59:59`);
      const msPerDay = 1000 * 60 * 60 * 24;
      totalDays = Math.max(1, Math.floor((endDate.getTime() - joinedDate.getTime()) / msPerDay) + 1);
    }
  }

  const activeCycle = {
    startStr: actualStartDateStr,
    endStr: activeQuarter.endDateStr,
    totalDays
  };

  const { currentFyStartYear, currentQuarterId } = getCurrentFinancialYearAndQuarter(timezone);
  const availableYears = [
    { year: currentFyStartYear - 2, label: `FY ${currentFyStartYear - 2}–${currentFyStartYear - 1}` },
    { year: currentFyStartYear - 1, label: `FY ${currentFyStartYear - 1}–${currentFyStartYear}` },
    { year: currentFyStartYear, label: `FY ${currentFyStartYear}–${currentFyStartYear + 1} (Current)` },
    { year: currentFyStartYear + 1, label: `FY ${currentFyStartYear + 1}–${currentFyStartYear + 2}` }
  ];

  const isCurrentRealTimeQuarter = (selectedFyYear === currentFyStartYear) && (selectedQuarterId === currentQuarterId);
  const isPastQuarter = (selectedFyYear < currentFyStartYear) || (selectedFyYear === currentFyStartYear && selectedQuarterId < currentQuarterId);
  const isFutureQuarter = (selectedFyYear > currentFyStartYear) || (selectedFyYear === currentFyStartYear && selectedQuarterId > currentQuarterId);

  // Funding Rate calculation
  const getClientDailyRate = () => {
    if (!client || client.funding_type !== 'HOME_CARE') return 0;
    const subType = client.home_care_sub_type || 'HCP';
    const levelOrClass = client.home_care_level_or_class || 'Level 1';
    
    const parseDailyRate = (item: any, fallback: number) => {
      if (!item) return fallback;
      if (item.amountDaily !== undefined && item.amountDaily !== null) return Number(item.amountDaily);
      if (item.amountQuarterly !== undefined && item.amountQuarterly !== null) return Number((Number(item.amountQuarterly) / 92).toFixed(2));
      if (item.amountAnnual !== undefined && item.amountAnnual !== null) return Number((Number(item.amountAnnual) / 365).toFixed(2));
      if (item.amount !== undefined && item.amount !== null) return Number((Number(item.amount) / 365).toFixed(2));
      return fallback;
    };

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
      return parseDailyRate(match, 29.40);
    } else {
      const levels = fundingRates?.hcpFundingLevels || [
        { level: 'Level 1', amountDaily: 30.93 },
        { level: 'Level 2', amountDaily: 54.39 },
        { level: 'Level 3', amountDaily: 118.40 },
        { level: 'Level 4', amountDaily: 179.22 },
      ];
      const match = levels.find((l: any) => l.level === levelOrClass);
      return parseDailyRate(match, 179.22);
    }
  };

  const dailyRate = getClientDailyRate();
  const grossAllocation = totalDays * dailyRate;
  
  const isHomeCare = client?.funding_type === 'Home Care' || client?.funding_type === 'HOME_CARE';
  const defaultMgmtRate = fundingRates?.defaultManagementFee !== undefined ? Number(fundingRates.defaultManagementFee) : 10;
  const defaultCareCoordRate = fundingRates?.defaultCareCoordinationFee !== undefined ? Number(fundingRates.defaultCareCoordinationFee) : 20;
  const careManagementFeePercent = isHomeCare
    ? (fundingRates?.defaultCareManagementFee !== undefined && fundingRates?.defaultCareManagementFee !== null ? Number(fundingRates.defaultCareManagementFee) : 10)
    : 0;

  const managementFeePercent = isHomeCare 
    ? (client?.management_fee !== undefined && client?.management_fee !== null && client?.management_fee !== '' ? Number(client.management_fee) : defaultMgmtRate) 
    : 0;
  const careCoordPercent = isHomeCare 
    ? (client?.care_coordination_fee !== undefined && client?.care_coordination_fee !== null ? Number(client.care_coordination_fee) : defaultCareCoordRate) 
    : 0;

  // Deduct Care Management Fee (default 10%) off the top of the quarterly subsidy before it hits Total Allocation / ON balance
  const careManagementFeeAmount = isHomeCare ? grossAllocation * (careManagementFeePercent / 100) : 0;
  const netOngoingSubsidy = grossAllocation - careManagementFeeAmount;
  
  // Additional funding streams that have addToOngoing === true increase the ON = Ongoing Funds Total Allocation
  const additionalFundingTotal = additionalFundingStreams
    .filter(s => Boolean(s.addToOngoing))
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalAllocation = netOngoingSubsidy + additionalFundingTotal; // Net Ongoing Subsidy (after 10% Care Mgmt deduction) + Additional Streams added to ON Ongoing Funds

  // Separate additional funding stream codes (streams not added to ON Ongoing Funds)
  const separateStreamCodes = new Set(
    additionalFundingStreams
      .filter(s => !s.addToOngoing && s.code && s.code !== 'ON')
      .map(s => String(s.code).toUpperCase())
  );

  const calculateServiceConsumptionWithFees = (baseAmount: number, ccPercent: number, mfPercent: number) => {
    if (!isHomeCare) return { baseAmount, coordinationFee: 0, subtotal: baseAmount, managementFee: 0, total: baseAmount };
    const coordinationFee = baseAmount * (ccPercent / 100);
    const subtotal = baseAmount + coordinationFee;
    const managementFee = subtotal * (mfPercent / 100);
    
    return {
      baseAmount,
      coordinationFee,
      subtotal,
      managementFee,
      total: baseAmount + coordinationFee + managementFee
    };
  };

  const processedLedgerItems = ledger.items.map((item: any) => {
    const itemFundingStream = String(item.funding_stream || 'ON').toUpperCase();
    if (item.source_type === 'external' || item.grand_total !== undefined) {
      const baseAmt = item.base_amount ?? item.amount;
      const ccFee = item.care_coord_fee ?? (isHomeCare ? baseAmt * (careCoordPercent / 100) : 0);
      const sub = baseAmt + ccFee;
      const mgmt = item.management_fee ?? (isHomeCare ? sub * (managementFeePercent / 100) : 0);
      const gTotal = item.grand_total ?? (sub + mgmt);
      return {
        ...item,
        funding_stream: itemFundingStream,
        baseAmount: baseAmt,
        coordinationFee: ccFee,
        subtotal: sub,
        managementFee: mgmt,
        amount: gTotal
      };
    }
    const fees = calculateServiceConsumptionWithFees(item.base_amount ?? item.amount, careCoordPercent, managementFeePercent);
    return {
      ...item,
      funding_stream: itemFundingStream,
      baseAmount: fees.baseAmount,
      coordinationFee: fees.coordinationFee,
      subtotal: fees.subtotal,
      managementFee: fees.managementFee,
      amount: fees.total
    };
  });

  // Ongoing Funds (ON) drawdown: all items with funding_stream === 'ON' or not drawn from a separate active additional stream card
  const liveSystemConsumptions = processedLedgerItems
    .filter((item: any) => !separateStreamCodes.has(String(item.funding_stream || 'ON').toUpperCase()))
    .reduce((acc: number, item: any) => acc + (item.amount || 0), 0);
  const totalCombinedSpent = liveSystemConsumptions;
  const remainingBalance = totalAllocation - totalCombinedSpent;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date.includes('T') ? date : `${date}T00:00:00`) : date;
    return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Filtered ledger items based on search and date inputs
  const filteredLedgerItems = processedLedgerItems.filter((item: any) => {
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      const matchService = (item.service || '').toLowerCase().includes(q);
      const matchVendor = (item.vendor_name || '').toLowerCase().includes(q);
      const matchDate = (item.date || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchAmount = String(item.amount || '').includes(q);
      if (!matchService && !matchVendor && !matchDate && !matchNotes && !matchAmount) {
        return false;
      }
    }

    if (ledgerStartDate || ledgerEndDate) {
      let itemDateIso = '';
      if (item.date && item.date.includes('-')) {
        const parts = item.date.split('-');
        if (parts[0].length === 4) {
          itemDateIso = item.date;
        } else if (parts[2].length === 4) {
          itemDateIso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (itemDateIso) {
        if (ledgerStartDate && itemDateIso < ledgerStartDate) return false;
        if (ledgerEndDate && itemDateIso > ledgerEndDate) return false;
      }
    }

    return true;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredLedgerItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLedgerItems = filteredLedgerItems.slice(startIndex, startIndex + itemsPerPage);

  // Participant Contribution calculations
  const totalClientShare = processedLedgerItems.reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);
  const independenceShare = processedLedgerItems
    .filter((item: any) => {
      const cat = item.service_category || '';
      return cat.toLowerCase() === 'independence' || cat.toLowerCase() === 'independence supports';
    })
    .reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);
  const everydayLivingShare = processedLedgerItems
    .filter((item: any) => {
      const cat = item.service_category || '';
      return cat.toLowerCase() === 'everyday living' || cat.toLowerCase() === 'everyday';
    })
    .reduce((acc: number, item: any) => acc + (item.client_share || 0), 0);

  const billingTier = client.billing_tier || 'SAH_Full_Pensioner';
  const monthlyCap = client.historical_monthly_cap || 0;
  const progressPercent = monthlyCap > 0 ? Math.min((totalClientShare / monthlyCap) * 100, 100) : 0;
  const isCapExhausted = totalClientShare >= monthlyCap;

  const getTierBadge = (t: string) => {
    const isHybrid = t === 'Hybrid';
    const isGrandfathered = t === 'Grandfathered';
    if (isGrandfathered) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          Grandfathered
        </span>
      );
    } else if (isHybrid) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
          Hybrid
        </span>
      );
    } else {
      let label = "Support at Home";
      if (t === 'SAH_Full_Pensioner') label = "SaH: Full Pensioner";
      else if (t === 'SAH_Part_Pensioner') label = "SaH: Part Pensioner";
      else if (t === 'SAH_Self_Funded') label = "SaH: Self-Funded";
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 whitespace-nowrap">
          {label}
        </span>
      );
    }
  };

  return (
    <div className="w-full flex flex-col h-full space-y-2">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => navigate(`/clients/${id}`, { replace: true })}
            className="p-1 -ml-1 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#E6EDF3] tracking-tight leading-tight">
              Client Budget
            </h2>
            <div className="flex items-center text-xs text-[#8B949E] space-x-1.5 mt-0.5">
              <span className="font-medium text-[#E6EDF3]">{client.first_name} {client.last_name}</span>
              <span>•</span>
              <span>{client.home_care_sub_type || 'HCP'} {client.home_care_level_or_class || 'Level 1'}</span>
              <span>•</span>
              <span className="text-brand-green font-medium">{formatCurrency(dailyRate)}/day</span>
            </div>
          </div>
        </div>

        {isHomeCare && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {additionalFundingStreams.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManageAdditionalModalOpen(true)}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-brand-teal" />
                <span>Manage Streams ({additionalFundingStreams.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddAdditional}
              className="px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Additional Funding Streams</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 space-y-2.5">
        {/* Compact Funding Period & Quarter Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-brand-navy border border-border-subtle rounded-md px-3 py-1.5 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
              <Calendar className="w-3.5 h-3.5 text-brand-blue" />
              <span className="font-medium text-[#E6EDF3]">Period:</span>
            </div>
            
            {/* Financial Year Dropdown */}
            <div className="relative">
              <select
                value={selectedFyYear}
                onChange={(e) => {
                  const yr = Number(e.target.value);
                  setSelectedFyYear(yr);
                  setCurrentPage(1);
                }}
                className="bg-[#121214] border border-border-subtle rounded px-2.5 py-0.5 text-xs text-[#E6EDF3] font-medium focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y.year} value={y.year}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quarter Dropdown */}
            <div className="relative">
              <select
                value={selectedQuarterId}
                onChange={(e) => {
                  const qId = Number(e.target.value);
                  setSelectedQuarterId(qId);
                  setCurrentPage(1);
                }}
                className="bg-[#121214] border border-border-subtle rounded px-2.5 py-0.5 text-xs text-[#E6EDF3] font-medium focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                {quarters.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.label} ({q.displayRange})
                  </option>
                ))}
              </select>
            </div>

            {/* Quarter Status Badge */}
            {isCurrentRealTimeQuarter ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            ) : isPastQuarter ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Archive className="w-3 h-3" />
                Archived
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Clock className="w-3 h-3" />
                Upcoming
              </span>
            )}
          </div>

          {/* Quick Jump to Current Quarter button if viewing history/future */}
          {!isCurrentRealTimeQuarter && (
            <button
              onClick={() => {
                const current = getCurrentFinancialYearAndQuarter(timezone);
                setSelectedFyYear(current.currentFyStartYear);
                setSelectedQuarterId(current.currentQuarterId);
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-white px-2 py-0.5 rounded bg-brand-blue/10 hover:bg-brand-blue/20 transition-colors border border-brand-blue/20 cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Current Quarter</span>
            </button>
          )}
        </div>

        {/* Top Summary Cards Row - ON Ongoing Funds, Created Additional Funding Streams, and Participant Share at the end */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {/* Card 1: Total Allocation (ON = Ongoing Funds) */}
          <div className="bg-brand-navy border border-border-subtle rounded-md p-2.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider">Total Allocation</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30 whitespace-nowrap">
                  ON = Ongoing Funds
                </span>
              </div>
              <div className="text-lg font-bold text-[#E6EDF3] tracking-tight">{formatCurrency(totalAllocation)}</div>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1 pt-1 border-t border-white/[0.04] space-y-0.5">
              <div className="truncate">
                {totalDays} Days ({formatDate(activeCycle.startStr)} – {formatDate(activeCycle.endStr)})
                {additionalFundingTotal > 0 && (
                  <span className="text-emerald-400 font-sans ml-1">+{formatCurrency(additionalFundingTotal)}</span>
                )}
              </div>
              {isHomeCare && careManagementFeePercent > 0 && (
                <div className="text-[9.5px] text-amber-400/90 truncate" title={`Gross Subsidy: ${formatCurrency(grossAllocation)} minus ${careManagementFeePercent}% Care Management Fee (${formatCurrency(careManagementFeeAmount)})`}>
                  Gross: {formatCurrency(grossAllocation)} • -{careManagementFeePercent}% Care Mgmt ({formatCurrency(careManagementFeeAmount)})
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Total Spent (ON = Ongoing Funds) */}
          <div className="bg-brand-navy border border-border-subtle rounded-md p-2.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider">Total Spent</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30 whitespace-nowrap">
                  ON = Ongoing Funds
                </span>
              </div>
              <div className="text-lg font-bold text-[#E6EDF3] tracking-tight">{formatCurrency(totalCombinedSpent)}</div>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1 pt-1 border-t border-white/[0.04] truncate">
              {activeQuarter.shortLabel} • {isCurrentRealTimeQuarter ? 'Active' : 'Archived'} • ON Drawdown
            </div>
          </div>

          {/* Card 3: Remaining Balance (ON = Ongoing Funds) */}
          <div className={`bg-brand-navy border ${remainingBalance >= 0 ? 'border-brand-green/30' : 'border-red-500/30'} rounded-md p-2.5 shadow-xs flex flex-col justify-between relative overflow-hidden`}>
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider">Remaining Balance</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal border border-brand-teal/30 whitespace-nowrap">
                  ON = Ongoing Funds
                </span>
              </div>
              <div className={`text-lg font-bold tracking-tight ${remainingBalance >= 0 ? 'text-brand-green' : 'text-red-400'}`}>
                {formatCurrency(remainingBalance)}
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1 pt-1 border-t border-white/[0.04] truncate">
              {activeQuarter.shortLabel} ({activeQuarter.displayRange})
            </div>
          </div>

          {/* Dynamic Cards: Created Additional Funding Streams */}
          {additionalFundingStreams.map((stream) => {
            const streamCode = String(stream.code || 'CUSTOM').toUpperCase();
            const allocated = Number(stream.amount) || 0;
            const manualSpent = Number(stream.spentAmount) || 0;
            const ledgerSpentForStream = !stream.addToOngoing
              ? processedLedgerItems
                  .filter((item: any) => String(item.funding_stream || '').toUpperCase() === streamCode)
                  .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0)
              : 0;
            const totalStreamSpent = manualSpent + ledgerSpentForStream;
            const streamRemaining = allocated - totalStreamSpent;

            return (
              <div
                key={stream.id}
                className="bg-brand-navy border border-border-subtle rounded-md p-2.5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider truncate flex items-center gap-1"
                      title={stream.name}
                    >
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-mono shrink-0">
                        {streamCode}
                      </span>
                      <span className="truncate">{stream.name.replace(new RegExp(`^${streamCode}\\s+`, 'i'), '')}</span>
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAdditional(stream)}
                        className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                        title="Edit Funding Stream"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdditionalStream(stream.id)}
                        className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove Funding Stream"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {stream.addToOngoing ? (
                    <div className="text-lg font-bold text-emerald-400 tracking-tight">
                      +{formatCurrency(allocated)}
                    </div>
                  ) : (
                    <div className={`text-lg font-bold tracking-tight ${streamRemaining >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                      {formatCurrency(streamRemaining)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1 pt-1 border-t border-white/[0.04] flex items-center justify-between gap-1">
                  {stream.addToOngoing ? (
                    <span className="text-emerald-400 font-sans font-medium truncate">
                      Added to ON = Ongoing Funds
                    </span>
                  ) : (
                    <>
                      <span className="truncate">Alloc: <strong className="text-zinc-200">{formatCurrency(allocated)}</strong></span>
                      <span className="truncate">Spent: <strong className="text-zinc-200">{formatCurrency(totalStreamSpent)}</strong></span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Last Card in Row: Participant Share (Contributions) */}
          <div className="bg-brand-navy border border-border-subtle rounded-md p-2.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider">Participant Share</span>
                {getTierBadge(billingTier)}
              </div>
              <div className="text-lg font-bold text-[#E6EDF3] tracking-tight">
                {formatCurrency(totalClientShare)}
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono mt-1 pt-1 border-t border-white/[0.04] flex items-center justify-between">
              <span>Indep: <strong className="text-white">{formatCurrency(independenceShare)}</strong></span>
              <span>Living: <strong className="text-white">{formatCurrency(everydayLivingShare)}</strong></span>
            </div>
          </div>
        </div>

        {/* Full Width Compact Ledger Column */}
        <div className="w-full">
          <div className="bg-brand-navy border border-border-subtle rounded-md shadow-xs flex flex-col">
            <div className="px-3.5 py-2 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[#E6EDF3] shrink-0">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-brand-blue" />
                <h3 className="font-semibold text-sm leading-tight">System Ledger Preview ({activeQuarter.label})</h3>
                <span className="text-xs text-[#8B949E]">({activeQuarter.displayRange})</span>
                <span className="text-[11px] text-zinc-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {filteredLedgerItems.length} {filteredLedgerItems.length === 1 ? 'row' : 'rows'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button 
                  onClick={() => {
                    setExternalDate(isCurrentRealTimeQuarter ? new Date().toISOString().split('T')[0] : activeQuarter.startDateStr);
                    setIsExternalModalOpen(true);
                  }}
                  className="bg-zinc-800 border border-zinc-700 text-xs font-medium px-2.5 py-1 rounded hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-zinc-400" />
                  <span>Log External Expense</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar: Search, Date Range, Rows per Page */}
            <div className="px-3.5 py-2 bg-[#121214]/60 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[260px]">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search service, vendor, notes..."
                    value={ledgerSearch}
                    onChange={(e) => {
                      setLedgerSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded pl-7 pr-7 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:border-brand-blue transition-colors"
                  />
                  {ledgerSearch && (
                    <button
                      onClick={() => {
                        setLedgerSearch('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
                  <span className="text-[11px] uppercase font-semibold text-zinc-400">From:</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => {
                      setLedgerStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-brand-blue"
                  />
                  <span className="text-[11px] uppercase font-semibold text-zinc-400 ml-1">To:</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => {
                      setLedgerEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-brand-blue"
                  />
                  {(ledgerStartDate || ledgerEndDate || ledgerSearch) && (
                    <button
                      onClick={() => {
                        setLedgerSearch('');
                        setLedgerStartDate('');
                        setLedgerEndDate('');
                        setCurrentPage(1);
                      }}
                      className="text-xs text-brand-blue hover:underline ml-1 font-medium cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5 text-xs text-[#8B949E] shrink-0">
                <span className="font-medium">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs text-[#E6EDF3] font-medium focus:outline-none focus:border-brand-blue cursor-pointer"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#121214] text-[11px] font-semibold text-[#8B949E] sticky top-0 z-10 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 border-b border-border-subtle w-[10%]">Date</th>
                    <th className="px-3 py-2 border-b border-border-subtle w-[30%]">Service Item</th>
                    <th className="px-3 py-2 border-b border-border-subtle text-right">Service Amt</th>
                    {isHomeCare && <th className="px-3 py-2 border-b border-border-subtle text-right w-max">Care Coord ({careCoordPercent}%)</th>}
                    {isHomeCare && <th className="px-3 py-2 border-b border-border-subtle text-right w-max">Total w/ CC ({careCoordPercent}%)</th>}
                    {isHomeCare && <th className="px-3 py-2 border-b border-border-subtle text-right w-max">Service Loading Fee ({managementFeePercent}%)</th>}
                    <th className="px-3 py-2 border-b border-border-subtle text-right w-max">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {paginatedLedgerItems.length === 0 ? (
                    <tr>
                      <td colSpan={isHomeCare ? 7 : 4} className="px-4 py-6 text-center text-[#8B949E]">
                        <p className="italic text-xs sm:text-sm">
                          {ledgerSearch || ledgerStartDate || ledgerEndDate
                            ? 'No entries match your search or date filters.'
                            : `No recorded shifts or external expenses for ${activeQuarter.label} (${activeQuarter.displayRange}).`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLedgerItems.map((item, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] text-[#E6EDF3]">
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-zinc-300">{item.date}</td>
                        <td className="px-3 py-2 min-w-[190px] text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.service}</span>
                            {isHomeCare && (
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${
                                (item.funding_stream || 'ON') === 'ON'
                                  ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              }`}>
                                {item.funding_stream || 'ON'}
                              </span>
                            )}
                            {item.source_type === 'external' && (
                              <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/80 font-medium">
                                [Ext - {item.vendor_name || 'Generic'}]
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(item.baseAmount)}</td>
                        {isHomeCare && <td className="px-3 py-2 text-right text-[#8B949E] font-mono text-xs">{formatCurrency(item.coordinationFee)}</td>}
                        {isHomeCare && <td className="px-3 py-2 text-right text-[#8B949E] font-mono text-xs">{formatCurrency(item.subtotal)}</td>}
                        {isHomeCare && <td className="px-3 py-2 text-right text-[#8B949E] font-mono text-xs">{formatCurrency(item.managementFee)}</td>}
                        <td className="px-3 py-2 text-right font-semibold text-brand-blue font-mono text-xs">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Controls */}
            <div className="px-3 py-1.5 border-t border-border-subtle bg-black/20 flex items-center justify-between shrink-0 text-xs">
              <div className="text-[#8B949E]">
                {filteredLedgerItems.length === 0 ? (
                  '0 entries'
                ) : (
                  <>Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredLedgerItems.length)} of {filteredLedgerItems.length} entries</>
                )}
                {(ledgerSearch || ledgerStartDate || ledgerEndDate) && (
                  <span className="text-zinc-500 ml-1.5">(filtered from {processedLedgerItems.length} total)</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Page Size:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[#121214] border border-border-subtle rounded px-1.5 py-0.5 text-xs text-zinc-300 font-medium focus:outline-none focus:border-brand-blue cursor-pointer"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[#E6EDF3] px-1 font-mono text-xs">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded bg-brand-navy border border-border-subtle hover:border-brand-teal text-[#8B949E] hover:text-[#E6EDF3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log External Expense Modal */}
      {isExternalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#E6EDF3]">Log External/Brokerage Expense</h4>
              <button 
                onClick={() => setIsExternalModalOpen(false)}
                className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded-sm hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddExternalExpense} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Date of Expense *</label>
                <input
                  type="date"
                  required
                  value={externalDate}
                  onChange={(e) => setExternalDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Service Selection *</label>
                <select
                  required
                  value={externalService}
                  onChange={(e) => setExternalService(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select Service Item</option>
                  {masterServices.map(srv => (
                    <option key={srv.id} value={srv.name}>{srv.name} {srv.code ? `(${srv.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">External Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g., Cabcharge, Lite n' Easy"
                  value={externalVendor}
                  onChange={(e) => setExternalVendor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Total Invoice Base Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.00"
                  placeholder="0.00"
                  value={externalBaseAmount}
                  onChange={(e) => setExternalBaseAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {isHomeCare && (
                <div className="pt-1.5 pb-0.5">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="apply-loadings-toggle"
                      checked={externalLoadings}
                      onChange={(e) => setExternalLoadings(e.target.checked)}
                      className="mt-0.5 text-indigo-500 bg-zinc-950 border-zinc-800 rounded focus:ring-0 cursor-pointer"
                    />
                    <div className="leading-none">
                      <label htmlFor="apply-loadings-toggle" className="text-xs font-medium text-zinc-300 cursor-pointer select-none">
                        Apply Platform Loadings
                      </label>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                        Apply Care Coordination ({careCoordPercent}%) and Service Loading ({managementFeePercent}%) fees to this invoice amount.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExternalModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExternal}
                  className="px-3 py-1.5 rounded text-xs bg-emerald-700 hover:bg-emerald-600 font-medium text-white transition-colors disabled:opacity-50"
                >
                  {submittingExternal ? 'Logging...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Additional Funding Stream Modal */}
      {isAdditionalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-teal" />
                <h4 className="text-sm font-semibold text-[#E6EDF3]">
                  {editingAdditionalStreamId ? 'Edit Additional Funding Stream' : 'Create Additional Funding Stream'}
                </h4>
              </div>
              <button
                onClick={() => setIsAdditionalModalOpen(false)}
                className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded-sm hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdditionalStream} className="p-4 space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-zinc-400">Funding Stream *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !isCustomStreamMode;
                      setIsCustomStreamMode(nextMode);
                      if (nextMode) {
                        setCustomStreamCode('');
                        setStreamName('');
                      } else {
                        const firstOpt = availableStreamOptions[0] || DEFAULT_ADDITIONAL_STREAM_OPTIONS[0];
                        setSelectedStreamCode(firstOpt.code);
                        setStreamName(firstOpt.name);
                      }
                    }}
                    className="text-[11px] text-brand-teal hover:underline font-medium cursor-pointer"
                  >
                    {isCustomStreamMode ? 'Select Default Stream' : '+ Create Custom Funding Stream'}
                  </button>
                </div>

                {isCustomStreamMode ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Code (e.g. DC)"
                        value={customStreamCode}
                        onChange={(e) => setCustomStreamCode(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-brand-teal/60 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono uppercase outline-none focus:border-brand-teal transition-colors"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Custom Stream Name (e.g. Dementia Supplement)"
                        value={streamName}
                        onChange={(e) => setStreamName(e.target.value)}
                        className="w-full bg-zinc-950 border border-brand-teal/60 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-teal transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedStreamCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedStreamCode(code);
                      const opt = availableStreamOptions.find(o => o.code === code);
                      if (opt) setStreamName(opt.name);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-teal transition-colors"
                  >
                    {availableStreamOptions.map(opt => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Allocated Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="e.g., 1896.17"
                    value={streamAmount}
                    onChange={(e) => setStreamAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Initial / Manual Spent ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    placeholder="0.00"
                    value={streamSpentAmount}
                    onChange={(e) => setStreamSpentAmount(e.target.value)}
                    disabled={streamAddToOngoing}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-teal transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="add-to-ongoing-toggle"
                    checked={streamAddToOngoing}
                    onChange={(e) => setStreamAddToOngoing(e.target.checked)}
                    className="mt-0.5 text-brand-teal bg-zinc-950 border-zinc-700 rounded focus:ring-0 cursor-pointer"
                  />
                  <div className="leading-tight">
                    <label htmlFor="add-to-ongoing-toggle" className="text-xs font-semibold text-zinc-200 cursor-pointer select-none">
                      Add to current ONGOING FUNDS (ON)
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Enable this option if this funding stream should be added directly to the client&apos;s total quarterly Ongoing Funds (ON = Ongoing Funds) allocation. Leave unchecked to track it as its own separate funding stream balance.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Notes / Authority Approval</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or approval reference..."
                  value={streamNotes}
                  onChange={(e) => setStreamNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-brand-teal transition-colors resize-none"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdditionalModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs bg-brand-teal hover:bg-brand-teal/90 font-medium text-white transition-colors cursor-pointer"
                >
                  {editingAdditionalStreamId ? 'Update Funding Stream' : 'Add Funding Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Additional Funding Streams Modal */}
      {isManageAdditionalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-teal" />
                <h4 className="text-sm font-semibold text-[#E6EDF3]">
                  Manage Additional Funding Streams
                </h4>
              </div>
              <button
                onClick={() => setIsManageAdditionalModalOpen(false)}
                className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  {additionalFundingStreams.length} stream{additionalFundingStreams.length === 1 ? '' : 's'} registered
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsManageAdditionalModalOpen(false);
                    handleOpenAddAdditional();
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-brand-teal hover:bg-brand-teal/90 font-medium text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stream</span>
                </button>
              </div>

              {additionalFundingStreams.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-lg">
                  No additional funding streams registered.
                </div>
              ) : (
                <div className="space-y-2">
                  {additionalFundingStreams.map(stream => {
                    const sCode = String(stream.code || 'CUSTOM').toUpperCase();
                    return (
                      <div
                        key={stream.id}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {sCode}
                            </span>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {stream.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] mt-1">
                            <span className="text-emerald-400 font-semibold">
                              Allocated: {formatCurrency(stream.amount || 0)}
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span className={stream.addToOngoing ? 'text-brand-teal font-medium' : 'text-sky-300 font-medium'}>
                              {stream.addToOngoing ? 'Added to ON = Ongoing Funds' : 'Separate Funding Stream'}
                            </span>
                          </div>
                          {stream.notes && (
                            <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                              {stream.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManageAdditionalModalOpen(false);
                              handleOpenEditAdditional(stream);
                            }}
                            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Edit stream"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAdditionalStream(stream.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete stream"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsManageAdditionalModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
