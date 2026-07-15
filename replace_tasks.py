import os

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write("""import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, GripVertical, CheckSquare, Square, Trash2, X, Plus } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';

function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div initial={false} animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}>
        {checked ? <CheckSquare className="w-full h-full text-brand-green" /> : <Square className="w-full h-full text-[#8B949E]" />}
      </motion.div>
    </div>
  );
}

export function TaskCard({
  task,
  onEdit,
  wallboardMode,
  dragControls,
  provided,
  snapshot
}: any) {
  const isChecked = task.status === 'Done';
  const { timeLeft, isOverdue, isNearDue } = useCountdown(task.due_date, task.created_at, isChecked);

  const safeStaff = task.staff || [];
  const safeClients = task.clients || [];

  if (wallboardMode) {
    let containerClass = "transition-all flex items-center p-3 sm:p-4 shadow-sm border-y border-white/[0.05] ";
    if (task.status === 'Done') {
      containerClass += "opacity-80 border-l-[6px] border-brand-green bg-brand-green/25";
    } else if (task.status === 'In Progress') {
      containerClass += "opacity-95 border-l-[6px] border-amber-500 bg-amber-500/25";
    } else {
      containerClass += "opacity-95 border-l-[6px] border-zinc-400 bg-zinc-500/25";
    }

    return (
      <div className={`w-full ${containerClass} rounded-r-xl`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-grow overflow-hidden min-w-0 px-0">
            <div className="flex items-center gap-3 shrink-0 max-w-full">
              {task.category_name && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0"
                  style={{ backgroundColor: `${task.category_color}20`, color: task.category_color }}
                >
                  {task.category_name}
                </span>
              )}
              <span className={`font-bold text-xl truncate ${task.status === 'Done' ? 'text-zinc-500 line-through' : 'text-[#E6EDF3]'}`}>
                {task.title}
              </span>
            </div>
            {task.description && (
              <>
                <span className="hidden sm:inline text-zinc-600 shrink-0">•</span>
                <span className="text-lg flex items-center gap-2 text-[#8B949E] min-w-0 overflow-hidden">
                  <span className="truncate">{task.description}</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-start sm:justify-end whitespace-nowrap shrink-0">
            {(safeStaff.length > 0 || safeClients.length > 0) && (
              <div className="flex gap-2 mr-4">
                 {safeStaff.map((s: any) => (
                   <span key={s.id} className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal text-xs font-bold ring-2 ring-brand-navy shadow-sm" title={s.name}>
                     {s.name.substring(0,2).toUpperCase()}
                   </span>
                 ))}
                 {safeClients.map((c: any) => (
                   <span key={c.id} className="flex items-center justify-center px-2 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold ring-2 ring-brand-navy shadow-sm" title={c.name}>
                     {c.name}
                   </span>
                 ))}
              </div>
            )}
            {task.due_date && !isChecked && (
              <div className={`flex items-center text-lg font-medium tracking-tight px-3 py-1 rounded-lg border ${
                isOverdue ? 'text-red-400 border-red-400/30 bg-red-400/10' :
                isNearDue ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
                'text-[#8B949E] border-white/[0.05] bg-white/[0.02]'
              }`}>
                <Clock className={`w-5 h-5 mr-1.5 ${isOverdue ? 'animate-pulse' : ''}`} />
                {timeLeft}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Kanban Card View
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-4 bg-brand-navy border border-border-subtle rounded-xl shadow-sm mb-3 cursor-pointer hover:border-brand-teal/50 transition-colors ${snapshot.isDragging ? 'opacity-90 shadow-xl ring-2 ring-brand-teal scale-[1.02]' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-1.5">
          {task.category_name && (
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              {task.category_name}
            </span>
          )}
        </div>
        <div className="text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors" {...provided.dragHandleProps}>
          <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <h3 className={`text-[15px] font-semibold leading-snug mb-1 ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
        {task.title}
      </h3>
      {task.description && (
        <p className="text-[13px] text-[#8B949E] line-clamp-2 mb-3">
          {task.description}
        </p>
      )}
      
      <div className="mt-auto pt-3 flex items-center justify-between">
        <div className="flex items-center -space-x-2 overflow-hidden">
          {safeStaff.map((s: any) => (
             <span key={s.id} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-teal/20 border-2 border-brand-navy text-brand-teal text-[10px] font-bold z-10" title={s.name}>
               {s.name.substring(0,2).toUpperCase()}
             </span>
          ))}
          {safeClients.map((c: any, idx: number) => (
             <span key={c.id} className="inline-flex items-center justify-center h-6 px-1.5 rounded-full bg-indigo-500/20 border-2 border-brand-navy text-indigo-400 text-[10px] font-bold z-[5]" style={{ zIndex: 5 - idx }} title={c.name}>
               {c.name.split(' ')[0]}
             </span>
          ))}
        </div>
        
        {task.due_date && !isChecked && (
          <div className={`flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${
            isOverdue ? 'text-red-400 border-red-400/30 bg-red-400/10' :
            isNearDue ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' :
            'text-[#8B949E] border-white/[0.05] bg-white/[0.02]'
          }`}>
            <Clock className="w-3 h-3 mr-1" />
            {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskModal({
  task,
  staffList,
  clientList,
  categories,
  onClose,
  onSave,
  onDelete
}: any) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    due_date: task?.due_date || '',
    category_id: task?.category_id || '',
    staff_ids: task?.staff?.map((s: any) => s.id) || task?.assigned_staff_parsed || [],
    client_ids: task?.clients?.map((c: any) => c.id) || task?.assigned_clients_parsed || []
  });

  const toggleStaff = (id: number) => {
    setFormData(prev => ({
      ...prev,
      staff_ids: prev.staff_ids.includes(id) 
        ? prev.staff_ids.filter((sid: number) => sid !== id)
        : [...prev.staff_ids, id]
    }));
  };

  const toggleClient = (id: number) => {
    setFormData(prev => ({
      ...prev,
      client_ids: prev.client_ids.includes(id) 
        ? prev.client_ids.filter((cid: number) => cid !== id)
        : [...prev.client_ids, id]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
          <div className="grid grid-cols-1 gap-4">
            <div>
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
            <div>
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none resize-none"
                placeholder="Add more details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none"
                >
                  <option value="">No Category</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Assigned Staff</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {staffList?.map((staff: any) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => toggleStaff(staff.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${formData.staff_ids.includes(staff.id) ? 'bg-brand-teal/20 border-brand-teal/50 text-brand-teal' : 'bg-black/20 border-white/[0.05] text-[#8B949E] hover:border-white/[0.1]'}`}
                    >
                      {staff.first_name} {staff.last_name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Assigned Clients</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {clientList?.map((client: any) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => toggleClient(client.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${formData.client_ids.includes(client.id) ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-black/20 border-white/[0.05] text-[#8B949E] hover:border-white/[0.1]'}`}
                    >
                      {client.first_name} {client.last_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                className="w-full bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal outline-none text-sm"
              />
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
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
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
""")
