import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // "HH:mm" format (24h)
  onChange: (e: { target: { name: string; value: string } }) => void;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function CustomTimePicker({
  value,
  onChange,
  name = '',
  id,
  required,
  className = "w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue transition-colors placeholder-zinc-600",
  placeholder = "--:-- --"
}: CustomTimePickerProps) {
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse 24h string to 12h components
  const parseTime = (val: string) => {
    if (!val) return { hour: '09', minute: '00', ampm: 'AM' };
    const [h, m] = val.split(':');
    let hourNum = parseInt(h, 10);
    const minute = m || '00';
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    if (hourNum === 0) hourNum = 12;
    const hour = hourNum.toString().padStart(2, '0');
    return { hour, minute, ampm };
  };

  const { hour, minute, ampm } = parseTime(value);
  const hourContainerRef = useRef<HTMLDivElement>(null);
  const minContainerRef = useRef<HTMLDivElement>(null);

  const setTime = (h: string, m: string, a: string) => {
    let hourNum = parseInt(h, 10);
    if (a === 'PM' && hourNum < 12) hourNum += 12;
    if (a === 'AM' && hourNum === 12) hourNum = 0;
    const newVal = `${hourNum.toString().padStart(2, '0')}:${m}`;
    
    onChange({
      target: {
        value: newVal,
        name: name
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      // Scroll into view
      setTimeout(() => {
        const selectedHour = hourContainerRef.current?.querySelector('.bg-brand-teal');
        const selectedMin = minContainerRef.current?.querySelector('.bg-brand-teal');
        selectedHour?.scrollIntoView({ block: 'center', behavior: 'instant' as any });
        selectedMin?.scrollIntoView({ block: 'center', behavior: 'instant' as any });
      }, 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value ? `${hour}:${minute} ${ampm}` : ""}
          placeholder={placeholder}
          onClick={() => setShow(!show)}
          className={`${className} cursor-pointer pr-10`}
          name={name}
          id={id}
          required={required}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {show && (
        <div className="absolute z-[100] mt-1 p-3 bg-[#1A1A1A] border border-white/[0.1] rounded-lg shadow-2xl flex gap-3 min-w-[240px] right-0">
          {/* Hours */}
          <div className="flex flex-col flex-1">
             <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2 text-center border-b border-white/5 pb-1">Hr</div>
             <div className="flex flex-col h-[200px] overflow-y-auto custom-scrollbar px-1" ref={hourContainerRef}>
                {hours.map(h => (
                <button
                    key={h}
                    type="button"
                    onClick={() => setTime(h, minute, ampm)}
                    className={`text-[13px] py-1.5 px-2 rounded hover:bg-white/10 transition-colors mb-0.5 ${hour === h ? 'bg-brand-teal text-white font-medium' : 'text-zinc-300'}`}
                >
                    {h}
                </button>
                ))}
             </div>
          </div>

          {/* Minutes */}
          <div className="flex flex-col flex-1">
            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2 text-center border-b border-white/5 pb-1">Min</div>
            <div className="flex flex-col h-[200px] overflow-y-auto custom-scrollbar px-1" ref={minContainerRef}>
                {minutes.map(m => (
                <button
                    key={m}
                    type="button"
                    onClick={() => setTime(hour, m, ampm)}
                    className={`text-[13px] py-1.5 px-2 rounded hover:bg-white/10 transition-colors mb-0.5 ${minute === m ? 'bg-brand-teal text-white font-medium' : 'text-zinc-300'}`}
                >
                    {m}
                </button>
                ))}
            </div>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col w-14">
            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-2 text-center border-b border-white/5 pb-1">Prd</div>
            <div className="flex flex-col space-y-1">
              {['AM', 'PM'].map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setTime(hour, minute, a)}
                  className={`text-[13px] py-2 rounded hover:bg-white/10 transition-colors ${ampm === a ? 'bg-brand-teal text-white font-medium' : 'text-zinc-300'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomTimePicker;
