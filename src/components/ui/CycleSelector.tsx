import React, { useState, useEffect } from 'react';
import { generateCycles } from '../../utils/cycles';
import { Settings } from 'lucide-react';

interface CycleSelectorProps {
  type: 'payrun' | 'invoicing';
  onSelect: (start: string, end: string) => void;
  currentStart: string | null;
  currentEnd: string | null;
}

export default function CycleSelector({ type, onSelect, currentStart, currentEnd }: CycleSelectorProps) {
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(settings => {
         const freq = type === 'payrun' ? settings.payrunFrequency : settings.invoicingFrequency;
         const start = type === 'payrun' ? settings.payrunStartDay : settings.invoicingStartDay;
         const c = generateCycles(freq || 'Fortnightly', start || 'Monday', new Date().toISOString(), 6);
         setCycles(c);
      })
      .catch(err => console.error('Failed to load cycles', err));
  }, [type]);

  if (cycles.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select 
          className="appearance-none bg-brand-navy border border-border-subtle text-[#E6EDF3] text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:border-brand-teal transition-colors"
          value={`${currentStart}_${currentEnd}`}
          onChange={(e) => {
            if (e.target.value) {
              const [s, eDate] = e.target.value.split('_');
              onSelect(s, eDate);
            }
          }}
        >
          <option value="_">Select {type === 'payrun' ? 'Payrun' : 'Invoicing'} Fortnight...</option>
          {cycles.map(c => (
            <option key={c.label} value={`${c.start}_${c.end}`}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Settings className="w-3.5 h-3.5 text-[#8B949E]" />
        </div>
      </div>
    </div>
  );
}
