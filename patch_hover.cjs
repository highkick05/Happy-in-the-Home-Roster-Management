const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const oldStartCell = `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''}</span>
                                 {row.odometer_start_photo && (
                                   <button onClick={() => window.open(row.odometer_start_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="View Start Odometer Photo">
                                     <Camera className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                               </div>
                             </td>`;

const newStartCell = `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_start_reading ? Math.round(Number(row.odometer_start_reading)) : ''}</span>
                                 {row.odometer_start_photo && (
                                   <div className="relative group flex items-center">
                                     <button onClick={() => window.open(row.odometer_start_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                                       <Camera className="w-3.5 h-3.5" />
                                     </button>
                                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                       <div className="bg-[#121214] border border-border-subtle rounded-md shadow-xl p-1 w-48">
                                         <img src={row.odometer_start_photo} alt="Start Odometer" className="w-full h-auto rounded object-cover" />
                                       </div>
                                       <div className="w-2 h-2 bg-[#121214] border-r border-b border-border-subtle transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             </td>`;

const oldEndCell = `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''}</span>
                                 {row.odometer_end_photo && (
                                   <button onClick={() => window.open(row.odometer_end_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors" title="View End Odometer Photo">
                                     <Camera className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                               </div>
                             </td>`;

const newEndCell = `<td className="px-4 py-2 border-r border-border-subtle/30 whitespace-nowrap font-mono text-xs">
                               <div className="flex items-center gap-1">
                                 <span>{row.odometer_end_reading ? Math.round(Number(row.odometer_end_reading)) : ''}</span>
                                 {row.odometer_end_photo && (
                                   <div className="relative group flex items-center">
                                     <button onClick={() => window.open(row.odometer_end_photo, '_blank')} className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                                       <Camera className="w-3.5 h-3.5" />
                                     </button>
                                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                                       <div className="bg-[#121214] border border-border-subtle rounded-md shadow-xl p-1 w-48">
                                         <img src={row.odometer_end_photo} alt="End Odometer" className="w-full h-auto rounded object-cover" />
                                       </div>
                                       <div className="w-2 h-2 bg-[#121214] border-r border-b border-border-subtle transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             </td>`;

content = content.replace(oldStartCell, newStartCell);
content = content.replace(oldEndCell, newEndCell);
fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
