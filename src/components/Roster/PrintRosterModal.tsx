import React, { useState, useMemo } from 'react';
import { X, Printer, Calendar as CalendarIcon, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { addWeeks } from 'date-fns/addWeeks';

interface PrintRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  invoicingStartDay?: string;
  activeFilterDescription: string;
  onPrint: (rangeStart: Date, rangeEnd: Date) => Promise<void>;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PrintRosterModal({
  isOpen,
  onClose,
  currentDate,
  invoicingStartDay = 'Monday',
  activeFilterDescription,
  onPrint
}: PrintRosterModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<'1' | '2' | '3' | '4' | 'custom'>('1');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const weekStartsOn = useMemo(() => {
    const idx = DAYS_OF_WEEK.indexOf(invoicingStartDay);
    return (idx !== -1 ? idx : 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  }, [invoicingStartDay]);

  const baseWeekStart = useMemo(() => {
    return startOfWeek(currentDate, { weekStartsOn });
  }, [currentDate, weekStartsOn]);

  const presets = useMemo(() => {
    const getRange = (numWeeks: number) => {
      const start = baseWeekStart;
      const targetEndWeek = addWeeks(baseWeekStart, numWeeks - 1);
      const end = endOfWeek(targetEndWeek, { weekStartsOn });
      return { start, end };
    };

    return [
      {
        id: '1' as const,
        label: 'Current Week',
        sublabel: '1 Week',
        ...getRange(1)
      },
      {
        id: '2' as const,
        label: '2 Weeks (Fortnight)',
        sublabel: '2 Weeks',
        ...getRange(2)
      },
      {
        id: '3' as const,
        label: '3 Weeks',
        sublabel: '3 Weeks',
        ...getRange(3)
      },
      {
        id: '4' as const,
        label: '4 Weeks (Month)',
        sublabel: '4 Weeks',
        ...getRange(4)
      }
    ];
  }, [baseWeekStart, weekStartsOn]);

  React.useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
      setSelectedPreset('1');
      const startStr = format(baseWeekStart, 'yyyy-MM-dd');
      const endStr = format(endOfWeek(baseWeekStart, { weekStartsOn }), 'yyyy-MM-dd');
      setCustomStartDate(startStr);
      setCustomEndDate(endStr);
    }
  }, [isOpen, baseWeekStart, weekStartsOn]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    let start: Date;
    let end: Date;

    if (selectedPreset === 'custom') {
      if (!customStartDate || !customEndDate) {
        alert('Please specify both a start date and an end date.');
        return;
      }
      start = new Date(`${customStartDate}T00:00:00`);
      end = new Date(`${customEndDate}T23:59:59`);
      if (start > end) {
        alert('Start date must be before or equal to end date.');
        return;
      }
    } else {
      const preset = presets.find(p => p.id === selectedPreset);
      if (!preset) return;
      start = preset.start;
      end = preset.end;
    }

    try {
      setIsGenerating(true);
      await onPrint(start, end);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
    >
      <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 sm:p-6 max-w-lg w-full text-zinc-100 shadow-2xl flex flex-col space-y-5 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Print Roster</h2>
              <p className="text-xs text-zinc-400">Select the roster timeframe to export as PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Information */}
        <div className="px-3 py-2 bg-zinc-900/60 border border-white/[0.06] rounded-xl flex items-center justify-between text-xs">
          <span className="text-zinc-400">Active Filter:</span>
          <span className="text-zinc-200 font-medium truncate max-w-[260px]">
            {activeFilterDescription || 'All Staff & Clients'}
          </span>
        </div>

        {/* Presets List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Roster Duration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-brand-blue/15 border-brand-blue text-white shadow-sm ring-1 ring-brand-blue/50'
                      : 'bg-zinc-900/40 border-white/[0.06] text-zinc-300 hover:bg-zinc-800/40 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold">{preset.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-blue shrink-0" />}
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1 font-mono">
                    {format(preset.start, 'dd MMM')} – {format(preset.end, 'dd MMM yyyy')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Option */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                selectedPreset === 'custom'
                  ? 'bg-brand-blue/15 border-brand-blue text-white shadow-sm ring-1 ring-brand-blue/50'
                  : 'bg-zinc-900/40 border-white/[0.06] text-zinc-300 hover:bg-zinc-800/40 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold">Custom Date Range</span>
              </div>
              {selectedPreset === 'custom' && <Check className="w-4 h-4 text-brand-blue shrink-0" />}
            </button>

            {selectedPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-zinc-900/60 border border-white/[0.06] rounded-xl animate-in fade-in-50">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-green text-white text-xs font-semibold rounded-lg hover:opacity-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
