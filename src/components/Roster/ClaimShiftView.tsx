import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, MapPin, ArrowRight, UserCheck, ShieldAlert, Home, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ShiftClaimDetails {
  id: number;
  start_time: string;
  end_time: string;
  timezone?: string;
  client_name?: string;
  service_name?: string;
  service_type?: string;
  client_suburb?: string;
  client_address?: string;
  notes?: string;
  status: string;
  is_unassigned: boolean;
  assigned_staff_name?: string;
  intended_staff?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email?: string;
  } | null;
  token_valid?: boolean;
  token_error?: string | null;
}

export default function ClaimShiftView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const claimToken = searchParams.get('token');
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [shift, setShift] = useState<ShiftClaimDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [claimedStaffName, setClaimedStaffName] = useState<string | null>(null);
  const [isAlreadyFilled, setIsAlreadyFilled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage(null);

    const query = claimToken ? `?token=${encodeURIComponent(claimToken)}` : '';
    fetch(`/api/shifts/${id}/claim-details${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch shift details');
        }
        return res.json();
      })
      .then((data) => {
        setShift(data);
        if (!data.is_unassigned) {
          setIsAlreadyFilled(true);
        }
      })
      .catch((err) => {
        console.error('Error fetching shift claim details:', err);
        setErrorMessage(err.message || 'Unable to retrieve shift details.');
      })
      .finally(() => setIsLoading(false));
  }, [id, token, claimToken]);

  const handleAcceptShift = async () => {
    setIsClaiming(true);
    setErrorMessage(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/shifts/${id}/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          claim_token: claimToken || undefined
        })
      });

      const data = await res.json();

      if (res.status === 409 && data.accountMismatch) {
        setErrorMessage(data.error);
        return;
      }

      if (res.status === 409 || data.alreadyFilled) {
        setIsAlreadyFilled(true);
        setErrorMessage('This shift has already been filled. Thank you!');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim shift');
      }

      // Success
      setClaimedStaffName(data.claimedStaffName || shift?.intended_staff?.full_name || null);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error claiming shift:', err);
      setErrorMessage(err.message || 'Failed to claim shift. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const formatShiftDate = (startStr: string) => {
    try {
      const d = new Date(startStr);
      return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: shift?.timezone || 'Australia/Perth'
      });
    } catch {
      return startStr;
    }
  };

  const formatShiftTime = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const tz = shift?.timezone || 'Australia/Perth';
      const startFmt = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
      const endFmt = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
      const durationHours = ((e.getTime() - s.getTime()) / (1000 * 60 * 60)).toFixed(2);
      return `${startFmt} - ${endFmt} (${durationHours} hrs)`;
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  // Determine if there is an identity mismatch between currently signed-in user and intended recipient
  const intendedStaff = shift?.intended_staff;
  const isAccountMismatch = Boolean(
    intendedStaff &&
    user &&
    Number(user.id) !== Number(intendedStaff.id)
  );

  return (
    <div className="min-h-screen bg-[#0B0E14] text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            HAPPY IN THE HOME
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Shift Broadcast Offer</h1>
          <p className="text-xs text-zinc-400 mt-1">First-come, first-served shift opportunity</p>
        </div>

        {/* Main Card */}
        <div className="bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-zinc-400">Loading shift offer details...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Shift Claimed Successfully!</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  This shift has been officially confirmed on your roster. You can view full details in your staff portal.
                </p>
              </div>

              {(claimedStaffName || intendedStaff) && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <UserCheck className="w-4 h-4" />
                  <span>Assigned to: <strong>{claimedStaffName || intendedStaff?.full_name}</strong></span>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/roster"
                  className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all text-center text-sm flex items-center justify-center gap-2"
                >
                  Go to Roster <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/"
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" /> Dashboard
                </Link>
              </div>
            </div>
          ) : isAlreadyFilled ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Shift Already Filled</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Thank you for your interest! Another team member has already accepted this shift offer.
                </p>
              </div>

              {shift?.assigned_staff_name && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/[0.06] text-xs text-zinc-300">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span>Filled by: <strong>{shift.assigned_staff_name}</strong></span>
                </div>
              )}

              <div className="pt-4">
                <Link
                  to="/roster"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition-all text-sm"
                >
                  View Available Roster
                </Link>
              </div>
            </div>
          ) : shift ? (
            <div className="space-y-6">
              {/* Account Mismatch Warning Banner */}
              {isAccountMismatch && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-300">Account Mismatch Detected</h3>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        You are currently signed into the portal as <strong className="text-white">{user?.first_name} {user?.last_name}</strong>.
                      </p>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        However, this shift offer was broadcast specifically to <strong className="text-purple-300">{intendedStaff?.full_name}</strong>.
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1.5">
                        To prevent claiming shifts under someone else's name, you cannot accept this shift as {user?.first_name}. Please switch to {intendedStaff?.full_name}'s account.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        const currentPath = window.location.pathname + window.location.search;
                        navigate(`/login?redirect=${encodeURIComponent(currentPath)}&email=${encodeURIComponent(intendedStaff?.email || '')}`);
                      }}
                      className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-md transition-all active:scale-95"
                    >
                      Switch to {intendedStaff?.full_name}'s Account
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/roster')}
                      className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-lg transition-all"
                    >
                      Return to Roster
                    </button>
                  </div>
                </div>
              )}

              {/* General Error Banner */}
              {errorMessage && !isAccountMismatch && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Token Error Warning if token is invalid or expired */}
              {shift.token_error && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-400 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{shift.token_error}</span>
                </div>
              )}

              {/* Recipient verification banner */}
              {intendedStaff && !isAccountMismatch && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-purple-300">
                      Offer sent to: <strong className="text-white">{intendedStaff.full_name}</strong>
                    </span>
                  </div>
                  {user && Number(user.id) === Number(intendedStaff.id) && (
                    <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              )}

              {/* Shift Key Details */}
              <div className="space-y-4 divide-y divide-white/[0.06]">
                <div className="flex items-start gap-3 pt-1">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Date</p>
                    <p className="text-sm font-bold text-zinc-100">{formatShiftDate(shift.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Shift Time</p>
                    <p className="text-sm font-bold text-zinc-100">{formatShiftTime(shift.start_time, shift.end_time)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Service Type</p>
                    <p className="text-sm font-bold text-zinc-100">
                      {shift.service_name || shift.service_type || 'Standard Care & Support'}
                    </p>
                  </div>
                </div>

                {shift.client_name && (
                  <div className="flex items-start gap-3 pt-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Client</p>
                      <p className="text-sm font-bold text-zinc-100">{shift.client_name}</p>
                    </div>
                  </div>
                )}

                {(shift.client_address || shift.client_suburb) && (
                  <div className="flex items-start gap-3 pt-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Location</p>
                      <p className="text-sm font-bold text-zinc-100">{shift.client_address || shift.client_suburb}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Section */}
              {isAccountMismatch ? (
                // When mismatched, DO NOT show the normal Accept Shift button!
                <div className="p-3 bg-zinc-900/60 border border-white/[0.06] rounded-xl text-center">
                  <p className="text-xs text-zinc-400">
                    Accept button disabled due to account mismatch. Please switch accounts above to claim this shift.
                  </p>
                </div>
              ) : !token ? (
                // User is not logged in on this browser
                intendedStaff && claimToken ? (
                  // Valid token for intended staff
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleAcceptShift}
                      disabled={isClaiming}
                      className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    >
                      {isClaiming ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Claiming Shift...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Accept Shift as {intendedStaff.full_name}
                        </>
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const currentPath = window.location.pathname + window.location.search;
                          navigate(`/login?redirect=${encodeURIComponent(currentPath)}&email=${encodeURIComponent(intendedStaff.email || '')}`);
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline"
                      >
                        Or log into your portal account first
                      </button>
                    </div>
                  </div>
                ) : (
                  // Generic login prompt
                  <div className="p-4 bg-zinc-900/60 border border-white/[0.06] rounded-xl text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Please log in to your staff account to claim this shift.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentPath = window.location.pathname + window.location.search;
                        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
                      }}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                    >
                      Log In to Accept Shift
                    </button>
                  </div>
                )
              ) : (
                // User is authenticated and matches
                <button
                  type="button"
                  onClick={handleAcceptShift}
                  disabled={isClaiming}
                  className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isClaiming ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Claiming Shift...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Accept Shift
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-3 py-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-zinc-300 font-semibold">Shift Not Found</p>
              <p className="text-xs text-zinc-500">The requested shift offer could not be found or may have expired.</p>
              <Link to="/roster" className="inline-block mt-3 text-sm text-purple-400 hover:underline">
                Return to Roster
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
