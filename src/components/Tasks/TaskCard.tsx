import { motion, AnimatePresence } from 'framer-motion';
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
      className={`bg-brand-navy border ${task.is_important ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-border-subtle hover:border-[#30363d]'} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden`}
    >
      <div 
        className={`${wallboardMode ? 'p-6 gap-4' : 'p-4 gap-3'} flex flex-col cursor-pointer`}
        onClick={onEdit}
      >
        <div className="flex items-start justify-between gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={`shrink-0 ${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors ${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}`}
          >
            {task.status === 'Completed' ? <CheckCircle2 className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} /> : <Circle className={wallboardMode ? "w-7 h-7" : "w-5 h-5"} />}
          </button>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold ${wallboardMode ? 'text-xl' : 'text-[15px]'} leading-snug ${task.status === 'Completed' ? 'line-through text-[#8B949E]' : 'text-[#E6EDF3]'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`${wallboardMode ? 'text-base' : 'text-sm'} text-[#8B949E] mt-1 line-clamp-2 leading-relaxed`}>
                {task.description}
              </p>
            )}
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
            className={`shrink-0 p-1.5 rounded-md transition-colors ${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:bg-[#21262d] opacity-0 group-hover:opacity-100'}`}
          >
            <Flame className={wallboardMode ? "w-6 h-6" : "w-4 h-4"} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs mt-1 pl-8">
           {task.start_date || task.end_date ? (
             <div className={`flex items-center text-[#8B949E] bg-black/20 px-2 py-0.5 rounded-md ${wallboardMode ? 'text-sm px-3 py-1' : ''}`}>
               <CalendarIcon className={`mr-1 ${wallboardMode ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
               {task.start_date && new Date(task.start_date).toLocaleDateString()}
               {task.start_date && task.end_date && ' - '}
               {task.end_date && new Date(task.end_date).toLocaleDateString()}
             </div>
           ) : null}
           
           {assignedStaff.map((id: any) => {
             const staff = staffList?.find((s:any) => s.id === id);
             return staff && (
               <span key={id} className={`bg-brand-green/10 text-brand-green ${wallboardMode ? 'text-sm px-3 py-1' : 'px-2 py-0.5'} rounded-md border border-brand-green/20`}>
                 {staff.first_name} {staff.last_name}
               </span>
             )
           })}
           
           {assignedClients.map((id: any) => {
             const client = clientList?.find((c:any) => c.id === id);
             return client && (
               <span key={id} className={`bg-purple-500/10 text-purple-400 ${wallboardMode ? 'text-sm px-3 py-1' : 'px-2 py-0.5'} rounded-md border border-purple-500/20`}>
                 {client.first_name} {client.last_name}
               </span>
             )
           })}
        </div>
      </div>
      
      {(task.sub_tasks && task.sub_tasks.length > 0) || !wallboardMode ? (
        <div className={`border-t border-border-subtle bg-black/20 ${wallboardMode ? 'px-6 py-4' : 'px-4 py-3'} flex flex-col gap-2`}>
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
                   animate={{ width: `${progress}%` }}
                 />
               </div>
               
               <div className="flex flex-col gap-1.5">
                 {task.sub_tasks.map((st: any) => (
                   <div key={st.id} className="flex items-start justify-between group/st">
                     <div className="flex items-start gap-2 cursor-pointer flex-1" onClick={() => onToggleSubTask(st.id, !!st.completed)}>
                       <button className={`mt-0.5 shrink-0 ${st.completed ? 'text-brand-green' : 'text-[#8B949E]'}`}>
                         {st.completed ? <CheckCircle2 className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} /> : <Circle className={wallboardMode ? "w-5 h-5" : "w-3.5 h-3.5"} />}
                       </button>
                       <span className={`${wallboardMode ? 'text-sm' : 'text-xs'} ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
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
                      className="flex items-center space-x-2 cursor-pointer flex-1"
                      onClick={() => {
                        const newSubTasks = [...formData.sub_tasks];
                        newSubTasks[idx].completed = !newSubTasks[idx].completed;
                        setFormData({ ...formData, sub_tasks: newSubTasks });
                      }}
                    >
                      <button type="button" className={`shrink-0 ${st.completed ? 'text-brand-green' : 'text-[#8B949E] hover:text-white'}`}>
                        {st.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
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
