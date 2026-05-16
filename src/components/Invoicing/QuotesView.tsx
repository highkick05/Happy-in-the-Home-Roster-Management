import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, Trash2, Eye } from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';

function GenerateQuoteForm({ token, onGenerated, onClose }: { token: string | null, onGenerated: () => void, onClose: () => void }) {
  const [formData, setFormData] = useState({
    clientId: '',
    activityName: '',
    date: new Date().toISOString().split('T')[0],
    importantNotes: ''
  });
  
  const [selectedServices, setSelectedServices] = useState<{serviceId: string, qtyOverride: string}[]>([
    { serviceId: '', qtyOverride: '' }
  ]);
  
  const [options, setOptions] = useState<any>({ clients: [], services: [] });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/invoices/form-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      } else {
        console.error('Failed to fetch options:', await res.text());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const clientPersonalisedServices = React.useMemo(() => {
    if (!formData.clientId) return options.services || [];
    const clientRecord = options.clients.find((c: any) => String(c.id) === String(formData.clientId));
    if (!clientRecord || !clientRecord.service_ids || clientRecord.service_ids.length === 0) {
      return options.services || [];
    }
    const selectedServiceIds = selectedServices.map(s => Number(s.serviceId)).filter(id => !isNaN(id));
    return (options.services || []).filter((s: any) => clientRecord.service_ids.includes(s.id) || selectedServiceIds.includes(s.id));
  }, [formData.clientId, options.clients, options.services, selectedServices]);

  const getServiceDetails = (serviceId: string) => {
    if (!serviceId) return { rate: 0, unit: '', name: '' };
    const s = options.services.find((x: any) => x.id === Number(serviceId));
    return s ? { rate: Number(s.rate), unit: s.unit, name: s.name } : { rate: 0, unit: '', name: '' };
  };

  const addService = () => setSelectedServices([...selectedServices, { serviceId: '', qtyOverride: '' }]);
  const removeService = (index: number) => {
    if (selectedServices.length === 1) return;
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };
  const updateService = (index: number, field: 'serviceId' | 'qtyOverride', value: string) => {
    const fresh = [...selectedServices];
    fresh[index][field] = value;
    setSelectedServices(fresh);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validServices = selectedServices.filter(s => s.serviceId);
    if (validServices.length === 0) {
      alert("Please select at least one service.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          services: validServices
        })
      });
      if (res.ok) {
        onGenerated();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to generate');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading form options...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Client</label>
          <select
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none"
            value={formData.clientId}
            onChange={e => {
              setFormData({ ...formData, clientId: e.target.value });
              setSelectedServices([{ serviceId: '', qtyOverride: '' }]);
            }}
          >
            <option value="">Select Client</option>
            {options.clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date of Activity</label>
          <input
            type="date"
            required
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Service Activity Title</label>
        <input
          type="text"
          required
          placeholder="e.g. Kalbarri National Park & Skywalk Trip"
          className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-sm"
          value={formData.activityName}
          onChange={e => setFormData({ ...formData, activityName: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Line Items</label>
          <button 
            type="button" 
            onClick={addService}
            className="text-[10px] text-brand-teal hover:text-brand-teal font-bold uppercase tracking-widest flex items-center"
          >
            <span className="text-base mr-1">+</span> Add Item
          </button>
        </div>
        
        <div className="space-y-2 pb-2">
          {selectedServices.map((row, idx) => {
            const { rate, unit } = getServiceDetails(row.serviceId);
            const qty = Number(row.qtyOverride) || 0;
            const subtotal = qty * rate;

            return (
              <div key={idx} className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600">
                <div className="flex items-center space-x-2 mb-1.5 pr-8">
                  <div className="flex-1 min-w-0">
                    <select
                      required
                      className="w-full bg-[#09090b] border border-white/[0.08] rounded py-1 px-2 text-white text-xs focus:ring-1 focus:ring-brand-teal outline-none truncate"
                      value={row.serviceId}
                      onChange={e => updateService(idx, 'serviceId', e.target.value)}
                    >
                      <option value="">Select Service</option>
                      {clientPersonalisedServices.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeService(idx)}
                  className="absolute right-1 top-1 p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Remove Item"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-lg leading-none">&times;</div>
                </button>
                {row.serviceId && (
                  <div className="flex md:items-center justify-between text-[11px] bg-[#09090b]/50 p-1.5 rounded border border-white/[0.08]/50 mt-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="text-zinc-500 font-medium mr-1.5">Unit</span>
                        <span className="text-zinc-300">{unit}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-medium mr-1.5">Rate</span>
                        <span className="text-zinc-300">${rate.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-zinc-500 font-medium mr-1.5">Qty</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={row.qtyOverride}
                          onChange={(e) => updateService(idx, 'qtyOverride', e.target.value)}
                          placeholder="0"
                          className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                        />
                      </div>
                    </div>
                    <div className="font-semibold text-white ml-2 text-right">
                      ${subtotal.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Important Notes Override (Optional)</label>
        <textarea
          rows={3}
          placeholder="Leave blank to use default notes..."
          className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none text-sm resize-none custom-scrollbar"
          value={formData.importantNotes}
          onChange={e => setFormData({ ...formData, importantNotes: e.target.value })}
        />
      </div>

      <div className="pt-2 border-t border-white/[0.08] flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-brand-blue hover:bg-brand-teal disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
        >
          {submitting ? 'Generating...' : 'Generate Quote'}
        </button>
      </div>
    </form>
  );
}

export default function QuotesView() {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await fetch('/api/quotes', { headers: { Authorization: `Bearer ${token}` } });
      setQuotes(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const s = searchTerm.toLowerCase();
    const nameStr = `${q.client_first_name} ${q.client_last_name}`.toLowerCase();
    const idStr = q.quote_number.toLowerCase();
    return nameStr.includes(s) || idStr.includes(s) || q.activity_name.toLowerCase().includes(s);
  });

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === filteredQuotes.length && filteredQuotes.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredQuotes.map(q => q.id));
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} quotes?`)) return;
    try {
      const res = await fetch('/api/quotes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quoteIds: selectedIds })
      });
      if (res.ok) fetchQuotes();
    } catch (e) { console.error(e); }
  };

  const handleDeleteSingle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchQuotes();
    } catch (e) { console.error(e); }
  };

  const downloadPDF = async (id: number, numberStr: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${numberStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF');
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {showGenerateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-navy border border-border-subtle rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-x-auto flex flex-col">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-brand-bg">
              <div>
                <h3 className="text-lg font-medium text-[#E6EDF3] mb-4">Generate Service Quote</h3>
                <p className="text-sm text-[#8B949E] mt-1">Configure service and cost details for a new quote.</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="w-10 h-10 flex items-center justify-center bg-brand-navy border border-border-subtle hover:border-brand-blue rounded-md text-[#E6EDF3] transition-colors">
                ×
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <GenerateQuoteForm token={token} onGenerated={() => fetchQuotes()} onClose={() => setShowGenerateModal(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center space-x-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center shadow-sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.length})
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 bg-brand-navy border border-border-subtle rounded-md text-sm text-[#E6EDF3] focus:outline-none focus:ring-1 focus:ring-brand-teal w-64 transition-colors"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8B949E]" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors">&times;</button>}
          </div>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-[13px] font-medium rounded-md transition-all shadow-sm w-full justify-center md:w-auto"
        >
          Generate Quote
        </button>
      </div>

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-x-auto flex flex-col shadow-sm">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[#8B949E]">Loading quotes...</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-brand-bg border-b border-border-subtle text-xs uppercase tracking-wider text-[#8B949E] sticky top-0 z-10 transition-colors">
                  <th className="px-4 py-4 font-semibold w-12">
                    <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedIds.length === filteredQuotes.length && filteredQuotes.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Quote ID</th>
                  <th className="px-4 py-4 font-semibold">Client</th>
                  <th className="px-4 py-4 font-semibold">Activity</th>
                  <th className="px-4 py-4 font-semibold">Amount</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredQuotes.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-[#8B949E]">No quotes found.</td></tr>
                ) : filteredQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-brand-bg/50 transition-colors group">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded border-border-subtle bg-brand-navy text-brand-teal focus:ring-brand-teal focus:ring-offset-brand-navy" checked={selectedIds.includes(q.id)} onChange={() => toggleSelection(q.id)} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-[#E6EDF3]">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-[#E6EDF3]">{q.quote_number}</td>
                    <td className="px-4 py-4 text-[#E6EDF3]">{q.client_first_name} {q.client_last_name}</td>
                    <td className="px-4 py-4 text-[#E6EDF3]">{q.activity_name}</td>
                    <td className="px-4 py-4 font-medium text-[#E6EDF3]">${Number(q.amount).toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-brand-bg text-[#8B949E] border border-border-subtle">{q.status}</span>
                    </td>
                    <td className="px-4 py-4 text-right flex items-center justify-end space-x-1">
                      <button title="Download PDF" onClick={() => downloadPDF(q.id, q.quote_number)} className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded-md transition-colors"><Download className="w-4 h-4" /></button>
                      <button title="Delete Quote" onClick={() => handleDeleteSingle(q.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
