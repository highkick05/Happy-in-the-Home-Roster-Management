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
  name?: string;
  id?: string;
  required?: boolean;
  position?: 'top' | 'bottom';
  align?: 'left' | 'right';
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
  name,
  id,
  required,
  position = 'top',
  align = 'left',
  ...props 
}: CustomDatePickerProps) {
  
  const [show, setShow] = useState<boolean>(false);
  const [dateValue, setDateValue] = useState<Date | null>(null);
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
    let parsedDate: Date | null | undefined = selected;
    if (parsedDate === undefined && value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        parsedDate = new Date(value);
        if (isNaN(parsedDate.getTime())) {
           parsedDate = null;
        }
      }
    }
    setDateValue(parsedDate || null);
  }, [selected, value]);

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

  const handleChange = (selectedDate: Date) => {
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
  
  const handleClose = (state: boolean) => {
    setShow(state);
  };

  const options: any = {
    title: "",
    autoHide: true,
    todayBtn: false,
    clearBtn: false,
    maxDate: maxDate || new Date("2030-01-01"),
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
    defaultDate: dateValue,
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
    <div className="w-full relative" ref={datepickerRef}>
      <Datepicker options={options} onChange={handleChange} show={show} setShow={handleClose}>
        <div className="relative w-full">
          <input 
            type="text"
            className={className + " w-full pl-1 pr-6 cursor-pointer py-0 h-full !border-0 bg-transparent"}
            placeholder={placeholderText || "dd/mm/yyyy"}
            value={dateValue ? dateValue.toLocaleDateString("en-GB") : ""}
            onClick={() => {
              setShow(true);
              window.dispatchEvent(new CustomEvent('datepicker_open', { detail: { id: uniqueId } }));
            }}
            readOnly
            name={name}
            id={id}
            required={required}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1 text-zinc-400">
             {dateValue ? (
               <button 
                 type="button" 
                 onClick={(e) => {
                   e.stopPropagation();
                   setDateValue(null);
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
        </div>
      </Datepicker>
    </div>
  );
}

export default CustomDatePicker;
