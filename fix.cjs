const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /function AnimatedCheckbox\([\s\S]*?className=\{`bg-brand-navy border \$\{task\.is_important \? 'border-orange-500\/50 shadow-\[0_0_15px_rgba\(249,115,22,0\.1\)\]' : 'border-border-subtle hover:border-\[#30363d\]'\} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden select-none`\}[\s\S]*?>[\s\S]*?{\/\* Overall Progress Background \*\/}/m;

const replacement = `function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
  const [showFireworks, setShowFireworks] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (checked && !isFirstRender.current) {
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 800);
      return () => clearTimeout(timer);
    }
  }, [checked]);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <div className={\`relative flex items-center justify-center \${className}\`}>
      <motion.div
        initial={false}
        animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}
      >
        {checked ? <CheckCircle2 className="w-full h-full text-brand-green" /> : <Circle className="w-full h-full text-[#8B949E]" />}
      </motion.div>
    </div>
  );
}

export function TaskCard({ 
  task, 
  onToggleComplete, 
  onEdit, 
  onDelete,
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  wallboardMode,
  dragControls,
  staffList,
  clientList
}: any) {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubTask, setNewSubTask] = useState('');

  const isChecked = task.status === 'Completed';

  const handleToggleComplete = (e: any) => {
    e.stopPropagation();
    onToggleComplete();
  };

  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      onAddSubTask(task.id, newSubTask.trim());
      setNewSubTask('');
    }
  };

  const assignedStaff = typeof task.assigned_staff === 'string' ? JSON.parse(task.assigned_staff || '[]') : (task.assigned_staff || []);
  const assignedClients = typeof task.assigned_clients === 'string' ? JSON.parse(task.assigned_clients || '[]') : (task.assigned_clients || []);
  
  const totalSubtasks = task.sub_tasks?.length || 0;
  const completedSubtasks = task.sub_tasks?.filter((st:any) => st.completed).length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  if (wallboardMode) {
    let containerClass = "transition-all flex items-center p-3 sm:p-4 shadow-sm border-y border-white/[0.05] ";
    
    if (task.status === 'Completed') {
      containerClass += "opacity-80 border-l-[6px] border-brand-green bg-brand-green/25";
    } else if (task.is_important) {
      containerClass += "opacity-90 border-l-[6px] border-orange-500 bg-orange-500/25 pulse-border";
    } else {
      containerClass += "opacity-95 border-l-[6px] border-zinc-400 bg-zinc-500/25";
    }

    return (
      <div className={\`w-full \${containerClass} rounded-r-xl\`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-grow overflow-hidden min-w-0 px-0">
            <div className="flex items-center gap-3 shrink-0 max-w-full">
              <span className={\`font-bold text-xl truncate \${task.status === 'Completed' ? 'text-zinc-500 line-through' : 'text-[#E6EDF3]'}\`}>
                {task.title}
              </span>
              {!!task.is_important && (
                <span className="text-[10px] font-bold text-orange-500 bg-orange-500/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">Urgent</span>
              )}
            </div>
            
            {task.description && (
              <>
                <span className="hidden sm:inline text-zinc-600 shrink-0">•</span>
                <span className={\`text-lg flex items-center gap-2 text-[#8B949E] min-w-0 overflow-hidden\`}>
                  <span className="truncate">{task.description}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-start sm:justify-end whitespace-nowrap shrink-0">
            {(assignedStaff.length > 0 || assignedClients.length > 0) && (
              <div className="flex gap-2 mr-4">
                 {assignedStaff.map((id: any) => {
                   const staff = staffList?.find((s:any) => String(s.id) === String(id));
                   if (!staff) return null;
                   return (
                     <div key={id} className="px-3 py-1 rounded-md bg-brand-green/10 border border-brand-green/30 text-brand-green flex items-center text-sm font-bold whitespace-nowrap">
                       <UserIcon className="w-4 h-4 mr-1.5 opacity-80" />
                       {staff.first_name} {staff.last_name}
                     </div>
                   )
                 })}
                 {assignedClients.map((id: any) => {
                   const client = clientList?.find((c:any) => String(c.id) === String(id));
                   if (!client) return null;
                   return (
                     <div key={id} className="px-3 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center text-sm font-bold whitespace-nowrap">
                       <UserCircle2 className="w-4 h-4 mr-1.5 opacity-80" />
                       {client.first_name} {client.last_name}
                     </div>
                   )
                 })}
              </div>
            )}
            
            {totalSubtasks > 0 && (
              <span className="text-xs bg-zinc-500/20 text-zinc-300 font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider mr-3">
                {completedSubtasks}/{totalSubtasks} Subtasks
              </span>
            )}
            
            {task.status === 'Completed' && (
              <span className="text-xs bg-brand-green/20 text-brand-green font-medium px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={\`bg-brand-navy border \${task.is_important ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-border-subtle hover:border-[#30363d]'} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden select-none\`}
    >
      {/* Overall Progress Background */}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
