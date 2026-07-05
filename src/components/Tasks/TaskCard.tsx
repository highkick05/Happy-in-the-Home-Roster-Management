import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight,
  CheckSquare, Square, Clock, Flame, GripVertical, 
  UserCircle2, UserIcon, Users, CalendarIcon, X, Plus, MoreHorizontal, Trash2, ListChecks, Pencil
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';


function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
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
    <div className={`relative flex items-center justify-center ${className}`}>
      {showFireworks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-brand-green"
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 16,
                y: Math.sin((i * 60 * Math.PI) / 180) * 16,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
      <motion.div
        initial={false}
        animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}
      >
        {checked ? <CheckSquare className="w-full h-full text-brand-green" /> : <Square className="w-full h-full text-[#8B949E]" />}
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
  clientList,
  onToggleImportant
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
  const totalItems = totalSubtasks + 1;
  const completedItems = completedSubtasks + (task.status === 'Completed' ? 1 : 0);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

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
      <div className={`w-full ${containerClass} rounded-r-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-grow overflow-hidden min-w-0 px-0">
            <div className="flex items-center gap-3 shrink-0 max-w-full">
              <span className={`font-bold text-xl truncate ${task.status === 'Completed' ? 'text-zinc-500 line-through' : 'text-[#E6EDF3]'}`}>
                {task.title}
              </span>
              {!!task.is_important && (
                <span className="text-[10px] font-bold text-orange-500 bg-orange-500/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">Urgent</span>
              )}
            </div>
            
            {task.description && (
              <>
                <span className="hidden sm:inline text-zinc-600 shrink-0">•</span>
                <span className={`text-lg flex items-center gap-2 text-[#8B949E] min-w-0 overflow-hidden`}>
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
            
            {totalSubtasks > 0 && task.status !== 'Completed' && (
              <span className="text-xs font-bold text-brand-teal px-3 py-1 rounded-full uppercase whitespace-nowrap tracking-wider mr-3 bg-brand-teal/10">
                {Math.round(progress)}% Complete
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
      className={`bg-brand-navy border ${task.is_important ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-border-subtle hover:border-[#30363d]'} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden select-none`}
    >
      {/* Overall Progress Background */}
      {totalSubtasks > 0 && task.status !== 'Completed' && (
        <div 
          className="absolute top-0 left-0 bottom-0 bg-brand-teal/5 pointer-events-none transition-all duration-500 z-0"
          style={{ width: `${progress}%` }}
        />
      )}
      
      {/* Top Progress Bar */}
      {totalSubtasks > 0 && task.status !== 'Completed' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          <motion.div 
            className="h-full bg-brand-teal transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div 
        className={`relative z-10 flex flex-col md:flex-row md:items-center ${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none`}
        onClick={() => setShowSubtasks(!showSubtasks)}
      >
        {/* Left side: Checkbox + Title + Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {!wallboardMode && dragControls && (
            <div
              style={{ touchAction: "none" }} className="cursor-grab active:cursor-grabbing text-[#8B949E] hover:text-white px-3 py-4 -ml-4 -my-4 transition-colors flex items-center justify-center rounded-md hover:bg-white/[0.04]"
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <GripVertical className="w-5 h-5 pointer-events-none" />
            </div>
          )}
          <button 
            onClick={handleToggleComplete}
            
            className={`shrink-0 ${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors ${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}`}
          >
            <AnimatedCheckbox checked={isChecked} className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} />
          </button>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
               <h3 className={`font-medium ${wallboardMode ? 'text-[22px]' : 'text-[14px]'} leading-snug truncate ${task.status === 'Completed' ? 'line-through text-[#8B949E]' : 'text-[#E6EDF3]'}`}>
                 {task.title}
               </h3>
               {!!task.is_important && (
                 <span className="shrink-0 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Urgent</span>
               )}
            </div>
            {!!task.description && (
              <p className={`${wallboardMode ? 'text-[16px]' : 'text-[12px]'} text-[#8B949E] mt-0.5 truncate`}>
                {task.description}
              </p>
            )}
            
            
            
            
          </div>
        </div>

        {/* Right side: Meta info (Dates, Assignments) */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0">
          {/* Staff & Clients Avatars */}
          {(assignedStaff.length > 0 || assignedClients.length > 0) && (
            <div className="flex items-center gap-2 border-l border-border-subtle pl-3 overflow-hidden" onPointerDown={e => e.stopPropagation()}>
              {assignedStaff.length > 0 && (
                <div className="flex flex-wrap gap-1.5" title="Assigned Staff">
                   {assignedStaff.map((id: any) => {
                     const staff = staffList?.find((s:any) => String(s.id) === String(id));
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
                     const client = clientList?.find((c:any) => String(c.id) === String(id));
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
          )}

          {/* Quick Actions */}
          {!wallboardMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 rounded-md transition-colors text-[#8B949E] hover:text-white hover:bg-white/[0.04]"
                title="Edit Task"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onPointerDown={e => e.stopPropagation()}
                onPointerUp={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
                className={`p-1.5 rounded-md transition-colors ${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:bg-white/[0.04]'}`}
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
            <div className={`${wallboardMode ? 'px-6 py-4' : 'px-4 py-3'} flex flex-col gap-2`}>
               {totalSubtasks > 0 && (
                 <>
                   
                   
                   
                   <div className="flex flex-col gap-1.5">
                     {task.sub_tasks.map((st: any) => (
                       <div key={st.id} className="flex items-start justify-between group/st">
                         <div className="flex items-start gap-2 cursor-pointer select-none flex-1" onClick={() => onToggleSubTask(st.id, !!st.completed)}>
                           <button className={`mt-0.5 shrink-0 transition-colors ${st.completed ? 'text-brand-green' : 'text-[#8B949E] hover:text-white'}`}>
                             <AnimatedCheckbox checked={!!st.completed} className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} />
                           </button>
                           <span className={`${wallboardMode ? 'text-[15px]' : 'text-[13px]'} ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
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
                 <div className={`flex items-center space-x-2 mt-1 ${totalSubtasks > 0 ? "pt-2 border-t border-border-subtle/30" : ""}`}>
                    <input
                      type="text"
                      value={newSubTask}
                      onChange={e => setNewSubTask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
                      placeholder="Add checklist item..."
                      className="flex-1 bg-transparent select-text border-none text-[13px] text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:ring-0 px-1 py-0.5"
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


export function TaskModal({ task, onClose, onSave, onDelete, staffList, clientList }: any) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'Active',
    start_date: task?.start_date || '',
    end_date: task?.end_date || '',
    assigned_staff: [] as number[],
    assigned_clients: [] as number[],
    sub_tasks: task?.sub_tasks || []
  });

  const [newSubTask, setNewSubTask] = useState('');

  useEffect(() => {
    if (task) {
      try {
        setFormData(prev => ({
          ...prev,
          assigned_staff: JSON.parse(task.assigned_staff || '[]'),
          assigned_clients: JSON.parse(task.assigned_clients || '[]')
        }));
      } catch(e){}
    }
  }, [task]);

  const addSubTask = () => {
    if (!newSubTask.trim()) return;
    setFormData(prev => ({
      ...prev,
      sub_tasks: [...prev.sub_tasks, { title: newSubTask.trim(), completed: 0 }]
    }));
    setNewSubTask('');
  };

  const removeSubTask = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      sub_tasks: prev.sub_tasks.filter((_, i) => i !== idx)
    }));
  };

  const toggleStaff = (id: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_staff: prev.assigned_staff.includes(id) 
        ? prev.assigned_staff.filter((sid: number) => sid !== id)
        : [...prev.assigned_staff, id]
    }));
  };

  const toggleClient = (id: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_clients: prev.assigned_clients.includes(id) 
        ? prev.assigned_clients.filter((cid: number) => cid !== id)
        : [...prev.assigned_clients, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      assigned_staff: JSON.stringify(formData.assigned_staff),
      assigned_clients: JSON.stringify(formData.assigned_clients)
    });
  };

  return (
    <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-brand-navy border border-border-subtle rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
          <h2 className="text-lg font-bold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-2 text-[#8B949E] hover:text-white rounded-md hover:bg-white/[0.04]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Task Title</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none"
                placeholder="Enter task title..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none resize-none"
                placeholder="Add more details..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
                className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                  className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                  className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none text-sm"
                />
              </div>
            </div>

            {/* Assignments */}
            <div>
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Assign Staff</label>
              <div className="h-32 overflow-y-auto bg-black/20 border border-border-subtle rounded-lg p-2 space-y-1">
                {staffList.map(s => (
                  <label key={s.id} className="flex items-center space-x-2 text-sm text-[#E6EDF3] cursor-pointer hover:bg-white/[0.04] p-1 rounded">
                    <input 
                      type="checkbox"
                      checked={formData.assigned_staff.includes(s.id)}
                      onChange={() => toggleStaff(s.id)}
                      className="rounded border-border-subtle bg-black/20 text-brand-teal focus:ring-brand-teal focus:ring-offset-0"
                    />
                    <span>{s.first_name} {s.last_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Assign Clients</label>
              <div className="h-32 overflow-y-auto bg-black/20 border border-border-subtle rounded-lg p-2 space-y-1">
                {clientList.map(c => (
                  <label key={c.id} className="flex items-center space-x-2 text-sm text-[#E6EDF3] cursor-pointer hover:bg-white/[0.04] p-1 rounded">
                    <input 
                      type="checkbox"
                      checked={formData.assigned_clients.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="rounded border-border-subtle bg-black/20 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span>{c.first_name} {c.last_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Add-Progress */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Add-Progress</label>
              <div className="space-y-2">
                {formData.sub_tasks.map((st: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-black/20 border border-border-subtle rounded-lg px-3 py-1.5">
                    <div 
                      className="flex items-center space-x-2 cursor-pointer select-none flex-1"
                      onClick={() => {
                        const newSubTasks = [...formData.sub_tasks];
                        newSubTasks[idx].completed = !newSubTasks[idx].completed;
                        setFormData({ ...formData, sub_tasks: newSubTasks });
                      }}
                    >
                      <button type="button" className={`shrink-0 ${st.completed ? 'text-brand-green' : 'text-[#8B949E] hover:text-white'}`}>
                        <AnimatedCheckbox checked={!!st.completed} className="w-4 h-4" />
                      </button>
                      <span className={`text-sm ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>{st.title}</span>
                    </div>
                    <button type="button" onClick={() => removeSubTask(idx)} className="text-[#8B949E] hover:text-red-400 p-1 shrink-0 ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    value={newSubTask}
                    onChange={e => setNewSubTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubTask())}
                    placeholder="Add progress..."
                    className="flex-1 bg-black/20 border border-border-subtle rounded-lg px-3 py-1.5 text-white focus:border-brand-teal outline-none text-sm"
                  />
                  <button type="button" onClick={addSubTask} className="px-3 py-1.5 bg-[#8B949E]/20 text-white rounded-lg hover:bg-[#8B949E]/40 transition-colors text-sm font-semibold">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-border-subtle flex justify-between space-x-2 shrink-0 items-center">
          <div>
            {task && (
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); onDelete(); }}
                className="px-3 py-1.5 text-sm font-semibold text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Task
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#8B949E] hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors">
              Save Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
