import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, MoreVertical, GripVertical, CheckSquare, Square, Trash2, X, Plus, Paperclip, File, Image as ImageIcon, CheckCircle2, Circle, Settings, FileText, FileSpreadsheet, FileArchive } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';

function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div initial={false} animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}>
        {checked ? <CheckCircle2 className="w-full h-full text-brand-teal" /> : <Circle className="w-full h-full text-[#8B949E]" />}
      </motion.div>
    </div>
  );
}

const getFileIconUrl = (ext?: string) => {
  const e = (ext || '').toLowerCase();
  let type = '';
  if (['pdf'].includes(e)) type = 'file_type_pdf';
  else if (['doc', 'docx'].includes(e)) type = 'file_type_word';
  else if (['xls', 'xlsx', 'csv'].includes(e)) type = 'file_type_excel';
  else if (['ppt', 'pptx'].includes(e)) type = 'file_type_powerpoint';
  else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) type = 'file_type_zip';
  else if (['txt', 'md', 'rtf', 'log'].includes(e)) type = 'file_type_text';
  else if (['mp3', 'wav', 'ogg', 'flac'].includes(e)) type = 'file_type_audio';
  else if (['mp4', 'avi', 'mkv', 'mov'].includes(e)) type = 'file_type_video';
  else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(e)) type = 'file_type_image';
  else return 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
  
  return `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${type}.svg`;
};

