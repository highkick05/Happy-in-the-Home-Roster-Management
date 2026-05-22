import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon, Download, Trash2, File as FileIcon, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomDatePicker from '../ui/CustomDatePicker';

type StepType = 'upload' | 'confirm';

interface Step {
  id: string;
  title: string;
  description: string;
  type: StepType;
  links: { text: string; url: string }[];
}

export const ONBOARDING_STEPS: Step[] = [
  { id: 'ndis_screening', title: '1. NDIS Worker Screening Check (NWSC) Clearance', description: '5 years validity. Satisfies baseline Aged Care/Home Care worker screening without requiring a separate National Police Check.', type: 'upload', links: [{ text: 'NDIS Worker Screening', url: 'https://www.ndiscommission.gov.au/workers/worker-screening' }] },
  { id: 'wwcc', title: '2. Working with Children Check (WWCC)', description: '3 years validity. Mandatory if supporting clients under the age of 18.', type: 'upload', links: [{ text: 'WWCC Information', url: 'https://www.aifs.gov.au/resources/resource-sheets/pre-employment-screening-working-children-checks-and-police-checks' }] },
  { id: 'vevo', title: '3. Right to Work / VEVO Check', description: 'Non-negotiable structural onboarding check. Monitored for visa holders; marked as static for citizens/PR.', type: 'upload', links: [] },
  { id: 'ahpra', title: '4. AHPRA Registration', description: 'Annual renewal (May 31st). Strictly mandatory for clinical nursing personnel.', type: 'upload', links: [{ text: 'AHPRA Registration', url: 'https://www.ahpra.gov.au/Registration.aspx' }] },
  { id: 'ndis_orientation', title: '5. NDIS Worker Orientation Module Certificate', description: 'One-time mandatory onboarding check ("Quality, Safety and You").', type: 'upload', links: [{ text: 'Worker Orientation Module', url: 'https://www.ndiscommission.gov.au/workers/worker-training-modules-and-resources/worker-orientation-module' }] },
  { id: 'cpr', title: '6. HLTAID009 Provide CPR', description: 'Strictly annual renewal (every 12 months).', type: 'upload', links: [] },
  { id: 'first_aid', title: '7. HLTAID011 Provide First Aid', description: '3 years validity (every 36 months).', type: 'upload', links: [] },
  { id: 'manual_handling', title: '8. Manual Handling Competency', description: 'Strictly annual renewal (every 12 months).', type: 'upload', links: [] },
  { id: 'driver_license', title: '9. Valid Driver\'s License', description: 'Annual check to visually inspect physical validity and current license status.', type: 'upload', links: [] },
  { id: 'car_insurance', title: '10. Comprehensive Car Insurance (with Business Use)', description: 'Annual renewal. Must verify explicit inclusion of "Business Use" or "Commuting/Work Travel".', type: 'upload', links: [] },
  { id: 'flu_shot', title: '11. Annual Influenza Vaccination', description: 'Annual renewal (must be updated before winter peak).', type: 'upload', links: [] },
  { id: 'immunisation', title: '12. Immunisation History', description: 'One-time onboarding baseline healthcare worker vaccines.', type: 'upload', links: [] },
  { id: 'covid_vaccine', title: '13. COVID Immunisation Evidence', description: 'Verified record at onboarding or inline with directives.', type: 'upload', links: [] }
];

