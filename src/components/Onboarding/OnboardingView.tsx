import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, ChevronDown, ChevronUp, Link as LinkIcon, Download, Trash2, File as FileIcon, Info, Copy, Check } from 'lucide-react';
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
  { id: 'tfn_super', title: 'Tax File Number Declaration & Superannuation Choice', description: 'Completed TFN and Super forms.', type: 'upload', links: [] },
  { id: 'driver_license', title: 'Valid Driver\'s License', description: 'Annual check to visually inspect physical validity and current license status.', type: 'upload', links: [] },
  { id: 'car_insurance', title: 'Comprehensive Car Insurance (with Business Use)', description: 'Annual renewal. Must verify explicit inclusion of "Business Use" or "Commuting/Work Travel".', type: 'upload', links: [] },
  { id: 'wwcc', title: 'Working with Children Check (WWCC)', description: '3 years validity. Mandatory if supporting clients under the age of 18.', type: 'upload', links: [{ text: 'WWCC Information', url: 'https://www.aifs.gov.au/resources/resource-sheets/pre-employment-screening-working-children-checks-and-police-checks' }] },
  { id: 'vevo', title: 'Right to Work / VEVO Check', description: 'Non-negotiable structural onboarding check. Monitored for visa holders; marked as static for citizens/PR.', type: 'upload', links: [] },
  { id: 'ahpra', title: 'AHPRA Registration', description: 'Annual renewal (May 31st). Strictly mandatory for clinical nursing personnel.', type: 'upload', links: [{ text: 'AHPRA Registration', url: 'https://www.ahpra.gov.au/Registration.aspx' }] },
  { id: 'cpr', title: 'HLTAID009 Provide CPR', description: 'Strictly annual renewal (every 12 months).', type: 'upload', links: [] },
  { id: 'first_aid', title: 'HLTAID011 Provide First Aid', description: '3 years validity (every 36 months).', type: 'upload', links: [] },
  { id: 'manual_handling', title: 'Manual Handling Competency', description: 'Strictly annual renewal (every 12 months).', type: 'upload', links: [] },
  { id: 'flu_shot', title: 'Annual Influenza Vaccination', description: 'Annual renewal (must be updated before winter peak).', type: 'upload', links: [] },
  { id: 'immunisation', title: 'Immunisation History', description: 'One-time onboarding baseline healthcare worker vaccines.', type: 'upload', links: [] },
  { id: 'covid_vaccine', title: 'COVID Immunisation Evidence', description: 'Verified record at onboarding or inline with directives.', type: 'upload', links: [] },
  { id: 'ndis_screening', title: 'NDIS Worker Screening Check (NWSC) Clearance', description: '5 years validity. Satisfies baseline Aged Care/Home Care worker screening without requiring a separate National Police Check.', type: 'upload', links: [{ text: 'NDIS Worker Screening', url: 'https://www.ndiscommission.gov.au/workers/worker-screening' }] },
  { id: 'ndis_orientation', title: 'NDIS Worker Orientation Module Certificate', description: 'One-time mandatory onboarding check ("Quality, Safety and You").', type: 'upload', links: [{ text: 'Worker Orientation Module', url: 'https://www.ndiscommission.gov.au/workers/worker-training-modules-and-resources/worker-orientation-module' }] }
];

