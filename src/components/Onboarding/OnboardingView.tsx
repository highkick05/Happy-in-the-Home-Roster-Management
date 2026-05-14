import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon, Download, Trash2, File as FileIcon, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type StepType = 'upload' | 'confirm';

interface Step {
  id: string;
  title: string;
  description: string;
  type: StepType;
  links: { text: string; url: string }[];
}

const ONBOARDING_STEPS: Step[] = [
  { id: 'resume', title: '1. Resume / CV', description: 'Upload your latest professional resume', type: 'upload', links: [] },
  { id: 'npc', title: '2. National Police Clearance (NPC)', description: 'Must be issued within the last 6 months', type: 'upload', links: [{ text: 'Get AFP Police Check', url: 'https://www.afp.gov.au/what-we-do/services/criminal-records/national-police-checks' }] },
  { id: 'ndis_screening', title: '3. NDIS Worker Screening Check', description: 'Your NDIS worker screening clearance', type: 'upload', links: [{ text: 'NDIS Worker Screening', url: 'https://www.ndiscommission.gov.au/workers/worker-screening' }] },
  { id: 'wwcc', title: '4. Working with Children Check', description: 'Valid WWCC for your state', type: 'upload', links: [{ text: 'WWCC Information', url: 'https://www.aifs.gov.au/resources/resource-sheets/pre-employment-screening-working-children-checks-and-police-checks' }] },
  { id: 'ndis_orientation', title: '5. NDIS Worker Orientation Module', description: "Certificate of completion for 'Quality, Safety and You'", type: 'upload', links: [{ text: 'Worker Orientation Module', url: 'https://www.ndiscommission.gov.au/workers/worker-training-modules-and-resources/worker-orientation-module' }] },
  { id: 'fair_work', title: '6. Fair Work Information Statement', description: 'Signed acknowledgement of the statement', type: 'confirm', links: [{ text: 'Fair Work Information Statement', url: 'https://www.fairwork.gov.au/employment-conditions/information-statements/fair-work-information-statement' }] },
  { id: 'casual_employment', title: '7. Casual Employment Info Statement', description: 'Signed acknowledgement of casual terms', type: 'confirm', links: [{ text: 'Casual Employment Info Statement', url: 'https://www.fairwork.gov.au/employment-conditions/information-statements/casual-employment-information-statement' }] },
  { id: 'tfn_super', title: '8. Tax File Number Declaration & Superannuation Choice', description: 'Completed TFN and Super forms', type: 'upload', links: [{ text: 'TFN Declaration', url: 'https://www.ato.gov.au/forms-and-instructions/tfn-declaration' }, { text: 'Superannuation Standard Choice', url: 'https://www.ato.gov.au/forms-and-instructions/superannuation-standard-choice-form' }] },
  { id: 'ahpra', title: '9. AHPRA Registration (OPTIONAL / NURSES ONLY)', description: 'Current registration (Nurses only)', type: 'upload', links: [{ text: 'AHPRA Registration', url: 'https://www.ahpra.gov.au/Registration.aspx' }] },
  { id: 'driver_license', title: '10. Vehicle & Driver\'s License', description: 'Copy of license and insurance if applicable', type: 'upload', links: [] },
  { id: 'first_aid', title: '11. First Aid & CPR', description: 'Current First Aid and CPR certificates', type: 'upload', links: [] },
  { id: 'immunisation', title: '12. Immunisation history', description: 'Upload your immunisation history statement', type: 'upload', links: [{ text: 'Immunisation history statement', url: 'https://www.servicesaustralia.gov.au/immunisation-history-statement' }] },
  { id: 'covid_vaccine', title: '13. COVID vaccine evidence', description: 'Proof of COVID-19 vaccinations', type: 'upload', links: [{ text: 'COVID-19 vaccination evidence', url: 'https://www.servicesaustralia.gov.au/how-to-get-proof-your-covid-19-vaccinations' }] },
];

export default function OnboardingView() {
  const { token, user } = useAuth();
  const [expandedStep, setExpandedStep] = useState<string | null>('resume');
  const [progressData, setProgressData] = useState<Record<string, { status: 'completed' | 'pending'; fileId?: number | null; files?: { id: number; name: string }[] }>>({});
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/users/onboarding', {
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
  }, [token]);

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
        body: JSON.stringify(newData)
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

    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    const uploadPath = `/Staff/${name ? `${name}/` : ''}Onboarding`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderPath', uploadPath);

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
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload failed');
    }
    
    if (e.target) {
      e.target.value = '';
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

  const completedCount = Object.values(progressData).filter(d => d.status === 'completed').length;
  const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

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
          {ONBOARDING_STEPS.map((step) => {
            const isExpanded = expandedStep === step.id;
            const isCompleted = progressData[step.id]?.status === 'completed';

            return (
              <div 
                key={step.id} 
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isExpanded ? 'border-brand-teal/50 bg-[#121214]/50' : 'border-white/[0.08] bg-[#121214]/30'
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
                          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-[14px] font-medium text-white cursor-pointer w-fit">
                            <Upload className="w-4 h-4" />
                            Upload File
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, step.id)}
                            />
                          </label>

                          {progressData[step.id]?.files && progressData[step.id].files!.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {progressData[step.id].files!.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-white/[0.12]">
                                  <div className="flex items-center gap-3">
                                    <FileIcon className="w-4 h-4 text-brand-teal" />
                                    <span className="text-[14px] font-medium text-white">{file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
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
                              ))}
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
