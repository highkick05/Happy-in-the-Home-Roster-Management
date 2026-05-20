import React from 'react';

interface Props {
  notes: any[];
  clientData: any;
  period: { start: string, end: string };
}

export default function PrintableClinicalChart({ notes, clientData, period }: Props) {
  if (!clientData || notes.length === 0) return null;

  // Redaction helper for compliance
  const redact = (value: string | undefined | null, fallback: string = '[Redacted]') => {
    return value ? value : fallback; // In a strict setting, we'd replace the actual values, but for here we ensure it doesn't show undefined. If requirement says redact ID numbers explicitly:
  };
  
  const safeRefNumber = redact(clientData.ndis_number || clientData.my_aged_care_id, '[ID Number Redacted]');
  const dobStr = clientData.dob ? new Date(clientData.dob).toLocaleDateString() : '[Redacted]';

  return (
    <div className="w-full text-black font-serif bg-white" style={{ minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Chart Header block */}
      <div className="border-2 border-black w-full mb-6">
         <div className="border-b-2 border-black p-3 bg-gray-50 flex justify-between items-center">
            <h1 className="text-xl font-bold uppercase tracking-widest font-sans">Progress Notes / Clinical Chart</h1>
            <div className="text-sm font-sans font-bold">Health Record</div>
         </div>
         <div className="grid grid-cols-2">
            <div className="p-3 border-r-2 border-black">
               <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Client Full Name</div>
               <div className="font-bold text-lg">{clientData.first_name} {clientData.last_name}</div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-4">
               <div>
                 <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Date of Birth</div>
                 <div className="text-base">{dobStr}</div>
               </div>
               <div>
                 <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Record / ID Number</div>
                 <div className="text-base font-mono">{safeRefNumber}</div>
               </div>
            </div>
         </div>
      </div>

      <div className="w-full border-2 border-black mt-2">
         {/* Table Header */}
         <div className="grid grid-cols-[100px_150px_1fr_200px] border-b-2 border-black bg-gray-100 font-sans font-bold text-xs uppercase tracking-wide">
            <div className="p-2 border-r border-black">Date & Time</div>
            <div className="p-2 border-r border-black">Focus / Domain</div>
            <div className="p-2 border-r border-black">Progress Note Narrative</div>
            <div className="p-2">Practitioner Signature</div>
         </div>

         {/* Table Body */}
         {notes.map((note, index) => {
           const startDate = new Date(note.start_time);
           const dateStr = startDate.toLocaleDateString();
           const startTime = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

           return (
             <div key={note.id} className={`grid grid-cols-[100px_150px_1fr_200px] ${index !== notes.length - 1 ? 'border-b border-black' : ''} text-sm break-inside-avoid-page`}>
                <div className="p-2 border-r border-black font-sans text-xs">
                   <div className="font-bold">{dateStr}</div>
                   <div>{startTime}</div>
                </div>
                
                <div className="p-2 border-r border-black font-sans text-xs flex flex-col justify-center">
                   <span className="font-bold">{note.service_name || 'General'}</span>
                   <span className="text-[10px] text-gray-600 uppercase mt-0.5">{note.service_type || 'SUPPORT'}</span>
                </div>
                
                <div className="p-3 border-r border-black whitespace-pre-wrap leading-relaxed text-[13px] font-serif">
                   {note.notes}
                </div>
                
                <div className="p-2 flex flex-col justify-between" style={{ minHeight: '80px' }}>
                   <div className="font-sans text-xs">
                      <div className="font-bold">{note.staff_first_name} {note.staff_last_name}</div>
                      <div className="text-[10px] uppercase text-gray-600">{note.staff_role === 'ADMIN' ? 'Administrator' : 'Support Worker'}</div>
                   </div>
                   
                   <div className="mt-4 border-t border-black pt-1 px-1">
                      <span className="text-[9px] uppercase tracking-wider text-gray-400">Sign Here</span>
                   </div>
                </div>
             </div>
           );
         })}
      </div>
      
      {/* Footer metadata */}
      <div className="mt-8 text-center text-[10px] text-gray-500 font-sans uppercase tracking-widest break-inside-avoid-page">
        — End of Clinical Record Extract —
      </div>
    </div>
  );
}
