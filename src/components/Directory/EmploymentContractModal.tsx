import React, { useState, useEffect } from 'react';
import { X, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  staffMember: any;
  onClose: () => void;
}

export default function EmploymentContractModal({ staffMember, onClose }: Props) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    employmentType: 'Casual',
    positionTitle: 'Support Worker',
    schadsLevel: 'Level 1',
    schadsPayPoint: 'Pay Point 1',
    baseHourlyRate: '',
    industrialInstrument: 'Social, Community, Home Care and Disability Services Industry Award 2010 [MA000100]',
    contractDate: new Date().toISOString().split('T')[0],
    commencementDate: new Date().toISOString().split('T')[0],
    probationPeriod: '6 Months',
    positionDescription: ''
  });

  const positionTitles = [
    'Support Worker',
    'Registered Nurse',
    'Enrolled Nurse',
    'Clinical Coordinator',
    'Administrator',
    'Gardener',
    'Home Maintenance Worker'
  ];

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/settings/position-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        
        // Auto-fill initial description if match exists
        setFormData(prev => {
          const match = data.find((t: any) => t.position_title === prev.positionTitle);
          if (match && !prev.positionDescription) {
            return { ...prev, positionDescription: match.description_text };
          }
          return prev;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTitle = e.target.value;
    const match = templates.find(t => t.position_title === newTitle);
    
    setFormData(prev => ({
      ...prev,
      positionTitle: newTitle,
      positionDescription: match ? match.description_text : ''
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      const res = await fetch('/api/settings/position-templates', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          position_title: formData.positionTitle,
          description_text: formData.positionDescription
        })
      });
      
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        fetchTemplates(); // refresh
      }
    } catch (e) {
      console.error("Failed to save template", e);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/staff/${staffMember.id}/generate-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...formData, 
          staffName: `${staffMember.first_name} ${staffMember.last_name}`, 
          address: staffMember.address || ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Employment_Contract_${staffMember.first_name}_${staffMember.last_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onClose();
    } catch (e) {
      console.error("Contract Error", e);
      alert('Failed to generate contract');
    } finally {
      setLoading(false);
    }
  };

  const staffFullName = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim();
  const staffAddress = staffMember.address || 'Address not provided';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
          <div>
            <h3 className="text-lg font-semibold text-white">Employment Contract Generator</h3>
            <p className="text-sm text-zinc-400 mt-1">{staffFullName} • {staffAddress}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1 */}
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Employment Type</label>
                <select 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.employmentType} onChange={e => setFormData(p => ({ ...p, employmentType: e.target.value }))}
                >
                  <option>Casual</option>
                  <option>Part-Time</option>
                  <option>Full-Time</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Position Title</label>
                <select 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.positionTitle} onChange={handlePositionChange}
                >
                  {positionTitles.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">SCHADS Classification</label>
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                    value={formData.schadsLevel} onChange={e => setFormData(p => ({ ...p, schadsLevel: e.target.value }))}
                  >
                    {[1,2,3,4,5,6,7,8].map(l => <option key={l}>Level {l}</option>)}
                  </select>
                  <select 
                    className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                    value={formData.schadsPayPoint} onChange={e => setFormData(p => ({ ...p, schadsPayPoint: e.target.value }))}
                  >
                    {[1,2,3,4].map(p => <option key={p}>Pay Point {p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Base Hourly Ordinary Rate ($)</label>
                <input 
                  type="number" step="0.01" 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.baseHourlyRate} onChange={e => setFormData(p => ({ ...p, baseHourlyRate: e.target.value }))}
                />
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Industrial Instrument</label>
                <input 
                  type="text"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.industrialInstrument} onChange={e => setFormData(p => ({ ...p, industrialInstrument: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contract Date</label>
                <input 
                  type="date"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  value={formData.contractDate} onChange={e => setFormData(p => ({ ...p, contractDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Commencement Date</label>
                <input 
                  type="date"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  value={formData.commencementDate} onChange={e => setFormData(p => ({ ...p, commencementDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Probation Period</label>
                <select 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.probationPeriod} onChange={e => setFormData(p => ({ ...p, probationPeriod: e.target.value }))}
                >
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>None</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[12px] font-medium text-zinc-400">Position Description</label>
              <button onClick={handleSaveTemplate} className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 transition-colors">
                {saveSuccess ? <><Check className="w-3.5 h-3.5" /> Saved!</> : `Save as Default Template for ${formData.positionTitle}`}
              </button>
            </div>
            <textarea
              rows={8}
              className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-3 text-[13px] text-white outline-none focus:border-brand-blue resize-none"
              value={formData.positionDescription} onChange={e => setFormData(p => ({ ...p, positionDescription: e.target.value }))}
              placeholder="Enter position description..."
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-zinc-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 bg-zinc-800 rounded-md transition-colors border border-white/[0.05]">
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{loading ? 'Generating...' : 'Generate PDF Document'}</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}