export default function OnboardingView({ targetUserId }: { targetUserId?: number }) {
  const { token, user } = useAuth();
  
  // Choose the context user
  const contextUserId = targetUserId || user?.id;
  
  const [expandedStep, setExpandedStep] = useState<string | null>('resume');
  const [progressData, setProgressData] = useState<Record<string, { status: 'completed' | 'pending'; fileId?: number | null; files?: { id: number; name: string }[] }>>({});
  const [loading, setLoading] = useState(true);
  const [formDates, setFormDates] = useState<Record<string, { issued: string, expires: string, idNumber?: string }>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});

  const getTrafficLight = (expires?: string | null) => {
    if (!expires) return null;
    const expDate = new Date(expires);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { color: 'bg-red-500', text: 'Expired' };
    if (diffDays <= 14) return { color: 'bg-orange-500', text: `Expires in ${diffDays} d` };
    if (diffDays <= 30) return { color: 'bg-yellow-500', text: `Expires in ${diffDays} d` };
    return { color: 'bg-brand-green', text: 'Valid' };
  };

  const fetchProgress = async () => {
    try {
      const url = contextUserId ? `/api/users/onboarding?userId=${contextUserId}` : '/api/users/onboarding';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProgressData(data || {});
      }
    } catch (err) {
      console.error('Failed to load onboarding progress', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [token, contextUserId]);

  const updateProgress = async (stepId: string, status: 'completed' | 'pending', fileAction?: { type: 'add' | 'remove'; file: { id: number; name: string } }) => {
    let currentStepData = progressData[stepId] || { status: 'pending', files: [] };
    let newFiles = [...(currentStepData.files || [])];
    
    // Convert legacy single file
    if (currentStepData.fileId && newFiles.length === 0) {
      newFiles.push({ id: currentStepData.fileId, name: 'Uploaded File' });
    }

    if (fileAction?.type === 'add') {
      newFiles.push(fileAction.file);
    } else if (fileAction?.type === 'remove') {
      newFiles = newFiles.filter(f => f.id !== fileAction.file.id);
    }

    // Auto-complete if there is at least one file, auto-pending if empty (for upload type)
    let finalStatus = status;
    const stepDef = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (stepDef?.type === 'upload') {
      finalStatus = newFiles.length > 0 ? 'completed' : 'pending';
    }

    const newData = { 
      ...progressData, 
      [stepId]: { status: finalStatus, files: newFiles, fileId: newFiles.length > 0 ? newFiles[0].id : null } 
    };
    
    setProgressData(newData);
    
    try {
      await fetch('/api/users/onboarding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ data: newData, targetUserId: contextUserId })
      });
      
      const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId);
      if (!fileAction && currentIndex !== -1 && currentIndex < ONBOARDING_STEPS.length - 1 && finalStatus === 'completed') {
        const nextStep = ONBOARDING_STEPS[currentIndex + 1];
        setExpandedStep(nextStep.id);
      }
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, stepId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setUploadError(prev => ({ ...prev, [stepId]: '' }));

    let issued = formDates[stepId]?.issued || '';
    let expires = formDates[stepId]?.expires || '';
    
    // VALIDATIONS & CALCULATIONS
    const today = new Date();
    
    if (stepId === 'ndis_screening') {
      if (!issued) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Date issued is required.' }));
        return;
      }
      if (!expires) {
        const issueDate = new Date(issued);
        issueDate.setFullYear(issueDate.getFullYear() + 5);
        expires = issueDate.toISOString().split('T')[0];
      }
    }
    
    if (stepId === 'wwcc') {
      if (!issued && !expires) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Issue or Expiry date is required.' }));
        return;
      }
      if (issued && !expires) {
        const issueDate = new Date(issued);
        issueDate.setFullYear(issueDate.getFullYear() + 3);
        expires = issueDate.toISOString().split('T')[0];
      }
    }

    if (stepId === 'ahpra') {
      if (!expires) {
        // Auto-calculate to next May 31st
        const currentYear = today.getFullYear();
        const may31ThisYear = new Date(currentYear, 4, 31); // May is 4 (0-indexed)
        if (today > may31ThisYear) {
          expires = new Date(currentYear + 1, 4, 31).toISOString().split('T')[0];
        } else {
          expires = may31ThisYear.toISOString().split('T')[0];
        }
      }
    }

    if (stepId === 'driver_license' || stepId === 'car_insurance') {
      if (!expires) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Date expires is required.' }));
        return;
      }
    }

    if (stepId === 'cpr' || stepId === 'manual_handling' || stepId === 'flu_shot') {
      if (!issued && !expires) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Date issued or expires is required.' }));
        return;
      }
      if (issued && !expires) {
        const issueDate = new Date(issued);
        issueDate.setFullYear(issueDate.getFullYear() + 1);
        expires = issueDate.toISOString().split('T')[0];
      }
    }

    if (stepId === 'first_aid') {
      if (!issued && !expires) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Date issued or expires is required.' }));
        return;
      }
      if (issued && !expires) {
        const issueDate = new Date(issued);
        issueDate.setFullYear(issueDate.getFullYear() + 3);
        expires = issueDate.toISOString().split('T')[0];
      }
    }

    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    const uploadPath = `/Staff/${name ? `${name}/` : ''}Onboarding`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderPath', uploadPath);
    if (issued) formData.append('date_issued', issued);
    if (expires) formData.append('date_expires', expires);
    if (contextUserId) formData.append('targetUserId', contextUserId.toString());

    try {
      const res = await fetch(`/api/files?folderPath=${encodeURIComponent(uploadPath)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.id) {
        await updateProgress(stepId, 'completed', { type: 'add', file: { id: data.id, name: file.name } });
      } else {
        setUploadError(prev => ({ ...prev, [stepId]: 'Upload failed: ' + (data.error || 'Unknown error') }));
      }
    } catch (err) {
      setUploadError(prev => ({ ...prev, [stepId]: 'Upload failed due to network error' }));
    }
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDateUpdate = async (stepId: string, fileId: number) => {
    let issued = formDates[stepId]?.issued || '';
    let expires = formDates[stepId]?.expires || '';
    // Skip some hard validations on manual override but keep basic structure
    
    // We get the existing ID number placeholder logic here
    const idNumber = formDates[stepId]?.idNumber; // even though we don't save it directly to the file record yet

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date_issued: issued, date_expires: expires, id_number: idNumber })
      });
      if (res.ok) {
        alert('Dates updated successfully.');
        fetchProgress();
      } else {
        alert('Failed to update dates.');
      }
    } catch (e) {
      alert('Error updating dates.');
    }
  };

  const handleDeleteFile = async (stepId: string, file: { id: number; name: string }) => {
    try {
      await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await updateProgress(stepId, 'pending', { type: 'remove', file });
    } catch (err) {
      console.error('Failed to delete file', err);
      alert('File deletion failed');
    }
  };

  const downloadFile = async (id: number, filename: string) => {
    try {
      const res = await fetch(`/api/files/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Could not download file.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">Loading...</div>;
  }

  const visibleSteps = ONBOARDING_STEPS.filter(s => {
    if (s.id === 'ahpra') {
       // Filter out AHPRA if the user represents a non-clinical role. 
       // Depending on schema, we might check user role strings, or title.
       // Default to hiding unless staff profile is clearly clinical (e.g. Registered Nurse)
       // Fallback checking user's properties since roles in this system are typically just 'ADMIN' or 'STAFF'.
       const isClinical = user?.email?.includes('nurse') || user?.email?.includes('clinical');
       // Real-world application would check an explicit 'is_clinical' or 'job_title' column.
       return isClinical;
    }
    return true;
  });

  const completedCount = Object.values(progressData).filter(d => d.status === 'completed').length;
  const progressPercent = Math.round((completedCount / visibleSteps.length) * 100);

  return (
    <div className="flex-1 overflow-auto bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Onboarding Hub</h1>
          <p className="text-zinc-400">Complete your profile requirements to begin shifts</p>
        </div>

        <div className="bg-[#111111] border-t border-white/[0.05] rounded-xl p-6 shadow-lg relative overflow-hidden mb-8 mt-6">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-zinc-400 uppercase tracking-wider text-xs font-semibold">OVERALL PROGRESS</span>
            <span className="text-brand-teal">{progressPercent}% COMPLETE</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {visibleSteps.map((step) => {
            const isExpanded = expandedStep === step.id;
            const isCompleted = progressData[step.id]?.status === 'completed';

            return (
              <div 
                key={step.id} 
                className={`border rounded-lg transition-colors ${
                  isExpanded ? 'border-brand-teal/50 bg-[#121214]/50 relative z-50' : 'border-white/[0.08] bg-[#121214]/30 relative z-0'
                }`}
              >
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                >
                  <div className="flex items-center gap-4 text-white">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
                      isCompleted 
                        ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' 
                        : isExpanded 
                          ? 'bg-indigo-500/10 border-brand-teal/20 text-brand-teal'
                          : 'bg-zinc-800 border-white/[0.12] text-zinc-500'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={`font-medium ${isCompleted ? 'text-zinc-300' : 'text-white'}`}>
                        {step.title}
                      </h3>
                      {!isExpanded && (
                        <p className="text-sm text-zinc-500">{step.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-zinc-500 shrink-0">
                    {isCompleted ? (
                      <span className="px-3 py-1 bg-brand-green/10 text-brand-green text-xs font-semibold rounded uppercase">Completed</span>
                    ) : (
                      <div className="hidden md:flex">
                        {step.type === 'upload' ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded uppercase">
                            <Upload className="w-3 h-3" /> UPLOAD
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded uppercase">
                            <CheckCircle2 className="w-3 h-3" /> CONFIRM
                          </div>
                        )}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-5 pt-0 mt-2 border-t border-white/[0.08]/50">
                    <div className="mb-6 mt-4">
                      <p className="text-sm text-zinc-400 mb-4">{step.description}</p>
                      
                      {step.id === 'ndis_screening' && (
                        <div className="mb-6 pb-2">
                          <h4 className="flex items-center gap-2 text-brand-teal font-medium mb-3 text-sm">
                            <Info className="w-4 h-4" />
                            Employer Details for Application:
                          </h4>
                          <div className="p-4 border border-white/[0.08] rounded-lg bg-[#121214]/50 space-y-3 text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                              <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Employer ID:</span>
                              <span className="text-white font-medium md:col-span-3">4-LUAIRCB</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                              <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Legal Name:</span>
                              <span className="text-white md:col-span-3">Happy in the Home Pty Ltd</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                              <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Business Name:</span>
                              <span className="text-white md:col-span-3 uppercase">HAPPY IN THE HOME</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                              <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Sector:</span>
                              <span className="text-white md:col-span-3">Disability</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                              <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Address:</span>
                              <span className="text-white md:col-span-3">24 Pollett Street, SPALDING, 6530, Australia</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {step.id === 'tfn_super' && (
                        <div className="mb-6 space-y-6">
                          <div>
                            <h4 className="flex items-center gap-2 text-brand-teal font-medium mb-3 text-sm">
                              <Info className="w-4 h-4" />
                              Business Details for the form:
                            </h4>
                            <div className="p-4 border border-white/[0.08] rounded-lg bg-[#121214]/50 space-y-3 text-sm">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                                <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Business Name:</span>
                                <span className="text-white md:col-span-3 uppercase">HAPPY IN THE HOME</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                                <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">ABN:</span>
                                <span className="text-white font-medium md:col-span-3">69695033115</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs focus uppercase text-zinc-500 font-semibold mb-2">Tutorial Video:</h4>
                            <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-black">
                              <video 
                                src="/tax_super_tutorial.mp4" 
                                controls 
                                className="w-full aspect-video"
                                controlsList="nodownload"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {step.links.length > 0 && (
                        <div className="space-y-2 mb-6">
                          <h4 className="text-xs focus uppercase text-zinc-500 font-semibold mb-2">Helpful Links:</h4>
                          {step.links.map((link, idx) => (
                            <a 
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-brand-teal hover:text-brand-teal transition-colors text-sm font-medium w-fit"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {link.text}
                            </a>
                          ))}
                        </div>
                      )}

                      
                      {step.type === 'upload' ? (
                        <div className="space-y-4">
                          
                          {/* DYNAMIC DATE INPUTS & IDENTIFIERS */}
                          <div className="flex flex-col gap-3 max-w-sm mb-4">
                            {['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && (
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">ID Number / License Reference (Optional)</label>
                                <input 
                                  type="text"
                                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm"
                                  placeholder="Enter identifier..."
                                  value={formDates[step.id]?.idNumber || ''}
                                  onChange={(e: any) => setFormDates(prev => ({ ...prev, [step.id]: { ...prev[step.id], idNumber: e.target.value } }))}
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">Saved identifiers are automatically masked as [ID Number Redacted] for privacy.</p>
                              </div>
                            )}
                            {['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs text-zinc-400">Issue Date</label>
                                  {progressData[step.id]?.files?.[0]?.date_expires && (
                                    <span className="text-xs text-brand-teal font-medium">
                                      Current expires: {progressData[step.id].files![0].date_expires}
                                    </span>
                                  )}
                                </div>
                                <CustomDatePicker 
                                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm"
                                  value={formDates[step.id]?.issued || ''}
                                  onChange={(e: any) => setFormDates(prev => ({ ...prev, [step.id]: { ...prev[step.id], issued: e.target.value } }))}
                                />
                              </div>
                            )}
                            {['wwcc', 'ahpra', 'driver_license', 'first_aid', 'cpr', 'manual_handling', 'car_insurance', 'flu_shot'].includes(step.id) && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs text-zinc-400">Expiry Date</label>
                                  {!['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && progressData[step.id]?.files?.[0]?.date_expires && (
                                    <span className="text-xs text-brand-teal font-medium">
                                      Current expires: {progressData[step.id].files![0].date_expires}
                                    </span>
                                  )}
                                </div>
                                <CustomDatePicker 
                                  className="w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm"
                                  value={formDates[step.id]?.expires || ''}
                                  onChange={(e: any) => setFormDates(prev => ({ ...prev, [step.id]: { ...prev[step.id], expires: e.target.value } }))}
                                />
                              </div>
                            )}
                            {uploadError[step.id] && (
                              <p className="text-red-500 text-xs mt-1">{uploadError[step.id]}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-[14px] font-medium text-white cursor-pointer w-fit border border-white/[0.1]">
                              <Upload className="w-4 h-4" />
                              Upload
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e, step.id)}
                              />
                            </label>
                            {progressData[step.id]?.files && progressData[step.id].files!.length > 0 && (
                              <button
                                onClick={() => handleDateUpdate(step.id, progressData[step.id].files![0].id)}
                                className="px-4 py-2 bg-brand-navy border border-brand-teal/50 text-brand-teal rounded-lg hover:bg-brand-teal/10 transition-colors text-[14px] font-medium w-fit"
                              >
                                Save Date Overwrites
                              </button>
                            )}
                          </div>

                          
                          {progressData[step.id]?.files && progressData[step.id].files!.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {progressData[step.id].files!.map((file: any) => {
                                const traffic = getTrafficLight(file.date_expires);
                                return (
                                <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/[0.12] gap-2">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                      <FileIcon className="w-4 h-4 text-brand-teal shrink-0" />
                                      <span className="text-[14px] font-medium text-white break-all">{file.name}</span>
                                    </div>
                                    {(file.date_issued || file.date_expires) && (
                                      <div className="flex items-center gap-2 ml-7">
                                        {['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && (
                                           <span className="text-xs text-zinc-500 font-mono">[ID Number Redacted]</span>
                                        )}
                                        {file.date_issued && <span className="text-xs text-zinc-400">Issued: {file.date_issued}</span>}
                                        {file.date_expires && <span className="text-xs text-zinc-400">Expires: {file.date_expires}</span>}
                                        {traffic && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white ${traffic.color}`}>
                                            {traffic.text}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 self-end sm:self-center">

                                    <button
                                      onClick={() => downloadFile(file.id, file.name)}
                                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                      title="Download File"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFile(step.id, file)}
                                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                                      title="Delete File"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          ) : (
                            isCompleted && progressData[step.id]?.fileId && (
                              <div className="mt-4 flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/[0.12]">
                                <div className="flex items-center gap-3">
                                  <FileIcon className="w-4 h-4 text-brand-teal" />
                                  <span className="text-[14px] font-medium text-white">Uploaded File</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => downloadFile(progressData[step.id].fileId!, 'downloaded-file')}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => updateProgress(step.id, isCompleted ? 'pending' : 'completed')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors w-fit ${
                              isCompleted 
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                                : 'bg-brand-blue text-white hover:bg-brand-teal'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isCompleted ? 'Undo Confirmation' : 'Confirm & Acknowledge'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-5 flex gap-4 mt-8">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <span className="font-bold text-xl">!</span>
          </div>
          <div>
            <h4 className="font-medium text-amber-400 mb-1">IMPORTANT NOTE</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              All documents must be clear, legible, and current. Expired documents will not be accepted. Once all steps are completed, your Employment Agreement will be generated for final signing.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
