import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { User, Phone, MapPin, Lock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

export default function StaffInviteAcceptView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [checking, setChecking] = useState(true);
  const [inviteData, setInviteData] = useState<{ email: string; primaryPosition?: string } | null>(null);
  const [loadError, setLoadError] = useState('');

  // Form inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Address suggestions
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoadError('Missing invitation link.');
      setChecking(false);
      return;
    }

    fetch(`/api/staff/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Invalid or expired invitation link.');
        }
        setInviteData(data);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to verify invitation link.');
      })
      .finally(() => setChecking(false));
  }, [token]);

  // Autocomplete for address
  useEffect(() => {
    const trimmed = address.trim();
    if (trimmed.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAddressSuggestions(data);
          }
        }
      } catch (e) {
        // Ignore transients
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim()) {
      setFormError('Please enter your First Name.');
      return;
    }
    if (!lastName.trim()) {
      setFormError('Please enter your Last Name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your mobile phone number.');
      return;
    }
    if (!address.trim()) {
      setFormError('Please enter your full residential address.');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Automatically log the user into the portal with their new session
      if (data.token && data.user) {
        login(data.token, data.user, data.settings);
        // Redirect directly to their Profile section
        navigate('/profile', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-brand-teal border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400">Verifying your invitation link...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161B22]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Invitation Unavailable</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{loadError}</p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0B0E14] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-zinc-100 overflow-x-hidden">
      {/* Ambient background glow */}
      <motion.div
        animate={{
          x: [0, 60, -30, 0],
          y: [0, 30, 60, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-[#0052FF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -50, 40, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.2, 0.95, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-[#2dd4bf] rounded-full mix-blend-screen filter blur-[110px] opacity-15 pointer-events-none"
      />

      <div className="max-w-xl w-full bg-[#161B22]/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/[0.08] shadow-2xl relative z-10 my-4">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Staff Portal Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Create Staff Profile
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Welcome to the team! Enter your core profile details below to activate your staff user account.
          </p>
        </div>

        {/* Username/Email preview card */}
        <div className="p-3.5 bg-black/40 border border-white/[0.06] rounded-xl flex items-center justify-between mb-5 text-xs">
          <div>
            <span className="text-zinc-500 block text-[11px]">Assigned Username / Email</span>
            <span className="font-semibold text-white break-all">{inviteData?.email}</span>
          </div>
          {inviteData?.primaryPosition && (
            <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded text-[11px] font-medium shrink-0 ml-2">
              {inviteData.primaryPosition}
            </span>
          )}
        </div>

        {formError && (
          <div className="p-3 mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>First Name <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Andrea"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Last Name <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cerezo"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-zinc-400" />
              <span>Mobile Phone Number <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0412 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Used for shift alerts and direct portal communications.</p>
          </div>

          {/* Full Address with Autocomplete dropdown */}
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Residential Address <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="text"
              required
              placeholder="Start typing your street address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
            />
            {loadingSuggestions && (
              <span className="absolute right-3 top-9 text-[10px] text-zinc-500">Searching...</span>
            )}
            {addressSuggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-[#18181b] border border-white/[0.12] rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/[0.05]">
                {addressSuggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    onClick={() => {
                      setAddress(suggestion);
                      setAddressSuggestions([]);
                    }}
                    className="px-3.5 py-2.5 text-xs text-zinc-200 hover:bg-brand-teal/15 hover:text-white cursor-pointer transition-colors"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-zinc-500 mt-1">Required for travel log calculation and safety compliance.</p>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Password <span className="text-rose-400">*</span></span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Confirm Password <span className="text-rose-400">*</span></span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#121214] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-teal transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-brand-teal to-brand-green hover:opacity-90 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-teal/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Setting Up Your Profile...' : 'Complete Registration & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 text-center pt-1">
            After completing these steps, you will be redirected to your Profile to add your bank, super, and emergency contact details.
          </p>
        </form>
      </div>
    </div>
  );
}
