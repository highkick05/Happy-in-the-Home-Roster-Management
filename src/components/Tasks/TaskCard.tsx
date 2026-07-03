import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, CheckCircle2, Circle, Clock, Users, Calendar as CalendarIcon, UserCircle2, X, Plus, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function TaskCard({ task, onEdit, onDelete, onComplete, onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant, staffList, clientList, wallboardMode = false }: any) {
  const [newSubTask, setNewSubTask] = useState('');
  
  let assignedStaff: number[] = [];
  let assignedClients: number[] = [];
  try { assignedStaff = JSON.parse(task.assigned_staff || '[]'); } catch(e){}
  try { assignedClients = JSON.parse(task.assigned_clients || '[]'); } catch(e){}

  const progress = task.sub_tasks?.length > 0 
    ? Math.round((task.sub_tasks.filter((st: any) => st.completed).length / task.sub_tasks.length) * 100) 
    : 0;

  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      onAddSubTask(task.id, newSubTask.trim());
      setNewSubTask('');
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -2, boxShadow: "0 8px 30px -4px rgba(0,0,0,0.4)", borderColor: task.is_important ? "rgba(249, 115, 22, 0.2)" : "rgba(45, 212, 191, 0.3)" }}
      className={`bg-brand-navy border ${task.is_important ? 'border-orange-900/30' : 'border-border-subtle'} rounded-xl flex flex-col group overflow-hidden relative shadow-md transition-colors duration-300`}
    >
      {!!task.is_important && (
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none overflow-hidden z-0 rounded-xl opacity-90">
          {/* Base uniform glow */}
          <motion.div 
            animate={{ opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-orange-600/70 via-red-500/20 to-transparent mix-blend-screen blur-[2px]"
          />
          
          {/* Sparks */}
          {[...Array(25)].map((_, i) => {
            const randomX = (i * 13.7) % 100;
            const delay = (i * 0.27) % 2;
            const duration = 1.5 + (i * 0.13) % 1.5;
            const height = 30 + (i * 11) % 50;
            const horizontalSway = -15 + (i * 7) % 30;

            return (
              <motion.div
                key={`spark-${i}`}
                className="absolute bottom-0 w-1 h-1 bg-yellow-400 rounded-full"
                style={{
                  left: `${randomX}%`,
                  filter: 'blur(0.5px)',
                  mixBlendMode: 'screen'
                }}
                animate={{ 
                  y: [0, -height],
                  opacity: [0, 1, 0],
                  x: [0, horizontalSway],
                  scale: [1, 0]
                }}
                transition={{ 
                  duration: duration, 
                  repeat: Infinity, 
                  ease: "easeOut", 
                  delay: delay 
                }}
              />
            );
          })}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-brand-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
      <div 
        className="px-2.5 py-1.5 flex items-start justify-between gap-3 cursor-pointer relative z-10"
        onClick={onEdit}
      >
        
        {/* Left Section - Checkbox, Title and Description */}
        <div className="flex-1 flex gap-4 min-w-0 items-start">
          <motion.button 
            onClick={(e: any) => { e.stopPropagation(); onComplete(); }} 
            title={task.status === 'Completed' ? "Completed" : "Complete Task"} 
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className={`mt-0.5 shrink-0 flex items-center justify-center rounded-full transition-colors duration-300 ${task.status === 'Completed' ? 'text-brand-green bg-brand-green/10 p-1 shadow-[0_0_15px_rgba(46,160,67,0.2)]' : 'text-[#8B949E] hover:text-brand-green hover:bg-brand-green/10 p-1'}`}
          >
            <AnimatePresence mode="wait">
              {task.status === 'Completed' ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle2 className="w-[26px] h-[26px] drop-shadow-md" />
                </motion.div>
              ) : (
                <motion.div
                  key="incomplete"
                  initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Circle className="w-[26px] h-[26px]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          
          <div className="flex flex-col gap-1 min-w-0 mt-0.5">
            <h3 className={`font-medium ${wallboardMode ? 'text-[22px]' : 'text-[15px]'} tracking-tight leading-snug truncate transition-colors duration-300 ${task.status === 'Completed' ? 'line-through text-[#8B949E]' : 'text-[#E6EDF3] group-hover:text-brand-teal'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className={`text-[#8B949E] ${wallboardMode ? 'text-[18px]' : 'text-[13px]'} line-clamp-2 leading-relaxed`}>
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Section - Dates & Assignments */}
        <div className="flex gap-4 shrink-0 items-start">
          <div className={`flex flex-col gap-2 w-72 shrink-0 ${wallboardMode ? 'text-[16px] w-96' : 'text-[13px]'} text-[#8B949E] mt-0.5 z-10`}>
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate" title="Created date">
                {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'New'}
              </span>
            </div>
            {(task.start_date || task.end_date) && (
              <div className="flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                <span className="truncate">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString() : '...'} - {task.end_date ? new Date(task.end_date).toLocaleDateString() : '...'}
                </span>
              </div>
            )}
            
            {(assignedStaff.length > 0 || assignedClients.length > 0) && (
              <div className="flex flex-col gap-1.5">
                {assignedStaff.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap" title="Assigned Staff">
                    <Users className="w-3.5 h-3.5 mr-1 text-brand-green shrink-0" />
                    {assignedStaff.map(id => {
                      const staff = staffList?.find((s: any) => s.id === id);
                      return <span key={id} className="bg-brand-green/10 text-brand-green px-1.5 py-0.5 rounded-sm whitespace-nowrap">{staff ? `${staff.first_name} ${staff.last_name}` : `Staff #${id}`}</span>;
                    })}
                  </div>
                )}
                {assignedClients.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap" title="Assigned Clients">
                    <UserCircle2 className="w-3.5 h-3.5 mr-1 text-purple-400 shrink-0" />
                    {assignedClients.map(id => {
                      const client = clientList?.find((c: any) => c.id === id);
                      return <span key={id} className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-sm whitespace-nowrap">{client ? `${client.first_name} ${client.last_name}` : `Client #${id}`}</span>;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <motion.button
              onClick={(e: any) => { e.stopPropagation(); onToggleImportant(); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className={`mt-0.5 p-1.5 rounded-full transition-colors z-10 ${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:text-orange-400 hover:bg-orange-500/10'}`}
              title="Toggle Importance"
            >
              <div className="flex items-center space-x-1">
                {task.is_important ? <span className="text-[10px] font-bold text-orange-500 tracking-wider">URGENT</span> : null}
                <Flame className={`w-5 h-5 ${task.is_important ? 'fill-orange-500/50 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : ''}`} />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border-subtle bg-black/20 rounded-b-lg">
        {task.sub_tasks?.length > 0 && (
          <div className={`w-full px-2 py-1.5 flex items-center justify-between ${wallboardMode ? 'text-[15px]' : 'text-xs'} font-semibold text-[#8B949E]`}>
            <span>Progress ({task.sub_tasks.filter((st:any) => st.completed).length}/{task.sub_tasks.length})</span>
            <div className="w-24 h-1.5 bg-[#1A2332] rounded-full overflow-hidden shadow-inner">
              <motion.div 
                className="h-full bg-gradient-to-r from-brand-teal to-[#3BE3C5] rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
        
        <div className="px-2 pb-2 pt-0.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
            {task.sub_tasks?.map((st: any) => (
            <div 
              key={st.id || Math.random()} 
              className="flex items-start justify-between space-x-2 group"
            >
              <div className="flex items-start space-x-2 cursor-pointer flex-1" onClick={() => st.id && onToggleSubTask(st.id, !!st.completed)}>
                <button className={`shrink-0 mt-0.5 ${st.completed ? 'text-brand-green' : 'text-[#8B949E] group-hover:text-white'}`}>
                  {st.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
                <span className={`${wallboardMode ? 'text-[16px]' : 'text-xs'} ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
                  {st.title}
                </span>
              </div>
              <button 
                onClick={() => st.id && onDeleteSubTask(st.id)} 
                className="text-[#8B949E] hover:text-red-400 p-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            ))}
          </div>
          <div className="flex items-center space-x-2 mt-2 pt-1 border-t border-border-subtle/50">
            <input
              type="text"
              value={newSubTask}
              onChange={e => setNewSubTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubTask())}
              placeholder="Add progress..."
              className="flex-1 bg-transparent border-none text-xs text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:ring-0 px-1 py-0.5"
            />
            <button 
              onClick={handleAddSubTask}
              disabled={!newSubTask.trim()}
              className="text-brand-teal hover:text-brand-teal/80 disabled:opacity-50 transition-colors p-0.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
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
