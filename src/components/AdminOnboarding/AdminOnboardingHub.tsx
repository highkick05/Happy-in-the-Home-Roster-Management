import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileCheck, Edit, Video, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Position {
  id: number;
  name: string;
}

interface Step {
  id: number;
  position_id: number;
  title: string;
  description: string;
  media_url: string;
  requires_expiry: number;
  upload_required: number;
  is_mandatory: number;
}

export default function AdminOnboardingHub() {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  
  const [isEditing, setIsEditing] = useState<number | null>(null); // step id
  const [editForm, setEditForm] = useState<Partial<Step>>({});

  useEffect(() => {
    fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPositions(data);
          if (data.length > 0) setSelectedPositionId(data[0].id);
        }
      });
  }, [token]);

  useEffect(() => {
    fetch('/api/admin/onboarding-steps', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSteps(data);
      });
  }, [token]);

  const currentSteps = steps.filter(s => s.position_id === selectedPositionId);

  const handleAddStep = async () => {
    if (!selectedPositionId) return;
    try {
      const res = await fetch('/api/admin/onboarding-steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          position_id: selectedPositionId,
          title: 'New Onboarding Step',
          description: '',
          media_url: '',
          requires_expiry: 0,
          upload_required: 1,
          is_mandatory: 1
        })
      });
      const newStep = await res.json();
      setSteps(prev => [...prev, newStep]);
      setIsEditing(newStep.id);
      setEditForm(newStep);
    } catch(e) {}
  };

  const handleSaveStep = async (id: number) => {
    try {
      await fetch(`/api/admin/onboarding-steps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      setSteps(prev => prev.map(s => s.id === id ? { ...s, ...editForm } as Step : s));
      setIsEditing(null);
    } catch(e) {}
  };

  const handleDeleteStep = async (id: number) => {
    if (!confirm('Delete this step?')) return;
    try {
      await fetch(`/api/admin/onboarding-steps/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSteps(prev => prev.filter(s => s.id !== id));
    } catch(e) {}
  };

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="mb-4 flex flex-col gap-0.5 border-b border-white/[0.05] pb-3">
          <h1 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Onboarding Hub Manager</h1>
          <p className="text-xs text-zinc-500">Design specific onboarding flows and requirements for different staff positions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-[#111111] rounded-xl border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
            <div className="p-4 border-b border-white/[0.08] bg-black/20">
              <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider">Select Position</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {positions.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-4">No positions available.</div>
              ) : (
                positions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPositionId(p.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-[13px] transition-all flex items-center justify-between group ${
                      selectedPositionId === p.id 
                        ? 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20' 
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-3 bg-[#111111] rounded-xl border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
            {!selectedPositionId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Select a position to configure its onboarding steps.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/[0.08] bg-black/20 flex justify-between items-center">
                  <h2 className="text-[14px] font-medium text-white flex items-center gap-2">
                    Steps for <span className="text-brand-teal font-semibold">{positions.find(p => p.id === selectedPositionId)?.name}</span>
                  </h2>
                  <button 
                    onClick={handleAddStep}
                    className="flex items-center px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-black text-xs font-semibold rounded-md transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Step
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {currentSteps.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                      <FileCheck className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400 text-sm">No onboarding steps defined for this position.</p>
                    </div>
                  ) : (
                    currentSteps.map((step, idx) => (
                      <div key={step.id} className="bg-black/20 border border-white/[0.08] rounded-xl overflow-hidden">
                        {isEditing === step.id ? (
                          <div className="p-5 space-y-4">
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Step Title</label>
                              <input 
                                value={editForm.title}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[14px] text-white outline-none focus:border-brand-teal transition-colors"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Instructions / Description</label>
                              <textarea 
                                value={editForm.description}
                                onChange={e => setEditForm({...editForm, description: e.target.value})}
                                rows={3}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors resize-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Media URL (Video/Image Link)</label>
                              <div className="flex relative">
                                <Video className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                                <input 
                                  value={editForm.media_url}
                                  onChange={e => setEditForm({...editForm, media_url: e.target.value})}
                                  placeholder="e.g. https://youtube.com/... or https://example.com/image.png"
                                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors"
                                />
                              </div>
                            </div>

                            <label className="flex items-center space-x-3 cursor-pointer group">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors \${editForm.requires_expiry ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}`}>
                                {editForm.requires_expiry ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={!!editForm.requires_expiry}
                                onChange={e => setEditForm({...editForm, requires_expiry: e.target.checked ? 1 : 0})}
                              />
                              <div>
                                <span className="text-[13px] text-zinc-200 font-medium block">Track Expiry via Cron Engine</span>
                                <span className="text-[11px] text-zinc-500 block">Staff will receive alerts when documents uploaded here expire.</span>
                              </div>
                            </label>

                            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
                              <button 
                                onClick={() => setIsEditing(null)}
                                className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleSaveStep(step.id)}
                                className="px-4 py-2 bg-brand-teal text-black text-[13px] font-medium rounded-lg hover:bg-brand-teal/90 transition-colors flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" /> Save Step
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0 mt-1">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
                                  {step.requires_expiry === 1 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                      <AlertCircle className="w-3 h-3" /> Expiry Tracked
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setIsEditing(step.id); setEditForm(step); }} className="p-1.5 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-colors">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              {step.description && (
                                <p className="text-[13px] text-zinc-400 mt-2 leading-relaxed whitespace-pre-wrap">{step.description}</p>
                              )}
                              {step.media_url && (
                                <div className="mt-3 flex items-center gap-2 text-[12px] text-brand-blue">
                                  <Video className="w-3.5 h-3.5" /> Media Attached
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
