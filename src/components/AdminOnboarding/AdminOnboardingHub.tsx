import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileCheck, Edit, Video, AlertCircle, Users, Briefcase, Globe, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PositionsModal from '../Directory/PositionsModal';
import EditorJSWrapper from '../ProgressNotes/EditorJSWrapper';

interface Position {
  id: number;
  name: string;
}

interface Step {
  id: number;
  position_id: number | null;
  is_all_staff?: number;
  title: string;
  description: string;
  media_url: string;
  requires_expiry: number;
  upload_required: number;
  is_mandatory: number;
  expiry_years: number;
}

const getPreviewText = (desc: string) => {
  if (!desc) return '';
  try {
    if (desc.trim().startsWith('{')) {
      const data = JSON.parse(desc);
      if (data.blocks) {
        return data.blocks.map((b: any) => {
          if (b.type === 'paragraph' || b.type === 'header') return b.data?.text || '';
          if (b.type === 'list') return b.data?.items?.join(', ') || '';
          return '';
        }).filter(Boolean).join(' ').replace(/<[^>]*>?/gm, '');
      }
    }
  } catch(e) {}
  return desc.replace(/<[^>]*>?/gm, '');
};

export default function AdminOnboardingHub() {
  const { token } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<number | 'all_staff' | null>('all_staff');
  const [steps, setSteps] = useState<Step[]>([]);
  
  const [isEditing, setIsEditing] = useState<number | null>(null); // step id
  const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Step>>({});
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/files?folderPath=/System/OnboardingMedia', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.id) {
         setEditForm(prev => ({ ...prev, media_url: `/api/files/download/${data.id}` }));
      } else {
         alert('Failed to upload media.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during upload.');
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const fetchPositions = () => {
    fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPositions(data);
        }
      });
  };

  useEffect(() => {
    fetchPositions();
  }, [token]);

  useEffect(() => {
    fetch('/api/admin/onboarding-steps', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSteps(data);
      });
  }, [token]);

  const currentSteps = selectedPositionId === 'all_staff'
    ? steps.filter(s => s.is_all_staff === 1 || (!s.position_id && s.is_all_staff !== 0))
    : steps.filter(s => s.position_id === selectedPositionId && !s.is_all_staff);

  const allStaffStepsCount = steps.filter(s => s.is_all_staff === 1 || (!s.position_id && s.is_all_staff !== 0)).length;

  const handleAddStep = () => {
    if (!selectedPositionId) return;
    const tempId = -Date.now();
    const isAllStaff = selectedPositionId === 'all_staff';
    const newStep: any = {
      id: tempId,
      position_id: isAllStaff ? null : selectedPositionId,
      is_all_staff: isAllStaff ? 1 : 0,
      title: isAllStaff ? 'General Staff Requirement' : 'New Onboarding Step',
      description: '',
      media_url: '',
      requires_expiry: 0,
      expiry_years: 1,
      upload_required: 1,
      is_mandatory: 1
    };
    setSteps(prev => [...prev, newStep]);
    setIsEditing(tempId);
    setEditForm(newStep);
  };

  const handleSaveStep = async (id: number) => {
    try {
      if (id < 0) {
        // It's a new step, POST to create it
        const payload = {
          ...editForm,
          is_all_staff: selectedPositionId === 'all_staff' ? 1 : 0,
          position_id: selectedPositionId === 'all_staff' ? null : selectedPositionId
        };
        const res = await fetch('/api/admin/onboarding-steps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const createdStep = await res.json();
        setSteps(prev => prev.map(s => s.id === id ? createdStep : s));
      } else {
        // Existing step, PUT to update
        await fetch(`/api/admin/onboarding-steps/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(editForm)
        });
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...editForm } as any : s));
      }
      setIsEditing(null);
    } catch(e) {}
  };

  const handleCancelEdit = (id: number) => {
    if (id < 0) {
      setSteps(prev => prev.filter(s => s.id !== id));
    }
    setIsEditing(null);
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
      <div className="w-full mx-auto space-y-4">
        <div className="mb-4 flex flex-col gap-0.5 border-b border-white/[0.05] pb-3">
          <h1 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Onboarding Hub Manager</h1>
          <p className="text-xs text-zinc-500">Design universal onboarding flows and role-specific requirements for your team</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-[#111111] rounded-xl border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
            <div className="p-4 border-b border-white/[0.08] bg-black/20 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-wider">Sections & Roles</h2>
              <button 
                onClick={() => setIsPositionsModalOpen(true)}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-md transition-all border border-white/10"
              >
                Manage Positions
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Universal All Staff Section */}
              <div className="space-y-1">
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                  <span>Universal Section</span>
                  <span className="text-[10px] text-brand-teal/90 bg-brand-teal/10 px-1.5 py-0.5 rounded font-medium border border-brand-teal/20">
                    Always First
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedPositionId('all_staff')}
                  className={`w-full text-left px-3.5 py-3 rounded-lg text-[13px] transition-all flex items-center justify-between group ${
                    selectedPositionId === 'all_staff'
                      ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white border border-white/[0.06] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      selectedPositionId === 'all_staff' ? 'bg-brand-teal text-black' : 'bg-white/10 text-zinc-400 group-hover:text-zinc-200'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold leading-tight truncate">All Staff (General)</div>
                      <div className="text-[11px] text-zinc-500 font-normal truncate">Applies to all staff</div>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    selectedPositionId === 'all_staff'
                      ? 'bg-brand-teal/20 text-brand-teal'
                      : 'bg-white/5 text-zinc-400'
                  }`}>
                    {allStaffStepsCount}
                  </span>
                </button>
              </div>

              {/* Position Specific Flows */}
              <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
                  <span>By Position</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{positions.length} Positions</span>
                </div>
                {positions.length === 0 ? (
                  <div className="text-sm text-zinc-500 text-center py-4">No positions available.</div>
                ) : (
                  positions.map(p => {
                    const stepCount = steps.filter(s => s.position_id === p.id && !s.is_all_staff).length;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPositionId(p.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] transition-all flex items-center justify-between group ${
                          selectedPositionId === p.id 
                            ? 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20' 
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Briefcase className="w-3.5 h-3.5 opacity-60 shrink-0" />
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          selectedPositionId === p.id ? 'bg-brand-teal/20 text-brand-teal' : 'bg-white/5 text-zinc-500'
                        }`}>
                          {stepCount}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-[#111111] rounded-xl border border-white/[0.08] overflow-hidden flex flex-col h-[calc(100vh-160px)]">
            {!selectedPositionId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                Select a section or position to configure its onboarding steps.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/[0.08] bg-black/20 flex justify-between items-center">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-[14px] font-medium text-white flex items-center gap-2">
                      Steps for{' '}
                      <span className="text-brand-teal font-semibold">
                        {selectedPositionId === 'all_staff' 
                          ? 'All Staff (General)' 
                          : positions.find(p => p.id === selectedPositionId)?.name}
                      </span>
                    </h2>
                    <span className="text-[11px] text-zinc-500">
                      {selectedPositionId === 'all_staff'
                        ? 'Configurable universal requirements that show as the first section for all staff members'
                        : 'Role-specific onboarding steps for staff assigned to this position'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={handleAddStep}
                    className="flex items-center px-3 py-1.5 bg-brand-teal hover:bg-brand-teal/90 text-black text-xs font-semibold rounded-md transition-all shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Step
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {currentSteps.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                      <FileCheck className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400 text-sm">
                        {selectedPositionId === 'all_staff'
                          ? 'No universal onboarding steps defined yet. Click "Add Step" to create one.'
                          : 'No onboarding steps defined for this position.'}
                      </p>
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
                              <div className="border border-white/[0.08] rounded-lg overflow-hidden bg-black/40">
                                <EditorJSWrapper 
                                  initialData={editForm.description}
                                  onChange={(data) => setEditForm({...editForm, description: JSON.stringify(data)})}
                                  minHeight={250}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Media URL (Video/Image Link)</label>
                              <div className="flex gap-2">
                                <div className="flex relative flex-1">
                                  <Video className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                                  <input 
                                    value={editForm.media_url}
                                    onChange={e => setEditForm({...editForm, media_url: e.target.value})}
                                    placeholder="e.g. https://youtube.com/... or https://example.com/video.mp4"
                                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors"
                                  />
                                </div>
                                <label className="flex items-center gap-2 px-4 py-2 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 rounded-lg cursor-pointer transition-colors text-[13px] font-medium whitespace-nowrap">
                                  {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                  Upload Media
                                  <input 
                                    type="file" 
                                    accept="video/*,image/*" 
                                    className="hidden"
                                    onChange={handleMediaUpload}
                                    disabled={isUploadingMedia}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-2 pb-3">
                              <div 
                                onClick={() => setEditForm({...editForm, upload_required: editForm.upload_required ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editForm.upload_required ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}`}>
                                  {editForm.upload_required ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Upload Required</span>
                                  <span className="text-[11px] text-zinc-500 block">Require staff to upload a document. If unchecked, staff will instead check a box to confirm they have read and understood.</span>
                                </div>
                              </div>

                              <div 
                                onClick={() => setEditForm({...editForm, is_mandatory: editForm.is_mandatory ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editForm.is_mandatory ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}`}>
                                  {editForm.is_mandatory ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Mandatory Step</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff cannot be rostered until this step is completed.</span>
                                </div>
                              </div>

                              <div 
                                onClick={() => setEditForm({...editForm, requires_expiry: editForm.requires_expiry ? 0 : 1})}
                                className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.05] rounded-lg cursor-pointer group hover:bg-black/40 transition-colors"
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editForm.requires_expiry ? 'bg-brand-teal border-brand-teal' : 'bg-black/40 border-white/[0.08] group-hover:border-white/20'}`}>
                                  {editForm.requires_expiry ? <FileCheck className="w-3.5 h-3.5 text-black" /> : null}
                                </div>
                                <div>
                                  <span className="text-[13px] text-zinc-200 font-medium block">Track Expiry via Cron Engine</span>
                                  <span className="text-[11px] text-zinc-500 block">Staff will receive alerts when documents uploaded here expire.</span>
                                </div>
                              </div>
                              {editForm.requires_expiry === 1 && (
                                <div className="p-3 bg-black/20 border border-white/[0.05] rounded-lg mt-1">
                                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Expiry Duration</label>
                                  <select
                                    value={editForm.expiry_years || 1}
                                    onChange={e => setEditForm({...editForm, expiry_years: parseInt(e.target.value)})}
                                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-brand-teal transition-colors"
                                  >
                                    <option value={1}>1 Year</option>
                                    <option value={2}>2 Years</option>
                                    <option value={3}>3 Years</option>
                                    <option value={4}>4 Years</option>
                                    <option value={5}>5 Years</option>
                                  </select>
                                </div>
                              )}

                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
                              <button 
                                onClick={() => handleCancelEdit(step.id)}
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
                          <div 
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button[title="Delete Step"]')) return;
                              setIsEditing(step.id); 
                              setEditForm(step);
                            }}
                            className="p-3 md:p-4 flex gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors group relative items-center"
                          >
                            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 text-[11px] font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-[14px] font-semibold text-white group-hover:text-brand-teal transition-colors">{step.title}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {selectedPositionId === 'all_staff' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-brand-teal/10 text-brand-teal border border-brand-teal/20 uppercase tracking-wider">
                                        <Users className="w-3 h-3" /> All Staff
                                      </span>
                                    )}
                                    {step.requires_expiry === 1 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                        <AlertCircle className="w-3 h-3" /> Expiry Tracked
                                      </span>
                                    )}
                                    {step.upload_required === 1 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                                        Upload Required
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase tracking-wider">
                                        Confirmation Only
                                      </span>
                                    )}
                                    {step.is_mandatory === 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 uppercase tracking-wider">
                                        Optional
                                      </span>
                                    )}
                                    {step.media_url && (
                                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 uppercase tracking-wider">
                                         <Video className="w-3 h-3" /> Media Attached
                                       </span>
                                     )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 transition-opacity">
                                  <button onClick={() => { setIsEditing(step.id); setEditForm(step); }} className="p-2 text-zinc-400 hover:text-brand-teal hover:bg-brand-teal/10 rounded transition-colors" title="Edit Step">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteStep(step.id)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete Step">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
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
    
      <PositionsModal
        isOpen={isPositionsModalOpen}
        onClose={() => {
          setIsPositionsModalOpen(false);
          fetchPositions();
        }}
        token={token}
      />
    </div>
  );
}
