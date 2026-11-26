import React, { useState, useEffect } from 'react';
import Datepicker from 'tailwind-datepicker-react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface CustomDatePickerProps {
  selected?: Date | null;
  value?: string;
  onChange?: (e: any) => void;
  onDateChange?: (date: Date | null, e?: React.SyntheticEvent<any> | undefined) => void;
  maxDate?: Date | null;
  minDate?: Date | null;
  placeholderText?: string;
  className?: string;
  containerClassName?: string;
  name?: string;
  id?: string;
  required?: boolean;
  position?: 'top' | 'bottom';
  align?: 'left' | 'right';
  hideClearButton?: boolean;
}

export function CustomDatePicker({ 
  selected, 
  value,
  onChange, 
  onDateChange,
  maxDate, 
  minDate,
  placeholderText, 
  className = "w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none",
  containerClassName,
  name,
  id,
  required,
  position = 'top',
  align = 'left',
  hideClearButton = false,
  ...props 
}: CustomDatePickerProps) {
  
  const parseDateProp = (sel?: Date | null, val?: string): Date | null => {
    if (sel !== undefined && sel !== null) return sel;
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(parsed.getTime())) return parsed;
      } else {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  };

  const [show, setShow] = useState<boolean>(false);
  const [dateValue, setDateValue] = useState<Date | null>(() => parseDateProp(selected, value));
  const [pickerSyncKey, setPickerSyncKey] = useState<string>(() => value || (selected ? selected.toISOString() : 'init'));
  const isDayCellClickRef = React.useRef<boolean>(false);
  const uniqueId = React.useId();

  const datepickerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenDatepicker = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.id !== uniqueId) {
        setShow(false);
      }
    };
    window.addEventListener('datepicker_open', handleOpenDatepicker);
    return () => window.removeEventListener('datepicker_open', handleOpenDatepicker);
  }, [uniqueId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datepickerRef.current && !datepickerRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show]);

  useEffect(() => {
    const parsedDate = parseDateProp(selected, value);
    setDateValue(parsedDate);
    if (!show) {
      setPickerSyncKey(value || (parsedDate ? parsedDate.toISOString() : 'empty'));
    }
  }, [selected, value, show]);

  useEffect(() => {
    if (!show) return;

    const highlightToday = () => {
      const popup = datepickerRef.current?.querySelector('.custom-datepicker-popup');
      if (!popup) return;
      
      const headerBtn = popup.querySelector('.flex.justify-between.mb-2 button:nth-child(2)');
      if (!headerBtn) return;

      const today = new Date();
      const currentMonth = new Intl.DateTimeFormat('en', { month: 'long' }).format(today);
      const currentYear = today.getFullYear().toString();
      
      const days = popup.querySelectorAll('.grid.w-64.grid-cols-7 span');
      const todayDateString = today.getDate().toString();

      if (headerBtn.textContent?.includes(currentMonth) && headerBtn.textContent?.includes(currentYear)) {
        days.forEach(day => {
          const isOutOfMonth = day.classList.contains('text-zinc-600') || day.classList.contains('text-gray-500');
          if (day.textContent?.trim() === todayDateString && !isOutOfMonth) {
             if (!day.classList.contains('bg-brand-teal')) { 
                day.classList.add('bg-white/[0.15]', 'text-brand-teal', 'ring-1', 'ring-brand-teal/[0.5]');
             } else {
                day.classList.remove('bg-white/[0.15]', 'text-brand-teal', 'ring-1', 'ring-brand-teal/[0.5]');
             }
          } else {
             day.classList.remove('bg-white/[0.15]', 'text-brand-teal', 'ring-1', 'ring-brand-teal/[0.5]');
          }
        });
      } else {
         days.forEach(day => day.classList.remove('bg-white/[0.15]', 'text-brand-teal', 'ring-1', 'ring-brand-teal/[0.5]'));
      }
    };

    let observer: MutationObserver | null = null;
    let timer: NodeJS.Timeout;

    const initObserver = () => {
       const popup = datepickerRef.current?.querySelector('.custom-datepicker-popup');
       if (popup) {
          highlightToday();
          observer = new MutationObserver(() => {
             highlightToday();
          });
          observer.observe(popup, { childList: true, subtree: true, characterData: true });
       } else {
          timer = setTimeout(initObserver, 50);
       }
    };

    initObserver();

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [show]);

  const commitSelectedDate = (selectedDate: Date) => {
    setDateValue(selectedDate);
    
    if (onDateChange) {
      onDateChange(selectedDate);
    }
    
    if (onChange) {
      const offset = selectedDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(selectedDate.getTime() - offset)).toISOString().slice(0,-1);
      const dateString = localISOTime.split('T')[0];
      
      const pseudoEvent = {
        target: {
          value: dateString,
          name: name || ''
        }
      };
      
      onChange(pseudoEvent);
    }
  };

  const handleChange = (selectedDate: Date) => {
    // Only commit the date change if the user actually clicked a day cell in the calendar grid,
    // NOT when clicking the < or > month/year navigation arrows in tailwind-datepicker-react
    if (!isDayCellClickRef.current) {
      return;
    }
    isDayCellClickRef.current = false;
    commitSelectedDate(selectedDate);
  };
  
  const handleClose = (state: boolean) => {
    setShow(state);
  };

  const [inputText, setInputText] = useState<string>(() => {
    const initial = parseDateProp(selected, value);
    return initial ? initial.toLocaleDateString("en-GB") : "";
  });

  useEffect(() => {
    if (dateValue) {
      setInputText(dateValue.toLocaleDateString("en-GB"));
    } else {
      setInputText("");
    }
  }, [dateValue]);

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);

    const trimmed = raw.trim();
    if (!trimmed) {
      setDateValue(null);
      if (onDateChange) onDateChange(null);
      if (onChange) onChange({ target: { value: '', name: name || '' } });
      return;
    }

    // Match dd/mm/yyyy or dd-mm-yyyy
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const parsed = new Date(year, month - 1, day);
        if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
          commitSelectedDate(parsed);
        }
      }
      return;
    }

    // Match yyyy-mm-dd
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const parsed = new Date(year, month - 1, day);
        if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
          commitSelectedDate(parsed);
        }
      }
    }
  };

  const options: any = {
    title: "",
    autoHide: true,
    todayBtn: false,
    clearBtn: false,
    maxDate: maxDate || new Date("2050-12-31"),
    minDate: minDate || new Date("1900-01-01"),
    theme: {
      background: "bg-[#1A1A1A] border-white/[0.1] w-full",
      todayBtn: "",
      clearBtn: "",
      icons: "bg-transparent hover:bg-white/[0.05] text-white",
      text: "text-white hover:bg-white/[0.1] rounded-md",
      disabledText: "text-zinc-600",
      input: "",
      inputIcon: "",
      selected: "bg-brand-teal text-white hover:bg-brand-teal/[0.9]",
    },
    icons: {
      prev: () => <ChevronLeft className="w-5 h-5 text-white" />,
      next: () => <ChevronRight className="w-5 h-5 text-white" />,
    },
    datepickerClassNames: `z-[9999] shadow-2xl custom-datepicker-popup min-w-[280px] ${
      align === 'right' ? 'right-0' : 'left-0'
    } ${
      position === 'bottom' ? 'top-full bottom-auto mt-2' : 'bottom-full top-auto mb-2'
    }`,
    defaultDate: dateValue || new Date(),
    language: "en",
    disabledDates: [],
    weekDays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    inputNameProp: name,
    inputIdProp: id,
    inputPlaceholderProp: placeholderText || "dd/mm/yyyy",
    inputDateFormatProp: {
      day: "numeric",
      month: "numeric",
      year: "numeric"
    }
  };

  // If we pass children to tailwind-datepicker-react, it renders the children instead of its own input.
  return (
    <div
      className={`relative ${containerClassName || 'w-full'}`}
      ref={datepickerRef}
      onMouseDownCapture={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target) {
          isDayCellClickRef.current = false;
          return;
        }
        const daySpan = target.closest('.custom-datepicker-popup .grid.w-64.grid-cols-7 span');
        const text = daySpan?.textContent?.trim() || '';
        isDayCellClickRef.current = Boolean(daySpan && /^\d{1,2}$/.test(text));
      }}
    >
      <Datepicker key={pickerSyncKey} options={options} onChange={handleChange} show={show} setShow={handleClose}>
        <div className="relative w-full">
          <input 
            type="text"
            className={`${className} w-full ${hideClearButton ? 'px-0.5' : 'pl-1 pr-6'} cursor-pointer py-0 h-full !border-0 bg-transparent`}
            placeholder={placeholderText || "dd/mm/yyyy"}
            value={inputText}
            onChange={handleManualInputChange}
            onBlur={() => {
              if (dateValue) {
                setInputText(dateValue.toLocaleDateString("en-GB"));
              } else {
                setInputText("");
              }
            }}
            onClick={() => {
              setShow(true);
              window.dispatchEvent(new CustomEvent('datepicker_open', { detail: { id: uniqueId } }));
            }}
            name={name}
            id={id}
            required={required}
          />
          {!hideClearButton && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-1 text-zinc-400">
               {dateValue ? (
                 <button 
                   type="button" 
                   onClick={(e) => {
                     e.stopPropagation();
                     setDateValue(null);
                     setInputText("");
                     if (onDateChange) onDateChange(null);
                     if (onChange) onChange({ target: { value: '', name: name || '' } });
                   }} 
                   className="p-1 hover:text-white transition-colors cursor-pointer z-10 rounded-full hover:bg-white/10"
                 >
                   <X className="w-3.5 h-3.5" />
                 </button>
               ) : (
                 <Calendar className="w-4 h-4 pointer-events-none" />
               )}
            </div>
          )}
        </div>
      </Datepicker>
    </div>
  );
}

export default CustomDatePicker;
