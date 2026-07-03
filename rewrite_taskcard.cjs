const fs = require('fs');

let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const newCard = `import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Clock, Flame, 
  UserCircle2, Users, CalendarIcon, X, Plus, MoreHorizontal, Trash2
} from 'lucide-react';
import { useState } from 'react';

export function TaskCard({ 
  task, onEdit, onDelete, onComplete, 
  onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant,
  staffList, clientList, wallboardMode 
}: any) {
  const [newSubTask, setNewSubTask] = useState('');
  
  const assignedStaff = typeof task.assigned_staff === 'string' ? JSON.parse(task.assigned_staff || '[]') : (task.assigned_staff || []);
  const assignedClients = typeof task.assigned_clients === 'string' ? JSON.parse(task.assigned_clients || '[]') : (task.assigned_clients || []);
  
  const progress = task.sub_tasks?.length > 0 
    ? (task.sub_tasks.filter((st:any) => st.completed).length / task.sub_tasks.length) * 100 
    : 0;

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
        className={\`\${wallboardMode ? 'p-6 gap-4' : 'p-4 gap-3'} flex flex-col cursor-pointer\`}
        onClick={onEdit}
      >
        <div className="flex items-start justify-between gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={\`shrink-0 \${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors \${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}\`}
          >
            {task.status === 'Completed' ? <CheckCircle2 className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} /> : <Circle className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} />}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={\`font-semibold \${wallboardMode ? 'text-xl' : 'text-[15px]'} leading-snug \${task.status === 'Completed' ? 'line-through text-[#8B949E]' : 'text-[#E6EDF3]'}\`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={\`\${wallboardMode ? 'text-base' : 'text-sm'} text-[#8B949E] mt-1 line-clamp-2 leading-relaxed\`}>
                {task.description}
              </p>
            )}
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
            className={\`shrink-0 p-1.5 rounded-md transition-colors \${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:bg-[#21262d] opacity-0 group-hover:opacity-100'}\`}
          >
            <Flame className={wallboardMode ? "w-6 h-6" : "w-4 h-4"} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs mt-1 pl-8">
           {task.start_date || task.end_date ? (
             <div className={\`flex items-center text-[#8B949E] bg-black/20 px-2 py-0.5 rounded-md \${wallboardMode ? 'text-sm px-3 py-1' : ''}\`}>
               <CalendarIcon className={\`mr-1 \${wallboardMode ? 'w-4 h-4' : 'w-3.5 h-3.5'}\`} />
               {task.start_date && new Date(task.start_date).toLocaleDateString()}
               {task.start_date && task.end_date && ' - '}
               {task.end_date && new Date(task.end_date).toLocaleDateString()}
             </div>
           ) : null}
           
           {assignedStaff.map((id: any) => {
             const staff = staffList?.find((s:any) => s.id === id);
             return staff && (
               <span key={id} className={\`bg-brand-green/10 text-brand-green \${wallboardMode ? 'text-sm px-3 py-1' : 'px-2 py-0.5'} rounded-md border border-brand-green/20\`}>
                 {staff.first_name} {staff.last_name}
               </span>
             )
           })}
           
           {assignedClients.map((id: any) => {
             const client = clientList?.find((c:any) => c.id === id);
             return client && (
               <span key={id} className={\`bg-purple-500/10 text-purple-400 \${wallboardMode ? 'text-sm px-3 py-1' : 'px-2 py-0.5'} rounded-md border border-purple-500/20\`}>
                 {client.first_name} {client.last_name}
               </span>
             )
           })}
        </div>
      </div>
      
      {(task.sub_tasks && task.sub_tasks.length > 0) || !wallboardMode ? (
        <div className={\`border-t border-border-subtle bg-black/20 \${wallboardMode ? 'px-6 py-4' : 'px-4 py-3'} flex flex-col gap-2\`}>
           {task.sub_tasks && task.sub_tasks.length > 0 && (
             <>
               <div className="flex items-center justify-between text-xs font-semibold text-[#8B949E] mb-1">
                  <span className={wallboardMode ? 'text-sm' : ''}>Progress</span>
                  <span className={wallboardMode ? 'text-sm' : ''}>{Math.round(progress)}%</span>
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
                       <button className={\`mt-0.5 shrink-0 \${st.completed ? 'text-brand-green' : 'text-[#8B949E]'}\`}>
                         {st.completed ? <CheckCircle2 className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} /> : <Circle className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} />}
                       </button>
                       <span className={\`\${wallboardMode ? 'text-sm' : 'text-xs'} \${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}\`}>
                         {st.title}
                       </span>
                     </div>
                     {!wallboardMode && (
                       <button 
                         onClick={() => onDeleteSubTask(st.id)}
                         className="text-[#8B949E] hover:text-red-400 opacity-0 group-hover/st:opacity-100"
                       >
                         <X className="w-3 h-3" />
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
                  className="flex-1 bg-transparent border-none text-xs text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:ring-0 px-1 py-0.5"
                />
                <button 
                  onClick={handleAddSubTask}
                  disabled={!newSubTask.trim()}
                  className="text-[#8B949E] hover:text-white disabled:opacity-50 transition-colors p-1 shrink-0 bg-black/20 rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
             </div>
           )}
        </div>
      ) : null}
    </motion.div>
  );
}
`;

// Extract TaskModal exactly as it is to keep it intact, and replace TaskCard.
const taskModalMatch = content.match(/export function TaskModal[\s\S]*$/);

if (taskModalMatch) {
  content = newCard + '\n\n' + taskModalMatch[0];
} else {
  console.log("Could not find TaskModal!");
}

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
