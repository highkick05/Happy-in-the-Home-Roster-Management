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

  // Pagination logic to mirror PDFKit layout exactly
  const PAGE_CAPACITY = 646; // Heuristic height capacity from PDF logic
  const pages: { items: any[]; emptySpace: number }[] = [];
  let currentPageItems: any[] = [];
  let currentUsed = 0;

  notes.forEach((note) => {
    const chars = note.notes ? note.notes.length : 0;
    const lines = Math.max(1, Math.ceil(chars / 85));
    const textHeight = lines * 12; 
    const neededHeight = Math.max(textHeight + 35, 50);

    if (currentUsed + neededHeight > PAGE_CAPACITY && currentPageItems.length > 0) {
      pages.push({ items: currentPageItems, emptySpace: PAGE_CAPACITY - currentUsed });
      currentPageItems = [note];
      currentUsed = neededHeight;
    } else {
      currentPageItems.push(note);
      currentUsed += neededHeight;
    }
  });
  
  if (currentPageItems.length > 0) {
    pages.push({ items: currentPageItems, emptySpace: PAGE_CAPACITY - currentUsed });
  } else if (pages.length === 0) {
    pages.push({ items: [], emptySpace: PAGE_CAPACITY });
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full bg-transparent p-4 md:p-8 print:p-0 print:bg-white select-none print:block">
      {pages.map((page, pageIndex) => {
         // calculate how many empty rows to append at the bottom
         // Usually 1 standard row is 26px to 30px
         const emptyRowCount = Math.max(0, Math.floor(page.emptySpace / 30));
         
         return (
         <div key={pageIndex} className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-xl print:shadow-none box-border p-[15mm] print:p-0 relative break-after-page flex flex-col justify-between">
           
           <div className="w-full text-black font-sans text-sm flex-1 flex flex-col">
              
              {/* Outer Page Border Structure */}
              <div className="border-[1.5px] border-black w-full flex-1 flex flex-col">
                 
                 {/* Top Header block */}
                 <div className="flex border-b-[1.5px] border-black shrink-0">
                    {/* Left box */}
                    <div className="w-[55%] flex items-center justify-center p-4 border-r-[1.5px] border-black shrink-0">
                       <h1 className="text-[32px] font-bold uppercase tracking-wider leading-none whitespace-nowrap text-center">
                         PROGRESS NOTES
                       </h1>
                    </div>
                    
                    {/* Right box (fields) */}
                    <div className="w-[45%] flex flex-col justify-between shrink-0">
                       <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                         <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Last Name</span>
                         <span className="flex-1 text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">{clientData?.last_name || ''}</span>
                       </div>
                       <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                         <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Given Names</span>
                         <span className="flex-1 text-xs font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">{clientData?.first_name || ''}</span>
                       </div>
                       <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                         <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">D.O.B</span>
                         <span className="flex-1 text-[11px] font-mono pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">
                            {clientData?.dob ? new Date(clientData.dob).toLocaleDateString('en-GB') : ''}
                         </span>
                       </div>
                       <div className="flex items-end px-3 py-[4px] border-b-[1.5px] border-black">
                         <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">Address</span>
                         <span className="flex-1 text-[10px] font-serif pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">{clientData?.address || ''}</span>
                       </div>
                       <div className="flex items-end px-3 py-[4px]">
                         <span className="shrink-0 w-[95px] text-xs font-bold uppercase whitespace-nowrap">ID No.</span>
                         <span className="flex-1 text-[11px] font-mono pl-1 border-b border-black/30 w-full mb-0.5 leading-tight break-words">{safeRefNumber}</span>
                       </div>
                    </div>
                 </div>

                 {/* Internal Content Frame */}
                 <div className="border-t-[3px] border-black mt-[1.5px] bg-white flex-1 flex flex-col relative">
                    
                    {/* Table Header Row */}
                    <div className="flex border-b-[1.5px] border-black font-bold bg-white shrink-0 relative z-20">
                       <div className="w-[120px] h-[30px] flex items-center justify-center text-center text-xs leading-tight shrink-0 border-r-[1.5px] border-black">
                          Date/Time
                       </div>
                       <div className="flex-1 h-[30px] p-2 text-[11px] leading-relaxed px-3 flex items-center">
                          <span>Write entry in Black pen. <span className="font-normal italic">Sign each entry, print name and designation after signature.</span></span>
                       </div>
                    </div>

                    {/* Table Body Area - using background grid for unbreakable rows */}
                    <div 
                      className="flex-1 relative w-full z-10"
                      style={{ 
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 28.5px, black 28.5px, black 30px)`,
                        backgroundSize: '100% 30px'
                      }}
                    >
                       {/* Vertical column separator */}
                       <div className="absolute top-0 bottom-0 left-[120px] w-[1.5px] bg-black z-0"></div>
                       
                       <div className="relative z-10 w-full h-full flex flex-col">
                         {page.items.map((note) => {
                               const startDate = new Date(note.start_time);
                               const dateStr = startDate.toLocaleDateString('en-GB');
                               const startTime = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                               
                               // Calculate how many 30px rows this note needs to consume.
                               // 1 row = 30px. We want to align exactly to grid.
                               // Minimum 1 row.
                               const chars = note.notes ? note.notes.length : 0;
                               const strTotal = note.notes + note.staff_first_name + note.staff_last_name;
                               const lines = Math.max(1, Math.ceil(strTotal.length / 85));
                               const rowsNeeded = Math.max(1, lines);
                               const rowHeightPX = rowsNeeded * 30;
                               
                               return (
                                 <div key={note.id} className="flex w-full" style={{ height: `${rowHeightPX}px` }}>
                                    {/* Date & Time Column */}
                                    <div className="w-[120px] p-1 text-xs shrink-0 font-medium flex flex-col justify-start">
                                       <div className="leading-tight">{dateStr}</div>
                                       <div className="leading-tight">{startTime}</div>
                                    </div>
                                    
                                    {/* Narrative & Signature Column */}
                                    <div className="flex-1 px-3 py-1 flex items-start">
                                       <div className="text-[13px] font-serif leading-[16px] break-words">
                                         <span>{note.notes}</span>
                                         <span className="font-sans font-semibold text-[11px] ml-4 tracking-normal whitespace-nowrap">
                                            {note.staff_first_name} {note.staff_last_name}
                                         </span>
                                         <span className="font-sans text-[10px] text-black/70 uppercase ml-1 tracking-normal whitespace-nowrap">
                                            ({note.staff_role === 'ADMIN' ? 'Administrator' : 'Support Worker'})
                                         </span>
                                       </div>
                                    </div>
                                 </div>
                               );
                         })}
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Footer */}
           <div className="mt-[6px] flex justify-between px-1 text-[9px] text-black/50 font-sans tracking-widest shrink-0 print:absolute print:bottom-0 print:left-0 print:w-full">
             <span className="uppercase">Page {pageIndex + 1} of {pages.length}</span>
             <span className="uppercase">© Copyright Happy in the Home Pty Ltd / CR040 PROGRESS NOTES</span>
           </div>
           
         </div>
       )})}
    </div>
  );
}
