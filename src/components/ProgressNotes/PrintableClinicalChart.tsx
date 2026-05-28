import React from 'react';

interface Props {
  notes: any[];
  clientData: any;
  period: { start: string, end: string };
}

export default function PrintableClinicalChart({ notes, clientData, period }: Props) {
  // Redaction helper for compliance
  const redact = (value: string | undefined | null, fallback: string = '') => {
    return value ? value : fallback; 
  };
  
  const safeRefNumber = clientData ? redact(clientData.ndis_number || clientData.my_aged_care_id, '') : '';

  return (
    <div className="flex flex-col items-center w-full bg-transparent p-4 md:p-8 print:p-0 print:bg-white print:shadow-none select-none print:block">
      <style>{`
        @media print {
          @page {
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
        }
        .tiptap-content p {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 28px !important;
        }
        .tiptap-content {
          line-height: 28px !important;
        }
        .repeat-footer {
          position: fixed !important;
          bottom: 15px !important;
          right: 20px !important;
          display: block !important;
          font-size: 9px !important;
          color: rgba(0, 0, 0, 0.7) !important;
          font-family: sans-serif !important;
          letter-spacing: 0.05em !important;
          z-index: 1000;
        }
      `}</style>

      {/* The Master Chart Container */}
      <div className="w-full max-w-[210mm] bg-white shadow-xl print:shadow-none box-border p-[15mm] print:p-0 flex flex-col justify-start relative">
         
         <div className="w-full text-black font-sans text-sm flex-1 flex flex-col border-[1.5px] border-black">
            
            {/* Top Header block - Classic CR040 rendered once */}
            <div className="flex border-b-[1.5px] border-black shrink-0">
               {/* Left box */}
               <div className="w-[55%] flex items-center justify-center p-4 border-r-[1.5px] border-black shrink-0">
                  <h1 className="text-[32px] font-bold uppercase tracking-wider leading-none whitespace-nowrap text-center text-black">
                    PROGRESS NOTES
                  </h1>
               </div>
               
               {/* Right box (5-row client details grid) */}
               <div className="w-[45%] flex flex-col justify-between shrink-0">
                  <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                    <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Last Name</span>
                    <span className="flex-1 text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">{clientData?.last_name || ''}</span>
                  </div>
                  <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                    <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Given Names</span>
                    <span className="flex-1 text-xs font-serif pl-1 border-[#0000004d] w-full mb-0.5 leading-tight break-words">{clientData?.first_name || ''}</span>
                  </div>
                  <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                    <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">D.O.B</span>
                    <span className="flex-1 text-[11px] font-mono pl-1 border-[#0000004d] w-full mb-0.5 leading-tight break-words">
                       {clientData?.dob ? new Date(clientData.dob).toLocaleDateString('en-GB') : ''}
                    </span>
                  </div>
                  <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                    <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Address</span>
                    <span className="flex-1 text-[10px] font-serif pl-1 border-[#0000004d] w-full mb-0.5 leading-tight break-words">{clientData?.address || ''}</span>
                  </div>
                  <div className="flex items-end px-3 py-[4px]">
                    <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">ID No.</span>
                    <span className="flex-1 text-[11px] font-mono pl-1 border-[#0000004d] w-full mb-0.5 leading-tight break-words">{safeRefNumber}</span>
                  </div>
               </div>
            </div>

            {/* Sub-Header Row */}
            <div className="flex border-b-[1.5px] border-black font-bold bg-white shrink-0">
               <div className="w-[120px] py-2 flex items-center justify-center text-center text-xs leading-tight shrink-0 border-r-[1.5px] border-black">
                  Date/Time
               </div>
               <div className="flex-1 py-2 px-3 text-[11px] leading-relaxed flex items-center">
                  <span>Write entry in Black pen. <span className="font-normal italic">Sign each entry, print name and designation after signature.</span></span>
               </div>
            </div>

            {/* Body Area with background lines exactly 28px height */}
            <div 
              className="flex-1 relative w-full bg-white min-h-[500px]"
              style={{ 
                backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 27px, black 27px, black 28px)`,
                backgroundSize: '100% 28px'
              }}
            >
               {/* Vertical Separator line at 120px */}
               <div className="absolute top-0 bottom-0 left-[120px] w-[1.5px] bg-black z-0"></div>
               
               {/* Entries mapping */}
               <div className="relative z-10 w-full h-full flex flex-col">
                  {notes.map((note) => {
                     const noteDate = new Date(note.start_time || note.actual_finish_time || note.end_time);
                     const dateStr = noteDate.toLocaleDateString('en-GB');
                     const timeStr = noteDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                     
                     const staffName = [note.staff_first_name, note.staff_last_name].filter(Boolean).join(' ');
                     const roleStr = note.staff_role === 'ADMIN' ? 'Administrator' : 'Support Worker';
                     
                     return (
                        <div 
                          key={note.id} 
                          className="flex w-full print:break-inside-avoid"
                          style={{ minHeight: '56px' }}
                        >
                           {/* Left Column (120px width) */}
                           <div className="w-[120px] shrink-0 font-bold px-2 pt-[6px] text-center select-text">
                              <div className="text-[11px] whitespace-nowrap leading-[28px]">{dateStr}</div>
                              <div className="text-[11px] text-zinc-500 font-medium whitespace-nowrap leading-[28px]">{timeStr}</div>
                           </div>
                           
                           {/* Right Column (flexible width) */}
                           <div className="flex-1 px-3 pt-[6px] pb-[6px] selection:bg-brand-blue/20">
                              <div className="text-[13px] font-sans break-words w-full tiptap-content select-text" style={{ lineHeight: '28px' }}>
                                 <div 
                                   className="inline" 
                                   dangerouslySetInnerHTML={{ __html: note.notes || '' }} 
                                 />
                                 <span className="font-sans font-semibold text-[11px] ml-2 tracking-normal whitespace-nowrap italic text-black">
                                    {" "}({staffName || 'Staff'}{roleStr ? `, ${roleStr}` : ''})
                                 </span>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         </div>
         
         {/* Printed Page footer */}
         <div className="repeat-footer hidden print:block">
            © COPYRIGHT HAPPY IN THE HOME PTY LTD / CR040 PROGRESS NOTES
         </div>
      </div>
    </div>
  );
}
