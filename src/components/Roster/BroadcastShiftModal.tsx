import React, { useState, useEffect, useMemo } from 'react';
import { X, Radio, Send, CheckSquare, Square, Search, AlertCircle, CheckCircle2, UserCheck, Clock, Calendar, Briefcase, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ShiftEvent } from './types';

interface BroadcastShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftEvent;
  onBroadcastSuccess?: () => void;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  primary_position?: string;
  avatar_url?: string;
}

export default function BroadcastShiftModal({ isOpen, onClose, shift, onBroadcastSuccess }: BroadcastShiftModalProps) {
  const { token } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedStaffIds([]);
      setSearchQuery('');
      setError(null);
      setSuccessMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    fetch('/api/staff', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load staff list');
        const data = await res.json();
        // Filter to active staff members who have valid email addresses
        const activeStaff = (Array.isArray(data) ? data : [])
          .filter((s: StaffMember) => s.status !== 'INACTIVE' && s.email && s.email.trim() !== '')
          .sort((a: StaffMember, b: StaffMember) => 
            (a.first_name || '').localeCompare(b.first_name || '')
          );
        setStaffList(activeStaff);
      })
      .catch((err) => {
        console.error('Error fetching staff for shift broadcast:', err);
        setError('Unable to load staff profiles. Please check your connection.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, token]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter((s) => 
      `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.primary_position || '').toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  const handleToggleStaff = (id: number) => {
    setSelectedStaffIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStaff.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedStaffIds.includes(id));
    if (allSelected) {
      setSelectedStaffIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSendBroadcast = async () => {
    if (selectedStaffIds.length === 0) {
      setError('Please select at least one staff member to receive this shift offer.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/shifts/${shift.id}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ staff_ids: selectedStaffIds })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch broadcast emails');
      }

      setSuccessMessage(
        `Shift offer sent to ${data.dispatchedCount || selectedStaffIds.length} staff member${selectedStaffIds.length === 1 ? '' : 's'}!`
      );

      setTimeout(() => {
        if (onBroadcastSuccess) onBroadcastSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Broadcast error:', err);
      setError(err.message || 'An error occurred while sending the broadcast emails.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const startDate = new Date(shift.start);
  const endDate = new Date(shift.end);
  const formattedDate = startDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, ' ');
  const formattedStartTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedEndTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const areAllFilteredSelected = 
    filteredStaff.length > 0 && 
    filteredStaff.every((s) => selectedStaffIds.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#121316] border border-white/[0.1] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Broadcast Shift Offer</h2>
              <p className="text-xs text-zinc-400">Send an instant invitation to active support staff</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Shift Details Summary Card */}
          <div className="bg-zinc-900/80 rounded-xl p-4 border border-white/[0.08] shadow-inner space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-purple-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> Shift Summary
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                Unassigned
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-zinc-500 font-medium uppercase">Date</p>
                  <p className="font-semibold text-zinc-200">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] text-zinc-500 font-medium uppercase">Time</p>
                  <p className="font-semibold text-zinc-200">{formattedStartTime} - {formattedEndTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Briefcase className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500 font-medium uppercase">Service Type</p>
                  <p className="font-semibold text-zinc-200 truncate" title={shift.serviceName || shift.serviceType || 'Standard Service'}>
                    {shift.serviceName || shift.serviceType || 'Standard Service'}
                  </p>
                </div>
              </div>
            </div>

            {shift.clientName && (
              <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2 text-xs text-zinc-400">
                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Client: <strong className="text-zinc-200">{shift.clientName}</strong></span>
              </div>
            )}
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Staff Search & Batch Selection Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-teal" /> Select Staff Members to Offer
              </label>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                disabled={isLoading || filteredStaff.length === 0}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                {areAllFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Select All ({filteredStaff.length})
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/60 border border-white/[0.08] rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          {/* Staff List */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a0c]">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full mb-2" />
                <p>Loading active staff profiles...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No active staff members found matching your search.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
                {filteredStaff.map((staff) => {
                  const isChecked = selectedStaffIds.includes(staff.id);
                  return (
                    <div
                      key={staff.id}
                      onClick={() => handleToggleStaff(staff.id)}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-purple-900/20 hover:bg-purple-900/30' 
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by container row click
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {staff.first_name} {staff.last_name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {staff.email} {staff.primary_position ? `• ${staff.primary_position}` : ''}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        isChecked 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {isChecked ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span>
              <strong>{selectedStaffIds.length}</strong> staff member{selectedStaffIds.length === 1 ? '' : 's'} selected
            </span>
            <span className="text-[11px] text-zinc-500 italic">
              First staff member to click Accept gets the shift.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={isSending || selectedStaffIds.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending Offers...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Shift Offer ({selectedStaffIds.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
