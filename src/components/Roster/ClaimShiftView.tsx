import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, MapPin, ArrowRight, UserCheck, ShieldAlert, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ShiftClaimDetails {
  id: number;
  start_time: string;
  end_time: string;
  service_name?: string;
  service_type?: string;
  client_suburb?: string;
  notes?: string;
  status: string;
  is_unassigned: boolean;
  assigned_staff_name?: string;
}

export default function ClaimShiftView() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [shift, setShift] = useState<ShiftClaimDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyFilled, setIsAlreadyFilled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setErrorMessage(null);

    fetch(`/api/shifts/${id}/claim-details`, {
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
  }, [id, token]);

  const handleAcceptShift = async () => {
    if (!token) {
      // Direct user to login with return path
      navigate(`/login?redirect=/shifts/claim/${id}`);
      return;
    }

    setIsClaiming(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/shifts/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.status === 409 || data.alreadyFilled) {
        setIsAlreadyFilled(true);
        setErrorMessage('This shift has already been filled. Thank you!');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim shift');
      }

      // Success
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
        year: 'numeric'
      });
    } catch {
      return startStr;
    }
  };

  const formatShiftTime = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const startFmt = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endFmt = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const durationHours = ((e.getTime() - s.getTime()) / (1000 * 60 * 60)).toFixed(2);
      return `${startFmt} - ${endFmt} (${durationHours} hrs)`;
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">Checking shift availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[#121316] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">HAPPY IN THE HOME</h1>
              <p className="text-xs text-zinc-400">Support Worker Shift Offer</p>
            </div>
          </div>
          <Link
            to="/roster"
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Go to Roster"
          >
            <Home className="w-5 h-5" />
          </Link>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Success State */}
          {isSuccess ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Shift Claimed Successfully!</h2>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  You have been assigned to this shift. It is now published directly onto your roster calendar.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/roster')}
                  className="w-full py-3 px-4 bg-brand-green hover:bg-brand-green/90 text-zinc-950 font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  View My Roster <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isAlreadyFilled ? (
            /* Already Filled / Race Condition Lost State */
            <div className="text-center space-y-4 py-4 animate-in fade-in">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Clock className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Shift Already Filled</h2>
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 font-medium text-sm">
                  This shift has already been filled. Thank you!
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto pt-1">
                  Another support worker accepted this shift offer first. Please keep an eye out for future broadcast notifications!
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/roster')}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all active:scale-95"
                >
                  Back to Roster
                </button>
              </div>
            </div>
          ) : shift ? (
            /* Active Claim State */
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-purple-400">Available Shift</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                    First-Come, First-Served
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">Claim This Shift</h2>
                <p className="text-xs text-zinc-400">
                  Review the shift schedule below and click Accept to confirm your assignment.
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Shift Details Box */}
              <div className="bg-zinc-900/90 border border-white/[0.08] rounded-xl p-5 space-y-4 shadow-inner">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Date</p>
                    <p className="text-sm font-bold text-zinc-100">{formatShiftDate(shift.start_time)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Shift Time</p>
                    <p className="text-sm font-bold text-zinc-100">{formatShiftTime(shift.start_time, shift.end_time)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
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

                {shift.client_suburb && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-semibold text-zinc-500 tracking-wider">Location / Suburb</p>
                      <p className="text-sm font-bold text-zinc-100">{shift.client_suburb}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {!token ? (
                <div className="p-4 bg-zinc-900/60 border border-white/[0.06] rounded-xl text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Please log in to your staff account to claim this shift.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/login?redirect=/shifts/claim/${id}`)}
                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    Log In to Accept Shift
                  </button>
                </div>
              ) : (
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
