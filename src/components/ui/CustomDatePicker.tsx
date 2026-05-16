import React from 'react';
import DatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../datepicker.css';

export interface CustomDatePickerProps extends Omit<ReactDatePickerProps, 'onChange' | 'value'> {
  selected?: Date | null;
  value?: string;
  onChange?: (e: any) => void;
  onDateChange?: (date: Date | null, e?: React.SyntheticEvent<any> | undefined) => void;
  maxDate?: Date | null;
  placeholderText?: string;
  className?: string;
  calendarClassName?: string;
  name?: string;
  id?: string;
  required?: boolean;
}

export function CustomDatePicker({ 
  selected, 
  value,
  onChange, 
  onDateChange,
  maxDate, 
  placeholderText, 
  className = "w-full bg-[#1A1A1A] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-brand-teal outline-none",
  calendarClassName = "bg-[#1A1A1A] border border-white/[0.1] text-white rounded-lg shadow-xl",
  name,
  ...props 
}: CustomDatePickerProps) {
  
  // Create a proper date from string value if selected is undefined
  let parsedDate = selected;
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

  const handleChange = (date: Date | null) => {
    if (onDateChange) {
      onDateChange(date);
    }
    
    if (onChange) {
      // Simulate input event
      let dateString = '';
      if (date) {
        // preserve local time string
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0,-1);
        dateString = localISOTime.split('T')[0];
      }
      
      const pseudoEvent = {
        target: {
          value: dateString,
          name: name || ''
        }
      };
      
      onChange(pseudoEvent);
    }
  };

  return (
    <div className="dark-datepicker-wrapper relative w-full">
      <DatePicker
        selected={parsedDate || null}
        onChange={handleChange}
        maxDate={maxDate}
        placeholderText={placeholderText || "dd/mm/yyyy"}
        className={className}
        calendarClassName={calendarClassName}
        wrapperClassName="w-full"
        name={name}
        portalId="root"
        {...props}
      />
    </div>
  );
}

export default CustomDatePicker;
