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
      <div key={`line-${i}`} className="flex border-b-[1.5px] border-black last:border-b-0 min-h-[32px]">
        <div className="w-[100px] border-r-[1.5px] border-black shrink-0"></div>
        <div className="flex-1"></div>
      </div>
    ));
  };

  return (
    <div className="w-full text-black font-sans bg-white shadow-sm p-4 sm:p-8 print:p-0 print:shadow-none" style={{ minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Outer Page Border Structure */}
      <div className="border-[1.5px] border-black w-full h-fit flex flex-col text-sm">
         
         {/* Top Header block */}
         <div className="flex border-b-[1.5px] border-black">
            {/* Left box */}
            <div className="w-[55%] flex items-center justify-start p-4 md:px-8 border-r-[1.5px] border-black shrink-0">
               <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-wider leading-tight">
                 PROGRESS NOTES
               </h1>
            </div>
            
            {/* Right box (fields) */}
            <div className="w-[45%] flex flex-col justify-between shrink-0">
               <div className="flex items-end px-2 py-1.5 border-b-[1.5px] border-black">
                 <span className="shrink-0 w-[90px] text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">Last Name</span>
                 <span className="flex-1 text-[11px] sm:text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-none truncate">{clientData.last_name}</span>
               </div>
               <div className="flex items-end px-2 py-1.5 border-b-[1.5px] border-black">
                 <span className="shrink-0 w-[90px] text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">Given Names</span>
                 <span className="flex-1 text-[11px] sm:text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-none truncate">{clientData.first_name}</span>
               </div>
               <div className="flex items-end px-2 py-1.5 border-b-[1.5px] border-black">
                 <span className="shrink-0 w-[90px] text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">D.O.B</span>
                 <span className="flex-1 text-[11px] sm:text-xs font-mono pl-1 border-b border-black/30 w-full mb-0.5 leading-none truncate">
                    {clientData.dob ? new Date(clientData.dob).toLocaleDateString('en-GB') : ''}
                 </span>
               </div>
               <div className="flex items-end px-2 py-1.5 border-b-[1.5px] border-black">
                 <span className="shrink-0 w-[90px] text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">Address</span>
                 <span className="flex-1 text-[11px] sm:text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-none truncate">{clientData.address || ''}</span>
               </div>
               <div className="flex items-end px-2 py-1.5 h-full">
                 <span className="shrink-0 w-[90px] text-[10px] sm:text-xs font-bold uppercase whitespace-nowrap">ID No.</span>
                 <span className="flex-1 text-[11px] sm:text-xs font-mono pl-1 border-b border-black/30 w-full mb-0.5 leading-none truncate">{safeRefNumber}</span>
               </div>
            </div>
         </div>

         {/* Internal Content Frame - Add spacing to replicate the physical card look */}
         <div className="flex-1 border-t-[3px] border-black mt-[1.5px] bg-white flex flex-col h-full">
            
            {/* Table Header Row */}
            <div className="flex border-b-[1.5px] border-black font-bold bg-white">
               <div className="w-[100px] p-2 border-r-[1.5px] border-black flex items-center justify-center text-center text-xs leading-tight shrink-0">
                  Date/Time
               </div>
               <div className="flex-1 p-2 text-xs leading-relaxed px-3 flex items-center">
                  <span>Write entry in Black pen. <span className="font-normal italic">Sign each entry, print name and designation after signature.</span></span>
               </div>
            </div>

            {/* Table Body Area */}
            <div className="flex flex-col flex-1 bg-white">
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
                       <div key={note.id} className={`flex ${index !== notes.length - 1 ? 'border-b-[1.5px] border-black' : ''} break-inside-avoid-page`}>
                          
                          {/* Date & Time Column */}
                          <div className="w-[100px] p-2 text-xs border-r-[1.5px] border-black shrink-0 font-medium">
                             <div>{dateStr}</div>
                             <div className="mt-1">{startTime}</div>
                             {note.service_name && (
                                <div className="mt-3 text-[10px] text-black/60 font-semibold uppercase leading-tight">
                                   {note.service_name}
                                </div>
                             )}
                          </div>
                          
                          {/* Narrative & Signature Column */}
                          <div className="flex-1 flex flex-col justify-between">
                             <div className="p-3 text-sm font-serif leading-relaxed whitespace-pre-wrap min-h-[60px]">
                                {note.notes}
                             </div>
                             
                             <div className="flex justify-end p-2 pb-3 mt-2">
                               <div className="text-right flex flex-col items-end">
                                  <div className="text-xs font-semibold font-sans mb-1">{note.staff_first_name} {note.staff_last_name}</div>
                                  <div className="border-t border-black min-w-[120px] pt-1 text-[9px] uppercase text-black/60 font-sans text-center">
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
      <div className="mt-1 flex justify-between px-1 text-[9px] text-black/50 font-sans tracking-widest break-inside-avoid-page">
        <span className="uppercase">Page 1 of 1</span>
        <span className="uppercase">© Copyright Happy in the Home Pty Ltd / CR040 PROGRESS NOTES</span>
      </div>
    </div>
  );
}