export default function OnboardingView({ targetUserId }: { targetUserId?: number }) {
  const { token, user } = useAuth();
  
  // Choose the context user
  const contextUserId = targetUserId || user?.id;
  
  const [expandedStep, setExpandedStep] = useState<string | null>('tfn_super');
  const [progressData, setProgressData] = useState<Record<string, { status: 'completed' | 'pending'; fileId?: number | null; files?: { id: number; name: string, date_expires?: string, date_issued?: string }[] }>>({});
  const [loading, setLoading] = useState(true);
  const [formDates, setFormDates] = useState<Record<string, { issued: string, expires: string, idNumber?: string }>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDraggingStep, setIsDraggingStep] = useState<Record<string, boolean>>({});
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState<Record<string, boolean>>({});
  const [ndisRelated, setNdisRelated] = useState<boolean>(() => {
    return localStorage.getItem('ndis_related_work') === 'true';
  });

  const handleNdisToggle = (val: boolean) => {
    setNdisRelated(val);
    localStorage.setItem('ndis_related_work', String(val));
    // If turning off NDIS screening, collapse expanding if it is an NDIS step
    if (!val && (expandedStep === 'ndis_screening' || expandedStep === 'ndis_orientation')) {
      setExpandedStep(null);
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
        
        // Pre-populate formDates with existing dates and id numbers
        const initialFormDates: Record<string, { issued: string, expires: string, idNumber?: string }> = {};
        if (data) {
          Object.entries(data).forEach(([stepId, stepVal]: [string, any]) => {
            if (stepVal.files && stepVal.files.length > 0) {
              const file = stepVal.files[0];
              initialFormDates[stepId] = {
                issued: file.date_issued || '',
                expires: file.date_expires || '',
                idNumber: file.id_number || ''
              };
            }
          });
          setFormDates(prev => ({ ...initialFormDates, ...prev }));
        }
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
      
      const generalSteps = ONBOARDING_STEPS.filter(s => {
        if (s.id === 'ndis_screening' || s.id === 'ndis_orientation') return false;
        if (s.id === 'ahpra') {
          const isClinical = user?.email?.includes('nurse') || user?.email?.includes('clinical');
          return isClinical;
        }
        return true;
      });
      const ndisSteps = ONBOARDING_STEPS.filter(s => {
        return s.id === 'ndis_screening' || s.id === 'ndis_orientation';
      });
      const activeList = ndisRelated ? [...generalSteps, ...ndisSteps] : generalSteps;

      const currentIndex = activeList.findIndex(s => s.id === stepId);
      if (!fileAction && currentIndex !== -1 && currentIndex < activeList.length - 1 && finalStatus === 'completed') {
        const nextStep = activeList[currentIndex + 1];
        setExpandedStep(nextStep.id);
      }
    } catch (err) {
      console.error('Failed to save progress', err);
    }
  };

  const uploadFileAndSave = async (file: File, stepId: string) => {
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
      if (!expires) {
        setUploadError(prev => ({ ...prev, [stepId]: 'Expiry date is required.' }));
        return;
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
        setSessionUploadedFiles(prev => ({ ...prev, [stepId]: true }));
      } else {
        setUploadError(prev => ({ ...prev, [stepId]: 'Upload failed: ' + (data.error || 'Unknown error') }));
      }
    } catch (err) {
      setUploadError(prev => ({ ...prev, [stepId]: 'Upload failed due to network error' }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, stepId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileAndSave(file, stepId);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent, stepId: string) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent, stepId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStep(prev => ({ ...prev, [stepId]: true }));
    setExpandedStep(stepId);
  };

  const handleDragLeave = (e: React.DragEvent, stepId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStep(prev => ({ ...prev, [stepId]: false }));
  };

  const handleDrop = async (e: React.DragEvent, stepId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStep(prev => ({ ...prev, [stepId]: false }));

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFileAndSave(files[0], stepId);
    }
  };

  const handleDateUpdate = async (stepId: string, fileId: number) => {
    let issued = formDates[stepId]?.issued || '';
    let expires = formDates[stepId]?.expires || '';
    
    if (stepId === 'wwcc' && !expires) {
      alert('Expiry date is required for Working with Children Check (WWCC).');
      return;
    }

    // Check if user is staff (not admin) and trying to change dates without newly uploading
    const isUserAdmin = user?.role === 'ADMIN';
    
    if (!isUserAdmin && !sessionUploadedFiles[stepId]) {
      const errorMsg = 'To update your document or change its dates, you must upload the new document/certificate first. Please drag & drop or browse a new file in the upload section.';
      setUploadError(prev => ({ ...prev, [stepId]: errorMsg }));
      alert(errorMsg);
      return;
    }

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

  const generalSteps = ONBOARDING_STEPS.filter(s => {
    if (s.id === 'ndis_screening' || s.id === 'ndis_orientation') return false;
    if (s.id === 'ahpra') {
       const isClinical = user?.email?.includes('nurse') || user?.email?.includes('clinical');
       return isClinical;
    }
    return true;
  });

  const ndisSteps = ONBOARDING_STEPS.filter(s => {
    return s.id === 'ndis_screening' || s.id === 'ndis_orientation';
  });

  const visibleSteps = ndisRelated ? [...generalSteps, ...ndisSteps] : generalSteps;

  const completedVisibleCount = visibleSteps.filter(s => progressData[s.id]?.status === 'completed').length;
  const progressPercent = visibleSteps.length > 0 ? Math.round((completedVisibleCount / visibleSteps.length) * 100) : 0;

  const renderStepCard = (step: Step, stepNum: number) => {
    const isExpanded = expandedStep === step.id;
    const isCompleted = progressData[step.id]?.status === 'completed';

    return (
      <div 
        key={step.id} 
        className={`border rounded-lg relative overflow-hidden transition-all duration-200 ${
          isDraggingStep[step.id]
            ? 'border-brand-teal bg-[#132224]/80 scale-[1.01] shadow-[0_0_20px_rgba(20,184,166,0.2)] z-50'
            : isExpanded 
              ? 'border-brand-teal/50 bg-[#121214]/50 z-50' 
              : 'border-white/[0.08] bg-[#121214]/30 z-0 hover:border-white/15'
        }`}
        onDragOver={(e) => step.type === 'upload' && handleDragOver(e, step.id)}
        onDragEnter={(e) => step.type === 'upload' && handleDragEnter(e, step.id)}
        onDragLeave={(e) => step.type === 'upload' && handleDragLeave(e, step.id)}
        onDrop={(e) => step.type === 'upload' && handleDrop(e, step.id)}
      >
        {/* Drag and Drop visual shield overlay */}
        {isDraggingStep[step.id] && (
          <div className="absolute inset-0 bg-brand-teal/10 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center gap-3 transition-all duration-200 pointer-events-none">
            <div className="p-4 bg-zinc-900 border-2 border-brand-teal rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)] text-brand-teal animate-bounce">
              <Upload className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Drop to upload to this section</p>
              <p className="text-brand-teal/85 text-xs font-mono">{step.title}</p>
            </div>
          </div>
        )}
        <div 
          className="p-5 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setExpandedStep(isExpanded ? null : step.id)}
        >
          <div className="flex items-center gap-4 text-white">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 border ${
              isCompleted 
                ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' 
                : isExpanded 
                  ? 'bg-indigo-500/10 border-brand-teal/25 text-brand-teal'
                  : 'bg-zinc-800 border-white/[0.12] text-zinc-500'
            }`}>
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-medium ${isCompleted ? 'text-zinc-300' : 'text-white'}`}>
                {stepNum}. {step.title}
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
                  <div className="p-4 border border-white/[0.08] rounded-lg bg-[#121214]/55 space-y-3 text-sm">
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
                  <div className="p-4 border border-amber-500/20 rounded-lg bg-amber-500/10 text-amber-200 text-sm space-y-2.5 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                    <p className="font-semibold flex items-center gap-1.5 text-amber-400">
                      <Info className="w-4 h-4 text-amber-400" /> IMPORTANT INSTRUCTIONS:
                    </p>
                    <p className="text-zinc-300">
                      On completion of the forms, please make sure to click on your receipt, screenshot it, or save it as a PDF, and upload the file using the upload section below.
                    </p>
                    <div className="pt-2 border-t border-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                        ★ MOST IMPORTANT STEP BEFORE STARTING WORK
                      </span>
                      <a 
                        href="https://my.gov.au/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold rounded-md transition-colors w-fit shadow-md select-none"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Go to myGov Login
                      </a>
                    </div>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-brand-teal font-medium mb-3 text-sm">
                      <Info className="w-4 h-4" />
                      Business Details for the form:
                    </h4>
                    <div className="p-4 border border-white/[0.08] rounded-lg bg-[#121214]/55 space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 items-center group">
                        <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">Business Name:</span>
                        <div className="text-white md:col-span-3 flex items-center gap-2">
                          <span className="uppercase">HAPPY IN THE HOME</span>
                          <button onClick={() => handleCopy('HAPPY IN THE HOME', 'businessName')} className="text-zinc-500 hover:text-white transition-colors p-1" title="Copy Business Name">
                            {copiedField === 'businessName' ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 items-center group">
                        <span className="text-zinc-500 font-medium uppercase text-xs md:col-span-1">ABN:</span>
                        <div className="text-white font-medium md:col-span-3 flex items-center gap-2">
                          <span>69695033115</span>
                          <button onClick={() => handleCopy('69695033115', 'abn')} className="text-zinc-500 hover:text-white transition-colors p-1" title="Copy ABN">
                            {copiedField === 'abn' ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs uppercase text-zinc-500 font-semibold mb-2">Tutorial Video:</h4>
                    <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-black">
                      <video 
                        src="/tax_super_tutorial.mp4" 
                        controls 
                        autoPlay
                        muted
                        playsInline
                        className="w-full aspect-video"
                        controlsList="nodownload"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {step.links.length > 0 && (
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs uppercase text-zinc-500 font-semibold mb-2">Helpful Links:</h4>
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
                  {/* ID & DATE PICKERS */}
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
                    {['ndis_screening', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && (
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
                          {!['ndis_screening', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) && progressData[step.id]?.files?.[0]?.date_expires && (
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

                  <div className="space-y-3">
                    <label 
                      className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-all text-center cursor-pointer ${
                        isDraggingStep[step.id]
                          ? 'border-brand-teal bg-brand-teal/5 text-white'
                          : 'border-white/[0.12] bg-[#1A1A1C] hover:border-brand-teal/50 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="p-3 bg-zinc-800/80 rounded-full border border-white/[0.08] text-brand-teal flex items-center justify-center animate-pulse animate-duration-3000">
                        <Upload className="w-5 h-5 font-bold" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-zinc-200">
                          Drag & drop document here, or <span className="text-brand-teal font-semibold hover:underline">browse files</span>
                        </p>
                        <p className="text-[11px] text-[#8B949E]">Supports standard document & image formats</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, step.id)}
                      />
                    </label>
                    
                    {progressData[step.id]?.files && progressData[step.id].files!.length > 0 && (
                      <button
                        onClick={() => handleDateUpdate(step.id, progressData[step.id].files![0].id)}
                        className="px-4 py-2.5 bg-brand-teal hover:bg-[#119e8e] hover:scale-[1.005] active:scale-[0.995] text-zinc-950 font-bold rounded-lg shadow-[0_4px_12px_rgba(20,184,166,0.25)] transition-all text-[14px] w-full flex items-center justify-center gap-2 border-0 cursor-pointer text-center"
                      >
                        <CheckCircle2 className="w-4 h-4 text-zinc-950 shrink-0" />
                        Update Issue/Expiry Dates
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
  };

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

        {/* General/Home Care Steps List */}
        <div className="space-y-4">
          {generalSteps.map((step, index) => renderStepCard(step, index + 1))}
        </div>

        {/* NDIS Toggle Section */}
        <div className="bg-[#111111] border border-white/[0.08] rounded-xl p-6 shadow-lg my-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Performing any NDIS RELATED WORK?</h3>
              <p className="text-zinc-400 text-sm">
                Toggle this if you support participant shifts involving NDIS care plan items to activate required screening compliance checks.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-semibold uppercase tracking-wider ${ndisRelated ? 'text-brand-teal' : 'text-zinc-500'}`}>
                {ndisRelated ? 'YES' : 'NO'}
              </span>
              <button
                type="button"
                onClick={() => handleNdisToggle(!ndisRelated)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  ndisRelated ? 'bg-brand-teal' : 'bg-zinc-800'
                }`}
                role="switch"
                aria-checked={ndisRelated}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    ndisRelated ? 'translate-x-[20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* NDIS Related Subdivision */}
        {ndisRelated && (
          <div className="space-y-4 mt-8">
            <div className="border-t border-white/[0.08] pt-6 mb-4">
              <h2 className="text-md font-bold text-brand-teal uppercase tracking-wider">ONLY FOR NDIS RELATED WORK</h2>
              <p className="text-xs text-zinc-500 mt-1">Please complete both NDIS specific compliance checks below.</p>
            </div>
            {ndisSteps.map((step, index) => renderStepCard(step, generalSteps.length + index + 1))}
          </div>
        )}

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-5 flex gap-4 mt-8">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <span className="font-bold text-xl">!</span>
          </div>
          <div>
            <h4 className="font-medium text-amber-400 mb-1">IMPORTANT NOTE</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              All documents must be clear, legible, and current. Expired documents will not be accepted.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
