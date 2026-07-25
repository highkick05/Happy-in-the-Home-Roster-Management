import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Plus, Trash2, Edit, ExternalLink, Calendar, CheckCircle, Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export default function TrainingView() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'modules' | 'staff'>('modules');

  const [modules, setModules] = useState<any[]>([]);
  const [staffTraining, setStaffTraining] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [expiryMonths, setExpiryMonths] = useState(0);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModuleId, setUploadModuleId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [completionDate, setCompletionDate] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // Only applicable if we manually override or auto-calc
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modulesRes, staffRes] = await Promise.all([
        fetch('/api/training/modules', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/training/staff', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (modulesRes.ok) setModules(await modulesRes.json());
      if (staffRes.ok) setStaffTraining(await staffRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingModule ? 'PUT' : 'POST';
    const endpoint = editingModule ? `/api/training/modules/${editingModule.id}` : '/api/training/modules';
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, url, description, expiry_months: expiryMonths })
      });
      if (res.ok) {
        setShowModuleModal(false);
        fetchData();
      } else {
        alert("Failed to save module");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteModule = async (id: number) => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    try {
      await fetch(`/api/training/modules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModuleId || !completionDate) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('training_module_id', String(uploadModuleId));
    formData.append('completion_date', completionDate);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    if (uploadFile) formData.append('certificate', uploadFile);

    try {
      const res = await fetch('/api/training/staff/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setShowUploadModal(false);
        fetchData();
      } else {
        alert("Failed to submit training record");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setUploadFile(acceptedFiles[0]);
      }
    }
  });

  const getStaffStatus = (moduleId: number) => {
    const record = staffTraining.find(r => r.training_module_id === moduleId && r.staff_id === user?.id);
    return record;
  };

  const calculateExpiry = (compDate: string, months: number) => {
    if (!months || months === 0) return '';
    const date = new Date(compDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg relative p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#E6EDF3] tracking-tight">Training</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and track staff training modules.</p>
        </div>
        {isAdmin && (
          <div className="flex bg-brand-navy p-1 rounded-lg border border-white/[0.05] w-fit">
            <button
              onClick={() => setActiveTab('modules')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'modules' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Modules
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'staff' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Staff Completion
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-brand-navy border border-border-subtle rounded-xl overflow-hidden shadow-sm flex flex-col">
        {loading ? (
          <div className="p-8 text-center text-[#8B949E]">Loading...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {(!isAdmin || activeTab === 'modules') && (
              <div className="space-y-4">
                {isAdmin && (
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        setEditingModule(null);
                        setTitle('');
                        setUrl('');
                        setDescription('');
                        setExpiryMonths(0);
                        setShowModuleModal(true);
                      }}
                      className="flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-teal to-brand-green text-white shadow-sm text-sm font-medium rounded-md transition-colors h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Module
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map(mod => {
                    const record = !isAdmin ? getStaffStatus(mod.id) : null;
                    return (
                      <div key={mod.id} className="bg-[#121214] border border-white/[0.08] rounded-xl p-5 flex flex-col relative">
                        {isAdmin && (
                          <div className="absolute top-4 right-4 flex space-x-1">
                            <button onClick={() => {
                              setEditingModule(mod);
                              setTitle(mod.title);
                              setUrl(mod.url);
                              setDescription(mod.description || '');
                              setExpiryMonths(mod.expiry_months || 0);
                              setShowModuleModal(true);
                            }} className="p-1.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteModule(mod.id)} className="p-1.5 text-zinc-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-start space-x-3 mb-3 pr-16">
                          <div className="p-2 bg-brand-teal/10 rounded-lg shrink-0">
                            <GraduationCap className="w-5 h-5 text-brand-teal" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-white">{mod.title}</h3>
                            {mod.expiry_months > 0 && <span className="text-[10px] text-zinc-500">Expires {mod.expiry_months} months after completion</span>}
                          </div>
                        </div>
                        
                        {mod.description && <p className="text-xs text-zinc-400 mb-4 flex-1">{mod.description}</p>}
                        
                        <a href={mod.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-brand-blue hover:text-brand-blue/80 transition-colors mb-4 w-fit">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open Training Link
                        </a>

                        {!isAdmin && (
                          <div className="mt-auto pt-4 border-t border-white/[0.08]">
                            {record && record.status === 'COMPLETED' ? (
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center text-brand-green text-xs font-medium">
                                  <CheckCircle className="w-4 h-4 mr-1.5" />
                                  Completed
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Completed on: {new Date(record.completion_date).toLocaleDateString()}
                                </div>
                                {record.expiry_date && (
                                  <div className={`text-[10px] ${new Date(record.expiry_date) < new Date() ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
                                    Expires on: {new Date(record.expiry_date).toLocaleDateString()}
                                  </div>
                                )}
                                {record.certificate_file_path && (
                                  <a href={record.certificate_file_path} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-teal hover:underline flex items-center">
                                    <FileText className="w-3 h-3 mr-1" />
                                    View Certificate
                                  </a>
                                )}
                                <button
                                  onClick={() => {
                                    setUploadModuleId(mod.id);
                                    setCompletionDate(record.completion_date);
                                    setExpiryDate(record.expiry_date || '');
                                    setUploadFile(null);
                                    setShowUploadModal(true);
                                  }}
                                  className="mt-2 text-xs text-brand-blue hover:underline text-left"
                                >
                                  Update Certificate
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadModuleId(mod.id);
                                  setCompletionDate(new Date().toISOString().split('T')[0]);
                                  setExpiryDate(calculateExpiry(new Date().toISOString().split('T')[0], mod.expiry_months));
                                  setUploadFile(null);
                                  setShowUploadModal(true);
                                }}
                                className="w-full flex justify-center items-center px-3 py-2 bg-brand-bg hover:bg-white/5 border border-white/[0.08] text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5 mr-2" />
                                Upload Certificate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {modules.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                      No training modules found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAdmin && activeTab === 'staff' && (
              <div className="space-y-4">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#121214] border-b border-white/[0.08] text-xs uppercase tracking-wider text-zinc-400">
                      <th className="px-4 py-3 font-medium">Staff</th>
                      <th className="px-4 py-3 font-medium">Module</th>
                      <th className="px-4 py-3 font-medium">Completion Date</th>
                      <th className="px-4 py-3 font-medium">Expiry Date</th>
                      <th className="px-4 py-3 font-medium">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {staffTraining.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-white">{r.first_name} {r.last_name}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.title}</td>
                        <td className="px-4 py-3 text-zinc-400">{new Date(r.completion_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {r.expiry_date ? (
                            <span className={new Date(r.expiry_date) < new Date() ? 'text-red-400 font-medium' : 'text-zinc-400'}>
                              {new Date(r.expiry_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-zinc-600">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.certificate_file_path ? (
                            <a href={r.certificate_file_path} target="_blank" rel="noopener noreferrer" className="flex items-center text-brand-teal hover:text-brand-teal/80 transition-colors text-xs">
                              <FileText className="w-3.5 h-3.5 mr-1" /> View
                            </a>
                          ) : <span className="text-zinc-600">-</span>}
                        </td>
                      </tr>
                    ))}
                    {staffTraining.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                          No staff training records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showModuleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-lg w-full flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <h2 className="text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0">
                {editingModule ? 'Edit Module' : 'Add Training Module'}
              </h2>
              <button onClick={() => setShowModuleModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModuleSubmit} className="p-5 space-y-4 bg-[#09090b] rounded-b-xl">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Module Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. NDIS Worker Orientation Module"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Training URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Validity Period (Months)</label>
                <input
                  type="number"
                  min="0"
                  value={expiryMonths}
                  onChange={e => setExpiryMonths(Number(e.target.value))}
                  placeholder="e.g. 12 (Leave 0 for no expiry)"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
                />
                <p className="text-[10px] text-zinc-500 mt-1">If set, expiry dates will be auto-calculated upon completion.</p>
              </div>
              <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-blue/20 text-brand-blue border border-brand-blue/30 hover:bg-brand-blue/30 text-sm font-medium rounded-md transition-colors"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/[0.08] rounded-xl shadow-2xl max-w-lg w-full flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#18181b] rounded-t-xl shrink-0">
              <h2 className="text-base font-sans font-semibold text-[#E6EDF3] tracking-tight mb-0">
                Submit Training Certificate
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 bg-[#09090b] rounded-b-xl">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Completion Date</label>
                <input
                  type="date"
                  required
                  value={completionDate}
                  onChange={e => {
                    setCompletionDate(e.target.value);
                    const mod = modules.find(m => m.id === uploadModuleId);
                    if (mod && mod.expiry_months > 0) {
                      setExpiryDate(calculateExpiry(e.target.value, mod.expiry_months));
                    }
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Certificate File (PDF or Image)</label>
                <div 
                  {...getRootProps()}
                  className={`w-full bg-black/40 border-2 border-dashed ${isDragActive ? 'border-brand-teal bg-brand-teal/10' : 'border-white/[0.08] hover:border-white/20'} rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center space-y-2 pointer-events-none text-center">
                    <FileText className={`w-8 h-8 ${uploadFile ? 'text-brand-teal' : 'text-zinc-500'}`} />
                    {uploadFile ? (
                      <span className="text-sm text-brand-teal font-medium">{uploadFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sm text-zinc-400">Click or drag file here</span>
                        <span className="text-xs text-zinc-500">Max size 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/[0.08] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-brand-teal/20 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/30 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
