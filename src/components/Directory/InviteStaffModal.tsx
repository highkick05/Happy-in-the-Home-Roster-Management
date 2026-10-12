import React, { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle, Briefcase, Award } from 'lucide-react';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export default function InviteStaffModal({ isOpen, onClose, token }: InviteStaffModalProps) {
  const [email, setEmail] = useState('');
  const [primaryPosition, setPrimaryPosition] = useState('Support Worker');
  const [positionId, setPositionId] = useState<number | null>(null);
  const [payCategoryId, setPayCategoryId] = useState<number | null>(null);

  const [positions, setPositions] = useState<any[]>([]);
  const [payCategories, setPayCategories] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setSuccessMsg('');
      setGeneratedLink('');
      setCopied(false);

      fetch('/api/positions', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPositions(data);
            const defaultPos = data.find(p => p.name.toLowerCase().includes('support worker')) || data[0];
            if (defaultPos) {
              setPrimaryPosition(defaultPos.name);
              setPositionId(defaultPos.id);
            }
          }
        })
        .catch(() => {});

      fetch('/api/pay-categories', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPayCategories(data);
        })
        .catch(() => {});
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid staff email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setGeneratedLink('');

    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          primaryPosition,
          positionId,
          payCategoryId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send staff invitation');
      }

      setSuccessMsg(data.message || 'Invitation email sent successfully!');
      if (data.inviteLink) {
        setGeneratedLink(data.inviteLink);
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.08] bg-[#0c0d10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Invite New Staff Member</h2>
              <p className="text-xs text-zinc-400">Sends an email link for the staff member to complete their user registration.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {successMsg ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-300">Invitation Sent!</p>
                  <p className="text-xs text-emerald-400/90 leading-relaxed">
                    An email invitation has been dispatched to <strong>{email}</strong> using your configured Email Settings (SMTP).
                  </p>
                </div>
              </div>

              {generatedLink && (
                <div className="p-3.5 bg-black/50 border border-white/[0.08] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">Direct Invitation Link (Backup)</label>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer underline"
                    >
                      {copied ? 'Copied to clipboard!' : 'Copy Link'}
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-zinc-300 font-mono select-all focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-500">
                    You can also copy and send this link directly to the staff member via SMS or messaging if needed.
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-teal text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Staff Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff.member@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-blue transition-colors"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  This email will serve as their username when signing in to the staff portal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Job Classification</span>
                  </label>
                  <select
                    value={primaryPosition}
                    onChange={(e) => {
                      const posName = e.target.value;
                      setPrimaryPosition(posName);
                      const match = positions.find(p => p.name === posName);
                      setPositionId(match ? match.id : null);
                    }}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-blue transition-colors cursor-pointer"
                  >
                    {positions.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    {positions.length === 0 && (
                      <option value="Support Worker">Support Worker</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Award Pay Category</span>
                  </label>
                  <select
                    value={payCategoryId || ''}
                    onChange={(e) => setPayCategoryId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-blue transition-colors cursor-pointer"
                  >
                    <option value="">-- Optional / Default --</option>
                    {payCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-lg text-xs text-sky-300/90 leading-relaxed">
                <span className="font-semibold block mb-0.5 text-sky-300">How staff onboarding works:</span>
                The staff member receives a secure onboarding invitation email. Clicking the link takes them to a mobile-optimized signup page where they enter their <strong>First Name, Last Name, Mobile Number, Full Address, and Password</strong>. Upon submission, they are automatically logged in and redirected straight to their <strong>Profile section</strong> to complete their details.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold rounded-md shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
                  <span>{loading ? 'Sending Invitation...' : 'Send Invitation Email'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
