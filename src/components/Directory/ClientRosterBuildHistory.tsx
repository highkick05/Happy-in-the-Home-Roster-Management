import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, ChevronDown, ChevronUp, AlertTriangle, Trash2, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onRevertSuccess: () => void;
}

export default function ClientRosterBuildHistory({ clientId, isOpen, onClose, onRevertSuccess }: Props) {
  const { token, user, settings } = useAuth();
  const tz = typeof settings?.timezone === 'string' ? settings.timezone.replace(/['"]+/g, '') : 'Australia/Perth';

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const formatDateTimeLocal = (dateIso: string) => {
    if (!dateIso) return '';
    try {
      const d = new Date(dateIso);
      const str = d.toLocaleString('en-AU', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      // str might be "14/05/2026, 10:00 am". Replace / with -
      return str.replace(/\//g, '-');
    } catch {
      return new Date(dateIso).toLocaleString();
    }
  };

  const formatTimeLocal = (dateIso: string) => {
    if (!dateIso) return '';
    try {
      const d = new Date(dateIso);
      return d.toLocaleTimeString('en-AU', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateIso;
    }
  };

  const formatDateLocal = (dateIso: string) => {
    if (!dateIso) return '';
    try {
      const d = new Date(dateIso);
      const str = d.toLocaleDateString('en-AU', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return str.replace(/\//g, '-');
    } catch {
      return dateIso;
    }
  };

  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);
  const [shiftsCache, setShiftsCache] = useState<Record<string, any[]>>({});
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBuilds();
    }
  }, [isOpen]);

  const fetchBuilds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/roster-builds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBuilds(data);
    } catch (e) {
      console.error('Failed to fetch builds', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (buildId: string) => {
    if (expandedBuildId === buildId) {
      setExpandedBuildId(null);
      return;
    }
    
    setExpandedBuildId(buildId);
    
    if (!shiftsCache[buildId]) {
      setLoadingShifts(true);
      try {
        const res = await fetch(`/api/roster/builds/${buildId}/shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setShiftsCache(prev => ({ ...prev, [buildId]: data }));
      } catch (e) {
        console.error('Failed to fetch shifts for build', e);
      } finally {
        setLoadingShifts(false);
      }
    }
  };

  const handleRevert = async (buildId: string) => {
    if (!window.confirm('Are you sure? This permanently deletes the shifts generated during this run.')) return;
    
    setRevertingId(buildId);
    try {
      const res = await fetch(`/api/roster/builds/${buildId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBuilds(builds.filter(b => b.id !== buildId));
        setExpandedBuildId(null);
        window.dispatchEvent(new CustomEvent('offline-sync-completed'));
        onRevertSuccess();
      } else {
        alert('Failed to revert build.');
      }
    } catch (e) {
      console.error('Failed to revert build', e);
      alert('Error reverting build.');
    } finally {
      setRevertingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#09090b] border border-white/[0.08] rounded-xl shadow-2xl max-w-4xl w-full flex flex-col h-[80vh] overflow-hidden">
        <div className="p-5 border-b border-white/[0.08] flex justify-between items-center bg-[#121214] rounded-t-xl shrink-0">
          <div className="flex items-center">
            <History className="w-5 h-5 text-brand-teal mr-2.5" />
            <h3 className="text-xl font-semibold text-white">Build History</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading history...</div>
          ) : builds.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
              <CalendarDays className="w-12 h-12 mb-3 text-zinc-700" />
              <p>No roster builds found for this client.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {builds.map(build => (
                <div key={build.id} className="flex flex-col">
                  {/* Build Row */}
                  <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white mb-1">
                        Build Date: {formatDateTimeLocal(build.created_at)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Target Date Range: {formatDateString(build.date_range_start)} to {formatDateString(build.date_range_end)}
                      </div>
                      <div className="text-xs text-brand-teal font-medium mt-1">
                        {build.shift_count} Shifts Generated
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(build.id)}
                        className="px-3 py-1.5 flex items-center text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                      >
                        {expandedBuildId === build.id ? 'Hide Details' : 'View Details'}
                        {expandedBuildId === build.id ? <ChevronUp className="w-3.5 h-3.5 ml-1.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-1.5" />}
                      </button>
                      <button
                        onClick={() => handleRevert(build.id)}
                        disabled={revertingId === build.id}
                        className="px-3 py-1.5 flex items-center text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded transition-colors disabled:opacity-50"
                      >
                        {revertingId === build.id ? 'Reverting...' : 'Revert Build'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expandable Shifts Table */}
                  {expandedBuildId === build.id && (
                    <div className="bg-black/20 p-4 border-t border-b border-white/[0.04] max-h-60 overflow-y-auto custom-scrollbar">
                      {loadingShifts ? (
                        <div className="text-center text-xs text-zinc-500 py-4">Loading shifts...</div>
                      ) : shiftsCache[build.id] && shiftsCache[build.id].length > 0 ? (
                        <table className="w-full text-left text-xs min-w-max">
                          <thead className="text-zinc-500 border-b border-white/[0.08]">
                            <tr>
                              <th className="font-medium py-2 px-3">Date</th>
                              <th className="font-medium py-2 px-3">Shift Timing</th>
                              <th className="font-medium py-2 px-3">Assigned Staff</th>
                              <th className="font-medium py-2 px-3">Care Type</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {shiftsCache[build.id].map((shift: any) => (
                              <tr key={shift.id} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 text-white">{formatDateLocal(shift.start_time)}</td>
                                <td className="py-2 px-3 text-zinc-300">{formatTimeLocal(shift.start_time)} - {formatTimeLocal(shift.end_time)}</td>
                                <td className="py-2 px-3 text-zinc-300">{shift.staff_first_name} {shift.staff_last_name}</td>
                                <td className="py-2 px-3 text-zinc-400">{shift.service_name || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-center text-xs text-zinc-500 py-4">No shifts found for this build.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
