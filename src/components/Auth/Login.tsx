import React, { useState, useRef } from 'react';
import { useAuth, RememberedAccount, REMEMBERED_ACCOUNTS_KEY } from '../../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { X, Shield, User as UserIcon, Loader2 } from 'lucide-react';

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickSigningInEmail, setQuickSigningInEmail] = useState<string | null>(null);
  const [publicSettings, setPublicSettings] = useState<any>({});
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(() => {
    try {
      const raw = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  React.useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  React.useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => setPublicSettings(data))
      .catch(err => console.error('Error fetching public settings:', err));
  }, []);

  // Refresh avatars/names for remembered accounts from the server
  React.useEffect(() => {
    if (rememberedAccounts.length === 0) return;
    const emails = rememberedAccounts.map(a => a.email).filter(Boolean);
    if (emails.length === 0) return;

    fetch('/api/public/account-previews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails })
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data || !Array.isArray(data.accounts)) return;
        const previewMap = new Map<string, any>();
        data.accounts.forEach((acc: any) => {
          if (acc.email) previewMap.set(acc.email.toLowerCase(), acc);
        });

        setRememberedAccounts(prev => {
          const updated = prev.map(item => {
            const fresh = previewMap.get(item.email.toLowerCase());
            if (!fresh) return item;
            return {
              ...item,
              id: fresh.id ?? item.id,
              firstName: fresh.firstName || item.firstName,
              lastName: fresh.lastName || item.lastName,
              role: fresh.role || item.role,
              avatarUrl: fresh.avatarUrl || item.avatarUrl,
            };
          });
          try {
            localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      })
      .catch(() => {});
  }, []);

  const handleQuickAccountClick = async (acc: RememberedAccount) => {
    setError('');
    setEmail(acc.email);

    // If this remembered account has a valid token, sign in immediately with 1 click
    if (acc.token) {
      setQuickSigningInEmail(acc.email);
      try {
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${acc.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          login(acc.token, data.user, data.settings);
          setRememberedStateAfterLogin();
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
          navigate(redirectPath, { replace: true });
          return;
        } else {
          // Token expired or invalid — clear token on this remembered entry and focus password
          setRememberedAccounts(prev => {
            const updated = prev.map(item =>
              item.email.toLowerCase() === acc.email.toLowerCase()
                ? { ...item, token: undefined }
                : item
            );
            try {
              localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch {
        // Network error — fall back to focusing password
      } finally {
        setQuickSigningInEmail(null);
      }
    }

    // Focus password field if token wasn't available or expired
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const setRememberedStateAfterLogin = () => {
    try {
      const raw = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
      if (raw) setRememberedAccounts(JSON.parse(raw));
    } catch {}
  };

  const handleRemoveRememberedAccount = (e: React.MouseEvent, targetEmail: string) => {
    e.stopPropagation();
    setRememberedAccounts(prev => {
      const filtered = prev.filter(a => a.email.toLowerCase() !== targetEmail.toLowerCase());
      try {
        localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user, data.settings);
      setRememberedStateAfterLogin();
      
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#0B0E14] py-12 px-4 sm:px-4 lg:px-8 text-zinc-100 overflow-hidden z-0">
      
      {/* Animated Floating Orbs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#0052FF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, -50, -100, 0],
          scale: [0.8, 1, 1.2, 0.8],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FFFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, 100, -50, 0],
          scale: [1.2, 0.8, 1, 1.2],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#32CD32] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"
      />

      <div className="max-w-md w-full space-y-8 bg-[#161B22]/80 backdrop-blur-md p-8 rounded-xl border border-white/[0.05] shadow-2xl relative z-10">
        <div className="flex flex-col flex-1 items-center justify-center pt-2">
          {publicSettings?.websiteLogo ? (
            <img 
              src={publicSettings.websiteLogo} 
              alt={publicSettings?.businessName || "Company Logo"} 
              className="w-full max-w-full h-auto max-h-[200px] object-contain mx-auto" 
            />
          ) : (
            <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
              {publicSettings?.businessName || "Happy in the Home"}
            </h2>
          )}
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enterprise Portal
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center bg-red-950/30 p-3 rounded">{error}</div>}
          <div className="rounded-md space-y-4 shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-white/[0.12] bg-[#121214] placeholder-zinc-400 text-white rounded-md focus:outline-none focus:ring-brand-teal focus:border-brand-teal focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-teal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          <div className="text-center mt-4">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-teal hover:underline focus:outline-none">
              Forgot Password?
            </Link>
          </div>

          {rememberedAccounts.length > 0 && (
            <div className="pt-4 border-t border-white/[0.08]">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 text-center mb-3">
                Quick Sign In
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {rememberedAccounts.map((acc) => {
                  const initials = `${acc.firstName?.[0] || ''}${acc.lastName?.[0] || ''}`.toUpperCase() || acc.email?.[0]?.toUpperCase() || '?';
                  const isSelected = email.trim().toLowerCase() === acc.email.toLowerCase();
                  const isSigningInThis = quickSigningInEmail === acc.email;
                  const isAdmin = acc.role === 'ADMIN';

                  return (
                    <div
                      key={acc.email}
                      onClick={() => !isSigningInThis && handleQuickAccountClick(acc)}
                      title={`${acc.firstName || ''} ${acc.lastName || ''} (${acc.email})${acc.token ? ' — Click for 1-click sign in' : ''}`.trim()}
                      className={`group relative flex flex-col items-center p-2.5 w-24 rounded-xl border cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'bg-[#1C2331] border-brand-teal/60 shadow-md shadow-brand-teal/10'
                          : 'bg-[#121214]/90 hover:bg-[#1C2331]/80 border-white/[0.08] hover:border-white/[0.2]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRememberedAccount(e, acc.email)}
                        title="Remove shortcut"
                        className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 hover:bg-red-500 text-zinc-400 hover:text-white border border-white/10 flex items-center justify-center transition-all z-10 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-brand-blue/30 to-brand-teal/30 border border-white/10 flex items-center justify-center shadow-inner mb-1.5">
                        {acc.avatarUrl ? (
                          <img
                            src={acc.avatarUrl}
                            alt={acc.firstName || acc.email}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base font-bold text-white tracking-tight">
                            {initials}
                          </span>
                        )}

                        {isSigningInThis && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
                          </div>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-zinc-100 truncate w-full text-center leading-tight">
                        {acc.firstName || acc.email.split('@')[0]}
                      </span>

                      <span
                        className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-brand-blue/20 text-sky-400 border border-sky-500/30'
                            : 'bg-brand-teal/15 text-brand-teal border border-brand-teal/30'
                        }`}
                      >
                        {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <UserIcon className="w-2.5 h-2.5" />}
                        {acc.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
