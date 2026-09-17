import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function TrilogyPlanningView() {
  const { token } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const hcClients = data.filter((c: any) => c.funding_type === 'Home Care');
        setClients(hcClients);
      } catch (e) {
        console.error(e);
      }
    };
    fetchClients();
  }, [token]);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !startDate || !endDate) return;
    
    setIsLoading(true);
    try {
      const client = clients.find(c => c.id.toString() === selectedClient);
      const clientName = client ? `${client.first_name} ${client.last_name}` : '';
      
      const res = await fetch(`/api/reports/trilogy-summary?client_name=${encodeURIComponent(clientName)}&start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#E6EDF3] mb-2 tracking-tight">Trilogy Planning Summary</h1>
        <p className="text-[#8B949E] text-sm">Extract completed shifts and group them into fixed date blocks for Trilogy Care portal input.</p>
      </div>

      <div className="bg-[#151515] border border-white/[0.05] rounded-2xl p-6 mb-8 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">Home Care Client</label>
            <select 
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand-teal transition-colors hover:border-white/[0.15]"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand-teal transition-colors [color-scheme:dark] hover:border-white/[0.15]"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none focus:border-brand-teal transition-colors [color-scheme:dark] hover:border-white/[0.15]"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full md:w-auto h-[42px] px-6 bg-[#E6EDF3] hover:bg-white text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(230,237,243,0.1)] hover:shadow-[0_0_20px_rgba(230,237,243,0.2)]"
          >
            <Search className="w-4 h-4" />
            {isLoading ? 'Generating...' : 'Generate Summary'}
          </button>
        </form>
      </div>

      <div className="bg-[#151515] border border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] bg-black/20">
                <th className="px-6 py-4 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider">Service Name</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Rate</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider text-center">Start Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider text-center">End Date</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[#8B949E] uppercase tracking-wider text-right">Hours / Week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {results.length > 0 ? (
                results.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-[14px] text-[#E6EDF3] font-medium">{row.service_name}</td>
                    <td className="px-6 py-4 text-[14px] text-[#8B949E] text-right font-mono">${row.rate?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-[14px] text-[#8B949E] text-center">{row.start_date}</td>
                    <td className="px-6 py-4 text-[14px] text-[#8B949E] text-center">{row.end_date}</td>
                    <td className="px-6 py-4 text-[14px] text-brand-teal text-right font-medium">{row.hours_per_week} hrs</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[#8B949E] text-sm">
                    {isLoading ? 'Loading data...' : 'No data generated. Select a client and date range to view summary.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
