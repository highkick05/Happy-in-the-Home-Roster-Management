import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function TrilogyPlanningView() {
  const { token } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedQuarterIndex, setSelectedQuarterIndex] = useState<number>(1); // Default to Q1 or current
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        // Fix for funding_type matching
        const hcClients = data.filter((c: any) => c.funding_type === 'Home Care' || c.funding_type === 'HCP' || c.funding_type === 'HOME_CARE');
        setClients(hcClients);
      } catch (e) {
        console.error(e);
      }
    };
    fetchClients();
  }, [token]);

  // Generate Quarters based on selected client
  const quarters = useMemo(() => {
    const now = new Date();
    // Determine Financial Year start year (FY starts 30 Jun)
    const isPastJun30 = now.getMonth() > 5 || (now.getMonth() === 5 && now.getDate() >= 30);
    const fyStartYear = isPastJun30 ? now.getFullYear() : now.getFullYear() - 1;

    const baseQuarters = [
      { id: 1, label: "Quarter 1", start: new Date(fyStartYear, 5, 30), end: new Date(fyStartYear, 8, 30) },
      { id: 2, label: "Quarter 2", start: new Date(fyStartYear, 8, 30), end: new Date(fyStartYear, 11, 31) },
      { id: 3, label: "Quarter 3", start: new Date(fyStartYear, 11, 31), end: new Date(fyStartYear + 1, 2, 31) },
      { id: 4, label: "Quarter 4", start: new Date(fyStartYear + 1, 2, 31), end: new Date(fyStartYear + 1, 5, 30) }
    ];

    const client = clients.find(c => c.id.toString() === selectedClient);
    
    return baseQuarters.map(q => {
      let qStart = q.start;
      // Bridging quarter logic
      if (client && client.joined_date) {
        const joined = new Date(client.joined_date);
        if (!isNaN(joined.getTime()) && joined >= q.start && joined < q.end) {
          qStart = joined;
        }
      }

      const isCurrent = now >= q.start && now < q.end;
      const displayLabel = `${q.label}: ${format(qStart, 'd MMM')} - ${format(q.end, 'd MMM yyyy')}`;
      
      return {
        ...q,
        actualStart: qStart,
        displayLabel,
        isCurrent
      };
    });
  }, [clients, selectedClient]);

  // Set default quarter on load
  useEffect(() => {
    if (quarters.length > 0) {
      const current = quarters.findIndex(q => q.isCurrent);
      if (current !== -1) {
        setSelectedQuarterIndex(current);
      }
    }
  }, [quarters]);
  
  const fetchSummary = async (clientId: string, quarterIndex: number) => {
    if (!clientId) {
      setResults([]);
      return;
    }
    
    const activeQuarter = quarters[quarterIndex];
    if (!activeQuarter) return;

    // Convert dates to YYYY-MM-DD for API
    const startDate = activeQuarter.actualStart.toISOString().split('T')[0];
    const endDate = activeQuarter.end.toISOString().split('T')[0];
    
    setIsLoading(true);
    try {
      const client = clients.find(c => c.id.toString() === clientId);
      const clientName = client ? `${client.first_name} ${client.last_name}` : '';
      
      const res = await fetch(`/api/reports/trilogy-summary?client_name=${encodeURIComponent(clientName)}&start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedClient, selectedQuarterIndex);
  }, [selectedClient, selectedQuarterIndex, quarters]);


  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#E6EDF3] mb-1.5 tracking-tight">Trilogy Planning Summary</h1>
        <p className="text-[#8B949E] text-xs">Extract completed shifts and group them into fixed date blocks for Trilogy Care portal input.</p>
      </div>

      <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1 w-full md:max-w-md">
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">Home Care Client</label>
            <select 
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.15]"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 w-full md:max-w-md">
            <label className="block text-[10px] font-bold text-[#8B949E] uppercase tracking-wider mb-1.5">Budget Quarter</label>
            <select 
              value={selectedQuarterIndex} 
              onChange={e => setSelectedQuarterIndex(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-semibold tracking-wide text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.15]"
            >
              {quarters.map((q, idx) => (
                <option key={idx} value={idx}>
                  {q.displayLabel} {q.isCurrent ? ' (Current quarter)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((serviceGroup, idx) => (
            <div key={idx} className="bg-[#151515] border border-white/[0.05] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-black/40 border-b border-white/[0.05]">
                <h3 className="text-xs font-semibold tracking-wide text-[#E6EDF3]">{serviceGroup.service_name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-black/20">
                      <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">Dates</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Rate</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Hours / Week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {serviceGroup.blocks.map((block: any, bIdx: number) => (
                      <tr key={bIdx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2 text-xs font-semibold tracking-wide text-[#E6EDF3]">
                          {block.start_date ? format(new Date(block.start_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                          <span className="mx-1.5 text-zinc-500/80">to</span>
                          {block.end_date ? format(new Date(block.end_date + 'T12:00:00Z'), 'd MMM yyyy') : '-'}
                        </td>
                        <td className="px-4 py-2 text-xs font-semibold tracking-wide text-[#8B949E] text-right">${block.rate?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-xs font-semibold tracking-wide text-brand-teal text-right">{block.hours_per_week} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#151515] border border-white/[0.05] rounded-xl p-8 text-center shadow-sm">
          <p className="text-[#8B949E] text-xs font-semibold tracking-wide">
            {isLoading ? 'Loading data...' : 'No data generated. Ensure the selected client has COMPLETED shifts in this quarter.'}
          </p>
        </div>
      )}
    </div>
  );
}
