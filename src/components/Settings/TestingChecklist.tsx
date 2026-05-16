import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, Circle } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { id: 'auth_login', category: 'Authentication & Security', label: 'Test correct credentials, incorrect credentials, and lockout/rate-limiting behaviors.' },
  { id: 'auth_roles', category: 'Authentication & Security', label: 'Log in as a standard Staff member. Ensure they cannot access Admin sections.' },
  { id: 'auth_token', category: 'Authentication & Security', label: 'Leave a session open until token expires. Ensure app gracefully forces re-login.' },
  { id: 'auth_onboard', category: 'Authentication & Security', label: 'Take a new staff account through onboarding steps to ensure required profile hooks fire.' },
  
  { id: 'dir_address', category: 'Directory & Geocoding', label: 'Enter various address formats (units, vaguely named roads). Ensure Geocoding/OSRM resolves correctly.' },
  { id: 'dir_funding', category: 'Directory & Geocoding', label: 'Ensure Clients are correctly tagged as NDIS or Home Care. This dictates billing logic.' },

  { id: 'rost_gen', category: 'Rostering & Shift Lifecycle', label: 'Create a template for a client and generate a month roster. Check for correct days.' },
  { id: 'rost_conflict', category: 'Rostering & Shift Lifecycle', label: 'Attempt to double-book a staff member. Ensure conflict warning handles it.' },
  { id: 'rost_lifecycle', category: 'Rostering & Shift Lifecycle', label: 'Push shift: Draft -> Published -> In Progress -> Completed. Verify UI accuracy.' },
  { id: 'rost_respite', category: 'Rostering & Shift Lifecycle', label: 'Create a respite booking and verify it bypasses standard hourly rules/travel.' },

  { id: 'trv_ndis_first', category: 'Travel Logic & Billing', label: 'NDIS First Shift: Staff Home -> Client A. Ensure Client A is billed for this distance.' },
  { id: 'trv_ndis_gap1', category: 'Travel Logic & Billing', label: 'NDIS Consecutive (<= 60m): Client A -> Client B. Ensure Client B billed from Client A.' },
  { id: 'trv_ndis_gap2', category: 'Travel Logic & Billing', label: 'NDIS Consecutive (> 60m): Client A -> Client B. Ensure Client B billed from Staff Home.' },
  { id: 'trv_ndis_last', category: 'Travel Logic & Billing', label: 'NDIS Last Shift: Ensure the final client is billed for return trip to Staff Home.' },
  { id: 'trv_hc_isol', category: 'Travel Logic & Billing', label: 'Home Care Isolation: Verify it completely ignores NDIS chaining logic.' },
  { id: 'trv_abt', category: 'Travel Logic & Billing', label: 'ABT: Add ABT during a shift. Ensure it tracks separately from Provider Travel.' },

  { id: 'mob_layout', category: 'Mobile App & Check-In', label: 'Open site on mobile emulator. Ensure dashboard and Start/End Shift buttons are easily tappable.' },
  { id: 'mob_photo', category: 'Mobile App & Check-In', label: 'Start a shift, take an odometer photo via device camera, and end shirt.' },
  { id: 'mob_upload', category: 'Mobile App & Check-In', label: 'Check that large photos do not crash the server upon completion.' },

  { id: 'fin_rates', category: 'Financials & PDF', label: 'Generate invoice. Check Line Items (Sat/Eve rates) apply correctly to ACTUAL times.' },
  { id: 'fin_merge', category: 'Financials & PDF', label: 'Merge 3 shifts. Ensure totals sum up without dropping transport data.' },
  { id: 'fin_pdf', category: 'Financials & PDF', label: 'Open PDFs. Check for UI overlap, missing images or blank coords.' },
  { id: 'fin_logo', category: 'Financials & PDF', label: 'Upload custom logo in Settings and verify it applies instantly to PDFs.' },

  { id: 'inf_backup', category: 'Infrastructure & Compliance', label: 'Trigger Database Download. Verify .db file is valid.' },
  { id: 'inf_audit', category: 'Infrastructure & Compliance', label: 'Modify a completed shift as Admin. Verify Audit log was recorded properly.' },
  { id: 'inf_error', category: 'Infrastructure & Compliance', label: 'Trigger an intentional frontend error (invalid boundary) and verify boundary component handles it properly.' },
];

export default function TestingChecklist() {
  const { token, user } = useAuth();
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.testingChecklistProgress) {
          try {
            const parsed = typeof data.testingChecklistProgress === 'string' ? JSON.parse(data.testingChecklistProgress) : data.testingChecklistProgress;
            setProgress(parsed);
          } catch(e){}
        }
      }
    } catch(e) {}
  };

  const handleToggle = (id: string) => {
    const newProgress = { ...progress, [id]: !progress[id] };
    setProgress(newProgress);
    saveProgress(newProgress);
  };

  const saveProgress = async (newProgress: Record<string, boolean>) => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    setSaveStatus('');
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ testingChecklistProgress: newProgress })
      });
      setSaveStatus('Saved');
    } catch(e) {
      setSaveStatus('Error saving');
    } finally {
      setLoading(false);
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const grouped = CHECKLIST_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof CHECKLIST_ITEMS>);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-lg font-medium text-[#E6EDF3] mb-2">Pre-Launch Testing Checklist</h3>
          <p className="text-sm text-[#8B949E]">
            Verify critical system functionalities before going live. Your progress is saved automatically.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-brand-teal mb-1">{percent}% Complete</div>
          <div className="text-xs text-[#8B949E]">{completedCount} of {totalCount} tasks passed</div>
        </div>
      </div>

      <div className="w-full bg-brand-navy border border-border-subtle rounded-full h-2 mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-teal to-brand-green h-2 transition-all duration-500 ease-out" style={{ width: `${percent}%` }}></div>
      </div>
      
      <div className="space-y-8">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-brand-navy border border-border-subtle rounded-xl overflow-hidden shadow-sm">
            <div className="bg-brand-bg px-6 py-4 border-b border-border-subtle">
              <h4 className="font-medium text-[#E6EDF3] text-sm uppercase tracking-wider">{category}</h4>
            </div>
            <div className="divide-y divide-border-subtle">
              {items.map(item => {
                const isChecked = !!progress[item.id];
                return (
                  <div 
                    key={item.id} 
                    className={`px-6 py-4 flex items-start gap-4 transition-colors ${isChecked ? 'bg-brand-bg/30' : 'hover:bg-brand-bg/50 cursor-pointer'}`}
                    onClick={() => handleToggle(item.id)}
                  >
                    <button 
                      className={`mt-0.5 shrink-0 transition-colors focus:outline-none`}
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-teal" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8B949E]" />
                      )}
                    </button>
                    <div className={`text-[13px] ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
