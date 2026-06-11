import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, RefreshCw, X, FileText, CheckCircle2, Calendar, Pencil } from 'lucide-react';
import { motion } from 'motion/react';

export default function NdisBudgetView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalAgreementValue: number;
    totalClaimed: number;
    totalRemainingBalance: number;
    items: any[];
  }>({
    totalAgreementValue: 0,
    totalClaimed: 0,
    totalRemainingBalance: 0,
    items: []
  });
  const [client, setClient] = useState<any>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientRes = await fetch(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (clientRes.ok) {
         const clientData = await clientRes.json();
         setClient(clientData);
         
         const defaultStart = clientData.joined_date ? new Date(clientData.joined_date) : new Date();
         const defaultEnd = new Date(defaultStart);
         defaultEnd.setFullYear(defaultStart.getFullYear() + 1);

         setStartDate(clientData.ndis_agreement_start_date || defaultStart.toISOString().split('T')[0]);
         setEndDate(clientData.ndis_agreement_end_date || defaultEnd.toISOString().split('T')[0]);
      }
      const budgetRes = await fetch(`/api/clients/${id}/ndis-budget`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (budgetRes.ok) {
         setData(await budgetRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val || 0);
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const daysRemaining = () => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };
  
  const totalDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };
  
  const timeElapsedPct = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const daysElapsed = Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    return Math.min(100, (daysElapsed / totalDays()) * 100);
  };
  
  const fundsUtilizedPct = () => {
    if (!data.totalAgreementValue) return 0;
    return Math.min(100, (data.totalClaimed / data.totalAgreementValue) * 100);
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8B949E]">Loading NDIS Service Agreement...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-red-500">Client not found.</div>;
  }

  return (
    <div className="w-full flex flex-col h-full space-y-6">
      {/* SERVICE AGREEMENT METADATA HEADER */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/clients/${id}`)}
            className="p-2 -ml-2 text-[#8B949E] hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-sans font-semibold text-[#E6EDF3] tracking-tight">
              Service Agreement Tracking
            </h2>
            <div className="flex items-center text-sm mt-1 text-[#8B949E] space-x-2">
              <span className="font-medium text-[#E6EDF3]">{client.first_name} {client.last_name}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">NDIS</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-6 bg-black/40 border border-white/[0.08] px-4 py-2 rounded-lg">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Start Date</span>
            <div className="flex items-center group cursor-pointer gap-1.5 mt-0.5">
              <span className="text-sm font-medium text-[#E6EDF3]">{formatDate(startDate)}</span>
              <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-sky-400 transition-colors" />
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">End Date</span>
            <span className="text-sm font-medium text-[#E6EDF3] mt-0.5">{formatDate(endDate)}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
              {daysRemaining()} Days Remaining
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-6 space-y-6">
        
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-zinc-400 text-sm font-medium mb-1">Total Agreement Funds</div>
            <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(data.totalAgreementValue)}</div>
          </div>
          <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-zinc-400 text-sm font-medium mb-1">Total Claims / Utilized</div>
            <div className="text-3xl font-bold text-[#E6EDF3]">{formatCurrency(data.totalClaimed)}</div>
          </div>
          <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-zinc-400 text-sm font-medium mb-1">Available Balance</div>
            <div className="text-3xl font-bold text-emerald-400">
               {formatCurrency(data.totalRemainingBalance)}
            </div>
          </div>
        </div>
        
        {/* HIGH-DENSITY BUDGET CONSUMPTION TIMELINE */}
        <div className="bg-zinc-900 border border-white/[0.08] rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-[15px] font-semibold text-[#E6EDF3] mb-4">Funding Consumption Timeline</h3>
          
          <div className="relative w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${fundsUtilizedPct()}%` }}
            />
            {/* Time Marker Overlay */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 box-content"
              style={{ left: `${timeElapsedPct()}%` }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-red-400" />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-zinc-400">0%</span>
            <span className="text-xs font-mono text-zinc-300">
              Financial Burn: <span className="text-indigo-400 font-semibold">{fundsUtilizedPct().toFixed(1)}% Utilized</span> vs. <span className="text-red-400 font-semibold">{timeElapsedPct().toFixed(1)}% Time Elapsed</span>
            </span>
            <span className="text-xs text-zinc-400">100%</span>
          </div>
        </div>

        {/* Support Items Table */}
        <div className="bg-zinc-900 border border-white/[0.08] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-black/20">
            <h3 className="text-[15px] font-semibold text-[#E6EDF3] flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Service Agreement Support Items
            </h3>
            <button 
              onClick={fetchData}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white/[0.08] text-zinc-300 text-xs rounded-md transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#1C2128]/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08] w-48">Support Item Code</th>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08]">Support Item Name</th>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08] text-right">Hours (Alloc. vs Deliv.)</th>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08] text-right">Allocated Budget</th>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08] text-right">Amount Spent</th>
                  <th className="px-4 py-3 font-semibold text-zinc-400 uppercase tracking-wider text-[11px] border-b border-white/[0.08] text-right rounded-tr-lg">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] bg-zinc-900">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No NDIS services assigned to this client yet.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.05 }} 
                      key={item.supportItemCode || idx} 
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-[#E6EDF3] font-mono text-[12px]">{item.supportItemCode || 'CUSTOM'}</td>
                      <td className="px-4 py-3 text-[#E6EDF3]">{item.supportItemName || 'Unnamed Support'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-right font-mono">
                        <span className="text-zinc-500">{item.allocatedHours?.toFixed(1) || '0.0'} h</span>
                        <span className="mx-1">/</span>
                        <span className="text-indigo-300">{item.deliveredHours?.toFixed(1) || '0.0'} h</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-right font-mono">
                        {formatCurrency(item.allocatedBudget || 0)}
                      </td>
                      <td className="px-4 py-3 text-indigo-300 text-right font-mono">
                        {formatCurrency(item.amountSpent || 0)}
                      </td>
                      <td className={`px-4 py-3 font-mono text-right font-medium ${item.remainingBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(item.remainingBalance || 0)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