export function TaskCard({
  task,
  onEdit,
  wallboardMode,
  dragControls,
  provided,
  snapshot,
  onToggleSubtask,
  onToggleTaskStatus
}: any) {
  const isChecked = task.status === 'Done';
  const { timeLeft, isOverdue, isNearDue } = useCountdown(task.due_date, task.created_at, isChecked);

  const safeStaff = task.staff || [];
  const safeClients = task.clients || [];
  const subTasks = task.sub_tasks || [];
  const attachments = task.attachments ? (typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments) : [];
  
  const completedSubtasks = subTasks.filter((st: any) => st.completed).length;
  const imageAttachments = attachments.filter((a: any) => (a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)));
  const fileAttachments = attachments.filter((a: any) => !((a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))));

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
      <div className={`w-full ${containerClass} rounded-none`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 w-full">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center flex-grow overflow-hidden min-w-0 px-0">
            <div className="flex items-center gap-3 shrink-0 max-w-full">
              {task.category_name && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-none uppercase tracking-wider shrink-0"
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
              </div>
            )}
            {task.due_date && !isChecked && (
              <div className={`flex items-center text-lg font-medium tracking-tight px-3 py-1 rounded-none border ${
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
      className={`group relative flex flex-col p-0 bg-[#1E293B] hover:bg-[#273548] shadow-md border border-black/20 rounded-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}
    >
            {imageAttachments.length > 0 ? (
        <div className="w-full">
          {imageAttachments.map((img: any, idx: number) => (
            <div 
              key={idx}
              className="block w-full border-b border-border-subtle"
            >
              <img src={img.url} alt={img.filename} className="w-full h-32 object-cover" />
            </div>
          ))}
        </div>
      ) : fileAttachments.length > 0 ? (
        <div className="w-full h-24 bg-[#273548] flex items-center justify-center border-b border-border-subtle overflow-hidden">
           {(() => {
             const ext = fileAttachments[0].filename?.split('.').pop()?.toLowerCase() || '';
             return (
               <img 
                 src={getFileIconUrl(ext)} 
                 alt={ext || 'file'} 
                 className="w-12 h-12 object-contain drop-shadow-sm"
                 onError={(e) => {
                   e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg';
                 }}
               />
             );
           })()}
        </div>
      ) : null}
      <div className="flex flex-col p-3 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
            {task.status || 'To Do'}
          </span>
          {(task.assigned_to_id || (task.staff && task.staff.length > 0)) && (task.status === 'In Progress' || task.status === 'Done') ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/10 text-[#E6EDF3]">
              {task.assigned_to_id ? `${task.assigned_first_name} ${task.assigned_last_name}` : task.staff[0].name}
            </span>
          ) : null}
        </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button className="text-[#8B949E] hover:text-white p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>


      <div className="flex items-start gap-2.5 mb-2 mt-1">
        <button onClick={(e) => { e.stopPropagation(); if (onToggleTaskStatus) onToggleTaskStatus(task); }} className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${isChecked ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E] group-hover:border-white/50'}`}>
          {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-medium leading-snug ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
            {task.title}
          </h3>
                  {task.description && (
            <p className="text-[12px] text-[#8B949E] line-clamp-2 mt-1 leading-tight">
              {task.description}
            </p>
          )}
        </div>
      </div>


      
      
      
      {subTasks.length > 0 && (
        <div className="space-y-1 mb-2 pt-1.5 border-t border-white/[0.03]">
          {subTasks.map((st: any) => (
            <div key={st.id} className="flex items-start gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (onToggleSubtask) onToggleSubtask(task, st.id); }}>
              <div className="mt-0.5 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${st.completed ? 'bg-brand-teal/20 border-brand-teal/50' : 'border-[#8B949E]/50 group-hover:border-[#8B949E]'}`}>
                  {st.completed ? <CheckSquare className="w-2.5 h-2.5 text-brand-teal" /> : null}
                </div>
              </div>
              <span className={`text-[11px] leading-tight ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]/90'}`}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1 mb-2 pt-1.5 border-t border-white/[0.03]">
          {attachments.map((file: any, idx: number) => (
            <a 
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] font-medium text-brand-teal hover:underline truncate"
            >
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="truncate">{file.filename || (file.url && file.url.split('/').pop()) || 'Attachment'}</span>
            </a>
          ))}
        </div>
      )}
      
      <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/[0.03]">
        <div className="flex items-center -space-x-2 overflow-hidden">
          {safeStaff.map((s: any) => (
             <span key={s.id} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-teal/20 border-2 border-brand-navy text-brand-teal text-[10px] font-bold z-10" title={s.name}>
               {s.name.substring(0,2).toUpperCase()}
             </span>
          ))}
          {safeClients.map((c: any, idx: number) => (
             <span key={c.id} className="inline-flex items-center justify-center h-7 px-2 rounded-full bg-indigo-500/20 border-2 border-brand-navy text-indigo-400 text-[10px] font-bold z-[5]" style={{ zIndex: 5 - idx }} title={c.name}>
               {c.name.split(' ')[0]}
             </span>
          ))}
        </div>
        
        {task.due_date && !isChecked && (
          <div className={`flex items-center text-[11px] font-medium px-2 py-1 rounded-none border ${
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
  onDelete,
  onManageCategories
}: any) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'To Do',
    due_date: task?.due_date || '',
    category_id: task?.category_id || (categories && categories.length > 0 ? categories[0].id : ''),
    staff_ids: task?.staff?.map((s: any) => s.id) || task?.assigned_staff_parsed || [],
    client_ids: task?.clients?.map((c: any) => c.id) || task?.assigned_clients_parsed || [],
    sub_tasks: task?.sub_tasks || [],
    attachments: task?.attachments ? (typeof task?.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments) : [],
    assigned_to_id: task?.assigned_to_id || ''
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleAddSubtask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newSubtask.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        sub_tasks: [...prev.sub_tasks, { id: Date.now(), title: newSubtask.trim(), completed: 0 }]
      }));
      setNewSubtask('');
    }
  };

  const toggleSubtask = (id: number) => {
    setFormData(prev => ({
      ...prev,
      sub_tasks: prev.sub_tasks.map((st: any) => st.id === id ? { ...st, completed: st.completed ? 0 : 1 } : st)
    }));
  };

  const removeSubtask = (id: number) => {
    setFormData(prev => ({
      ...prev,
      sub_tasks: prev.sub_tasks.filter((st: any) => st.id !== id)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    try {
      const token = localStorage.getItem('token'); // Simplistic
      const res = await fetch('/api/tasks/upload-attachment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (!res.ok) throw new Error('Upload failed');
      const attachment = await res.json();
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_: any, i: number) => i !== idx)
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (formData.status === 'In Progress' && formData.staff_ids.length === 0) {
      alert("Please assign at least one staff member when setting status to In Progress.");
      return;
    }
    onSave(formData);
  };

  const imageAttachments = formData.attachments.filter((a: any) => a.filename?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  const fileAttachments = formData.attachments.filter((a: any) => !a.filename?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i));

  return (
    <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-brand-navy border border-border-subtle rounded-none w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-sm">
        <div className="flex items-center justify-between p-3 border-b border-border-subtle shrink-0 bg-black/20">
          <h2 className="text-xl font-bold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <div className="flex items-center gap-3">
            {task && onDelete && (
              <button type="button" onClick={onDelete} className="text-red-400 hover:bg-red-400/10 p-2 rounded-none transition-colors flex items-center text-sm font-medium">
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete
              </button>
            )}
            <button onClick={onClose} className="p-2 text-[#8B949E] hover:text-white rounded-none hover:bg-white/[0.04]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form id="task-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-4">
            <div>
              <input
                required
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder:text-[#8B949E]/50 focus:ring-0 outline-none px-0"
                placeholder="Task Title"
              />
            </div>
            
            <div className="flex gap-4 border-b border-white/[0.05] pb-4">
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
              
              <div className="flex items-center gap-1">
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none"
                >
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onManageCategories}
                  className="p-1.5 text-[#8B949E] hover:text-white bg-black/20 hover:bg-black/40 border border-border-subtle rounded-none transition-colors"
                  title="Manage Categories"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              
              <input
                type="datetime-local"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                className="bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none"
              />
            </div>
            
            <div>
              <textarea
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="w-full bg-black/20 border border-border-subtle rounded-none px-4 py-3 text-[#E6EDF3] placeholder:text-[#8B949E] focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none resize-none"
                placeholder="Add more details..."
              />
            </div>
            
            {/* Subtasks */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-teal" /> Subtasks
              </label>
              <div className="space-y-2 mb-2">
                {formData.sub_tasks.map((st: any) => (
                  <div key={st.id} className="flex items-center gap-3 p-2 bg-black/20 rounded-none group">
                    <button type="button" onClick={() => toggleSubtask(st.id)} className="shrink-0">
                      <AnimatedCheckbox checked={!!st.completed} className="w-5 h-5" />
                    </button>
                    <span className={`flex-1 text-sm ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
                      {st.title}
                    </span>
                    <button type="button" onClick={() => removeSubtask(st.id)} className="text-[#8B949E] opacity-0 group-hover:opacity-100 hover:text-red-400 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={handleAddSubtask}
                placeholder="Add a subtask (press Enter)"
                className="w-full bg-transparent border border-dashed border-[#8B949E]/50 rounded-none px-4 py-2 text-sm text-[#E6EDF3] placeholder:text-[#8B949E] focus:border-brand-teal focus:bg-black/20 outline-none transition-colors"
              />
            </div>
            
            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-white flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-brand-teal" /> Attachments
                </label>
                <label className="cursor-pointer text-xs font-semibold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-none transition-colors text-white">
                  {uploading ? 'Uploading...' : '+ Add File'}
                  <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
              
              {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {imageAttachments.map((img: any, idx: number) => (
                    <div key={idx} className="relative group rounded-none overflow-hidden border border-border-subtle w-24 h-24 bg-black/40">
                      <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center gap-1">
                        <p className="text-[9px] text-white truncate w-full">{img.filename}</p>
                        <button type="button" onClick={() => removeAttachment(formData.attachments.indexOf(img))} className="p-1 bg-red-500/80 rounded-none hover:bg-red-500 text-white">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {fileAttachments.length > 0 && (
                <div className="space-y-2">
                  {fileAttachments.map((file: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/20 border border-border-subtle rounded-none">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={getFileIconUrl(file.filename?.split('.').pop())} alt="file" className="w-5 h-5 shrink-0 object-contain drop-shadow-sm" onError={(e) => e.currentTarget.src = 'https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/default_file.svg'} />
                        <span className="text-sm text-[#E6EDF3] truncate">{file.filename}</span>
                      </div>
                      <button type="button" onClick={() => removeAttachment(formData.attachments.indexOf(file))} className="text-[#8B949E] hover:text-red-400 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.05]">
              <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-2">Assigned To</label>
              <select
                value={formData.assigned_to_id || ''}
                onChange={e => setFormData({...formData, assigned_to_id: e.target.value ? parseInt(e.target.value) : ''})}
                className="w-full bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none mb-4"
              >
                <option value="">-- Select Staff --</option>
                {staffList?.map((staff: any) => (
                  <option key={staff.id} value={staff.id}>{staff.first_name} {staff.last_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/[0.05]">
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Assigned Staff</label>
                <div className="flex flex-wrap gap-2">
                  {staffList?.map((staff: any) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => toggleStaff(staff.id)}
                      className={`px-3 py-1.5 rounded-none text-xs font-semibold transition-all border ${formData.staff_ids.includes(staff.id) ? 'bg-brand-teal/20 border-brand-teal/50 text-brand-teal' : 'bg-black/20 border-white/[0.05] text-[#8B949E] hover:border-white/[0.1]'}`}
                    >
                      {staff.first_name} {staff.last_name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Assigned Clients</label>
                <div className="flex flex-wrap gap-2">
                  {clientList?.map((client: any) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => toggleClient(client.id)}
                      className={`px-3 py-1.5 rounded-none text-xs font-semibold transition-all border ${formData.client_ids.includes(client.id) ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-black/20 border-white/[0.05] text-[#8B949E] hover:border-white/[0.1]'}`}
                    >
                      {client.first_name} {client.last_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 mt-2 border-t border-white/[0.05] flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-1.5 font-medium text-white hover:bg-white/5 rounded-none transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-brand-teal text-white font-semibold rounded-none hover:bg-brand-teal/90 shadow-sm transition-colors text-sm">
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
