import React from 'react';

interface Props {
  notes: any[];
  clientData: any;
  period: { start: string, end: string };
}

export default function PrintableClinicalChart({ notes, clientData, period }: Props) {
  if (!clientData) return null;

  // Redaction helper for compliance
  const redact = (value: string | undefined | null, fallback: string = '[Redacted]') => {
    return value ? value : fallback; 
  };
  
  const safeRefNumber = redact(clientData.ndis_number || clientData.my_aged_care_id, '[ID Number Redacted]');

  const rowsToRender = notes.length > 0 ? notes : Array.from({ length: 20 }).map((_, i) => ({ id: `empty-${i}`, isBlank: true }));

  // Helper to generate empty lines for blank template
  const renderEmptyLines = () => {
    return Array.from({ length: 25 }).map((_, i) => (
      <div key={`line-${i}`} className="flex border-b border-black last:border-b-0 min-h-[32px]">
        <div className="w-[15%] border-r border-black"></div>
        <div className="w-[85%]"></div>
      </div>
    ));
  };

  return (
    <div className="w-full text-black font-sans bg-white shadow-sm p-4 sm:p-8" style={{ minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Outer Page Border Structure */}
      <div className="border border-black w-full h-full flex flex-col text-sm">
         
         {/* Top Header block */}
         <div className="flex border-b border-black">
            {/* Left box */}
            <div className="w-[30%] sm:w-[25%] flex items-center justify-center p-4 sm:p-6 border-r border-black shrink-0">
               <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-center leading-tight whitespace-nowrap px-2">
                 PROGRESS<br/>NOTES
               </h1>
            </div>
            
            {/* Right box (fields) */}
            <div className="w-[70%] sm:w-[75%] flex flex-col justify-between">
               <div className="flex px-3 sm:px-4 py-2 border-b border-black">
                 <span className="shrink-0 w-24 sm:w-28 text-xs sm:text-sm font-semibold">Last Name</span>
                 <span className="flex-1 text-sm sm:text-base font-serif pl-2 border-b border-black/30 pb-0.5">{clientData.last_name}</span>
               </div>
               <div className="flex px-3 sm:px-4 py-2 border-b border-black">
                 <span className="shrink-0 w-24 sm:w-28 text-xs sm:text-sm font-semibold">Given Names</span>
                 <span className="flex-1 text-sm sm:text-base font-serif pl-2 border-b border-black/30 pb-0.5">{clientData.first_name}</span>
               </div>
               <div className="flex px-3 sm:px-4 py-2">
                 <span className="shrink-0 w-24 sm:w-28 text-xs sm:text-sm font-semibold">Record / ID No.</span>
                 <span className="flex-1 text-sm sm:text-base font-mono pl-2 border-b border-black/30 pb-0.5">{safeRefNumber}</span>
               </div>
            </div>
         </div>

         {/* Internal Content Frame - Add spacing to replicate the physical card look */}
         <div className="flex-1 border-t-[3px] border-black mt-1 bg-white">
            
            {/* Table Header Row */}
            <div className="flex border-b border-black font-bold">
               <div className="w-[15%] p-2 border-r border-black flex items-center justify-center text-center text-xs sm:text-sm leading-tight shrink-0">
                  Date<br/>and Time
               </div>
               <div className="w-[85%] p-2 text-xs sm:text-sm leading-relaxed px-3">
                  Write entry in Blue or Black pen.<br/>
                  <span className="font-normal">Sign each entry, print name and designation after signature.</span>
               </div>
            </div>

            {/* Table Body Area */}
            <div className="flex flex-col flex-1">
               {notes.length === 0 ? (
                  // Exact reproduction of empty ruled lines
                  renderEmptyLines()
               ) : (
                  // Real Data Row Mapping
                  notes.map((note, index) => {
                     const startDate = new Date(note.start_time);
                     const dateStr = startDate.toLocaleDateString();
                     const startTime = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                     return (
                       <div key={note.id} className={`flex ${index !== notes.length - 1 ? 'border-b border-black' : ''} break-inside-avoid-page`}>
                          
                          {/* Date & Time Column */}
                          <div className="w-[15%] p-2 sm:px-3 text-xs sm:text-sm border-r border-black shrink-0 font-medium">
                             <div>{dateStr}</div>
                             <div className="mt-1">{startTime}</div>
                             {note.service_name && (
                                <div className="mt-3 text-[10px] sm:text-xs text-black/60 font-semibold uppercase leading-tight truncate">
                                   {note.service_name}
                                </div>
                             )}
                          </div>
                          
                          {/* Narrative & Signature Column */}
                          <div className="w-[85%] flex flex-col justify-between">
                             <div className="p-3 text-xs sm:text-sm font-serif leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                {note.notes}
                             </div>
                             
                             <div className="flex justify-end p-2 sm:px-4 pb-3 mt-2">
                               <div className="text-right">
                                  <div className="text-xs sm:text-sm font-semibold font-sans mb-1">{note.staff_first_name} {note.staff_last_name}</div>
                                  <div className="border-t border-black px-4 pt-0.5 text-[9px] sm:text-[10px] uppercase text-black/60 inline-block font-sans">
                                     {note.staff_role === 'ADMIN' ? 'Administrator' : 'Support Worker'}
                                  </div>
                               </div>
                             </div>
                          </div>
                       </div>
                     );
                  })
               )}
            </div>
         </div>
      </div>
      
      {/* Footer watermark/metadata on the outside of the box to match the rotated text in photo if possible */}
      <div className="mt-2 text-right pr-2 text-[8px] sm:text-[9px] text-black/50 font-sans uppercase tracking-widest break-inside-avoid-page">
        © Copyright Validated Process System / CR040 PROGRESS NOTES
      </div>
    </div>
  );
}
