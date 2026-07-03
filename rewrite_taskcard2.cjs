const fs = require('fs');

let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const newCard = `import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Flame, 
  UserCircle2, Users, CalendarIcon, X, Plus, MoreHorizontal, Trash2, ListChecks
} from 'lucide-react';
import { useState } from 'react';

export function TaskCard({ 
  task, onEdit, onDelete, onComplete, 
  onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant,
  staffList, clientList, wallboardMode 
}: any) {
  const [newSubTask, setNewSubTask] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(wallboardMode || false);
  
  const assignedStaff = typeof task.assigned_staff === 'string' ? JSON.parse(task.assigned_staff || '[]') : (task.assigned_staff || []);
  const assignedClients = typeof task.assigned_clients === 'string' ? JSON.parse(task.assigned_clients || '[]') : (task.assigned_clients || []);
  
  const totalSubtasks = task.sub_tasks?.length || 0;
  const completedSubtasks = task.sub_tasks?.filter((st:any) => st.completed).length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      onAddSubTask(task.id, newSubTask.trim());
      setNewSubTask('');
    }
  };

  return (
    <motion.div 
      layout
      className={\`bg-brand-navy border \${task.is_important ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-border-subtle hover:border-[#30363d]'} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden\`}
    >
      <div 
        className={\`flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer\`}
        onClick={onEdit}
      >
        {/* Left side: Checkbox + Title + Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={\`shrink-0 \${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors \${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}\`}
          >
            {task.status === 'Completed' ? <CheckCircle2 className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} /> : <Circle className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} />}
          </button>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
               <h3 className={\`font-medium \${wallboardMode ? 'text-[22px]' : 'text-[14px]'} leading-snug truncate \${task.status === 'Completed' ? 'line-through text-[#8B949E]' : 'text-[#E6EDF3]'}\`}>
                 {task.title}
               </h3>
               {task.is_important && (
                 <span className="shrink-0 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Urgent</span>
               )}
            </div>
            {task.description && (
              <p className={\`\${wallboardMode ? 'text-[16px]' : 'text-[12px]'} text-[#8B949E] mt-0.5 truncate\`}>
                {task.description}
              </p>
            )}
            
            {/* Progress Bar (Inline if tasks exist and we are not showing them, or small indicator) */}
            {totalSubtasks > 0 && !showSubtasks && (
               <div className="flex items-center gap-2 mt-2" onClick={(e) => { e.stopPropagation(); setShowSubtasks(true); }}>
                  <div className="flex items-center gap-1 text-[11px] text-[#8B949E] font-medium">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{completedSubtasks}/{totalSubtasks}</span>
                  </div>
                  <div className="w-32 h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-teal"
                      initial={{ width: 0 }}
                      animate={{ width: \`\${progress}%\` }}
                    />
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Right side: Meta info (Dates, Assignments) */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0">
          {/* Dates */}
          {(task.start_date || task.end_date) && (
             <div className={\`flex items-center text-[#8B949E] \${wallboardMode ? 'text-[15px]' : 'text-[12px]'}\`}>
               <CalendarIcon className="mr-1.5 w-3.5 h-3.5 opacity-70" />
               <span className="truncate">
                 {task.start_date && new Date(task.start_date).toLocaleDateString()}
                 {task.start_date && task.end_date && ' - '}
                 {task.end_date && new Date(task.end_date).toLocaleDateString()}
               </span>
             </div>
          )}

          {/* Staff & Clients Avatars */}
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
          )}

          {/* Quick Actions */}
          {!wallboardMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}
                className={\`p-1.5 rounded-md transition-colors \${showSubtasks ? 'text-brand-teal bg-brand-teal/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}\`}
                title="Toggle Subtasks"
              >
                <ListChecks className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
                className={\`p-1.5 rounded-md transition-colors \${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}\`}
                title="Toggle Importance"
              >
                <Flame className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showSubtasks && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle/50 bg-black/10"
          >
            <div className={\`\${wallboardMode ? 'px-6 py-4' : 'px-4 py-3'} flex flex-col gap-2\`}>
               {totalSubtasks > 0 && (
                 <>
                   <div className="flex items-center justify-between text-[11px] font-medium text-[#8B949E] uppercase tracking-wider mb-1">
                      <span>Checklist</span>
                      <span>{Math.round(progress)}%</span>
                   </div>
                   <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden mb-2">
                     <motion.div 
                       className="h-full bg-brand-teal"
                       initial={{ width: 0 }}
                       animate={{ width: \`\${progress}%\` }}
                     />
                   </div>
                   
                   <div className="flex flex-col gap-1.5">
                     {task.sub_tasks.map((st: any) => (
                       <div key={st.id} className="flex items-start justify-between group/st">
                         <div className="flex items-start gap-2 cursor-pointer flex-1" onClick={() => onToggleSubTask(st.id, !!st.completed)}>
                           <button className={\`mt-0.5 shrink-0 transition-colors \${st.completed ? 'text-brand-green' : 'text-[#8B949E] hover:text-white'}\`}>
                             {st.completed ? <CheckCircle2 className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} /> : <Circle className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} />}
                           </button>
                           <span className={\`\${wallboardMode ? 'text-[15px]' : 'text-[13px]'} \${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}\`}>
                             {st.title}
                           </span>
                         </div>
                         {!wallboardMode && (
                           <button 
                             onClick={() => onDeleteSubTask(st.id)}
                             className="text-[#8B949E] hover:text-red-400 opacity-0 group-hover/st:opacity-100 transition-opacity p-0.5"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                     ))}
                   </div>
                 </>
               )}
               
               {!wallboardMode && (
                 <div className="flex items-center space-x-2 mt-1 pt-2 border-t border-border-subtle/30">
                    <input
                      type="text"
                      value={newSubTask}
                      onChange={e => setNewSubTask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
                      placeholder="Add checklist item..."
                      className="flex-1 bg-transparent border-none text-[13px] text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:ring-0 px-1 py-0.5"
                    />
                    <button 
                      onClick={handleAddSubTask}
                      disabled={!newSubTask.trim()}
                      className="text-[#8B949E] hover:text-white disabled:opacity-50 transition-colors p-1 shrink-0 bg-white/[0.04] rounded-md hover:bg-white/[0.08]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
`;

const taskModalMatch = content.match(/export function TaskModal[\s\S]*$/);

if (taskModalMatch) {
  content = newCard + '\n\n' + taskModalMatch[0];
} else {
  console.log("Could not find TaskModal!");
}

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
