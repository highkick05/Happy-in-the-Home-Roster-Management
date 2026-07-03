const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// 1. Update handlePointerUp to ignore clicks on buttons or .no-drag-edit
code = code.replace(
  `const handlePointerUp = (e: any) => {
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      onEdit();
    }
  };`,
  `const handlePointerUp = (e: any) => {
    if (e.target.closest('button') || e.target.closest('.no-drag-edit')) {
      return;
    }
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      onEdit();
    }
  };`
);

// 2. Add .no-drag-edit and onPointerDown={e=>e.stopPropagation()} to progress bar toggle
code = code.replace(
  `<div className="flex items-center gap-2 mt-2" onClick={(e) => { e.stopPropagation(); setShowSubtasks(true); }}>`,
  `<div className="flex items-center gap-2 mt-2 w-fit p-1 -ml-1 rounded hover:bg-white/[0.04] transition-colors cursor-pointer no-drag-edit" onClick={(e) => { e.stopPropagation(); setShowSubtasks(true); }} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>`
);

// 3. Make the main left button (checkbox) not drag
code = code.replace(
  `<button 
            onClick={(e) => { e.stopPropagation(); onComplete(); }}`,
  `<button 
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onComplete(); }}`
);

// 4. Quick Actions toggle subtasks
code = code.replace(
  `<button
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}`,
  `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}`
);
code = code.replace(
  `<button
                onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}`,
  `<button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}`
);


// 5. Replace Staff & Clients Avatars with badges
code = code.replace(
  `{/* Staff & Clients Avatars */}
          {(assignedStaff.length > 0 || assignedClients.length > 0) && (
            <div className="flex items-center gap-2 border-l border-border-subtle pl-3">
              {assignedStaff.length > 0 && (
                <div className="flex -space-x-1.5" title="Assigned Staff">
                   {assignedStaff.map((id: any) => {
                     const staff = staffList?.find((s:any) => s.id === id);
                     const initials = staff ? \`\${staff.first_name[0]}\${staff.last_name[0]}\`.toUpperCase() : '?';
                     return (
                       <div key={id} className="w-6 h-6 rounded-full bg-brand-green/10 border border-brand-green/30 text-brand-green flex items-center justify-center text-[10px] font-bold z-10 hover:z-20 relative" title={staff ? \`\${staff.first_name} \${staff.last_name}\` : ''}>
                         {initials}
                       </div>
                     )
                   })}
                </div>
              )}
              {assignedClients.length > 0 && (
                <div className="flex -space-x-1.5" title="Assigned Clients">
                   {assignedClients.map((id: any) => {
                     const client = clientList?.find((c:any) => c.id === id);
                     const initials = client ? \`\${client.first_name[0]}\${client.last_name[0]}\`.toUpperCase() : '?';
                     return (
                       <div key={id} className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-[10px] font-bold z-10 hover:z-20 relative" title={client ? \`\${client.first_name} \${client.last_name}\` : ''}>
                         {initials}
                       </div>
                     )
                   })}
                </div>
              )}
            </div>
          )}`,
  `{/* Staff & Clients Avatars */}
          {(assignedStaff.length > 0 || assignedClients.length > 0) && (
            <div className="flex items-center gap-2 border-l border-border-subtle pl-3 overflow-hidden" onPointerDown={e => e.stopPropagation()}>
              {assignedStaff.length > 0 && (
                <div className="flex flex-wrap gap-1.5" title="Assigned Staff">
                   {assignedStaff.map((id: any) => {
                     const staff = staffList?.find((s:any) => s.id === id);
                     if (!staff) return null;
                     return (
                       <div key={id} className="px-2 py-0.5 rounded-md bg-brand-green/10 border border-brand-green/30 text-brand-green flex items-center text-[11px] font-medium whitespace-nowrap">
                         {staff.first_name} {staff.last_name}
                       </div>
                     )
                   })}
                </div>
              )}
              {assignedClients.length > 0 && (
                <div className="flex flex-wrap gap-1.5" title="Assigned Clients">
                   {assignedClients.map((id: any) => {
                     const client = clientList?.find((c:any) => c.id === id);
                     if (!client) return null;
                     return (
                       <div key={id} className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center text-[11px] font-medium whitespace-nowrap">
                         {client.first_name} {client.last_name}
                       </div>
                     )
                   })}
                </div>
              )}
            </div>
          )}`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
