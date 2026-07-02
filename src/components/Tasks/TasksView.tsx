import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, Circle, Clock, Users, User, Calendar as CalendarIcon, ChevronDown, ChevronRight, X, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type SubTask = {
  id?: number;
  task_id?: number;
  title: string;
  completed: number | boolean;
};

type Task = {
  id: number;
  title: string;
  description: string;
  status: 'Active' | 'In-Progress' | 'Completed';
  start_date: string | null;
  end_date: string | null;
  assigned_staff: string; // JSON string
  assigned_clients: string; // JSON string
  created_at: string;
  sub_tasks: SubTask[];
};

export default function TasksView() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'In-Progress' | 'Completed'>('Active');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchStaffAndClients();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch tasks: ${res.status} ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndClients = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (!sRes.ok || !cRes.ok) throw new Error('Failed to fetch staff or clients');
      const sData = await sRes.json();
      const cData = await cRes.json();
      setStaffList(sData);
      setClientList(cData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to complete task');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const toggleSubTask = async (subtaskId: number, currentCompleted: boolean) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      if (!res.ok) throw new Error('Failed to toggle subtask');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const addSubTask = async (taskId: number, title: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed to add subtask');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const deleteSubTask = async (subtaskId: number) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete subtask');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      let res;
      if (editingTask) {
        res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(taskData)
        });
      } else {
        res = await fetch(`/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(taskData)
        });
      }
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save task: ${res.status} ${errText}`);
      }

      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

  const filteredTasks = tasks.filter(t => t.status === activeTab);

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      {/* Header */}
      <div className="flex-none p-4 border-b border-border-subtle bg-brand-navy flex items-center justify-between">
        <div className="flex space-x-1">
          {['Active', 'In-Progress', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-brand-teal text-white' : 'text-[#8B949E] hover:text-white hover:bg-white/[0.04]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="flex items-center px-3 py-1.5 bg-brand-teal text-white text-sm font-semibold rounded-md hover:bg-brand-teal/90 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Task
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-[#8B949E] py-10">Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center text-[#8B949E] py-10 bg-brand-navy/50 rounded-lg border border-border-subtle">
            No {activeTab.toLowerCase()} tasks found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                onDelete={() => handleDelete(task.id)}
                onComplete={() => handleComplete(task.id)}
                onToggleSubTask={toggleSubTask}
                onAddSubTask={addSubTask}
                onDeleteSubTask={deleteSubTask}
                staffList={staffList}
                clientList={clientList}
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          staffList={staffList}
          clientList={clientList}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onComplete, onToggleSubTask, onAddSubTask, onDeleteSubTask, staffList, clientList }: any) {
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
    <div className="bg-brand-navy border border-border-subtle rounded-lg flex flex-col hover:border-brand-teal/50 transition-colors">
      <div className="p-3 pb-2 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-[#E6EDF3] font-semibold text-sm leading-snug">{task.title}</h3>
          <div className="flex space-x-1 shrink-0 ml-2">
            {task.status !== 'Completed' && (
              <button onClick={onComplete} title="Complete Task" className="p-1 text-[#8B949E] hover:text-brand-green transition-colors">
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onEdit} className="p-1 text-[#8B949E] hover:text-white transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1 text-[#8B949E] hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {task.description && (
          <p className="text-[#8B949E] text-xs mb-3 line-clamp-2 leading-relaxed flex-1">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-auto text-xs text-[#8B949E]">
          {(task.start_date || task.end_date) && (
            <div className="flex items-center space-x-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-brand-teal" />
              <span>
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
      </div>
      
      <div className="border-t border-border-subtle bg-black/20 rounded-b-lg">
        {task.sub_tasks?.length > 0 && (
          <div className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-[#8B949E]">
            <span>Progress ({task.sub_tasks.filter((st:any) => st.completed).length}/{task.sub_tasks.length})</span>
            <div className="w-24 h-1.5 bg-brand-navy rounded-full overflow-hidden">
              <div className="h-full bg-brand-teal rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        
        <div className="px-3 pb-3 pt-1 space-y-1.5">
          {task.sub_tasks?.map((st: any) => (
            <div 
              key={st.id || Math.random()} 
              className="flex items-start justify-between space-x-2 group"
            >
              <div className="flex items-start space-x-2 cursor-pointer flex-1" onClick={() => st.id && onToggleSubTask(st.id, !!st.completed)}>
                <button className={`shrink-0 mt-0.5 ${st.completed ? 'text-brand-green' : 'text-[#8B949E] group-hover:text-white'}`}>
                  {st.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
                <span className={`text-xs ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
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
    </div>
  );
}

function TaskModal({ task, onClose, onSave, staffList, clientList }: any) {
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
                <option value="In-Progress">In-Progress</option>
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

        <div className="p-4 border-t border-border-subtle flex justify-end space-x-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#8B949E] hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-brand-teal text-white text-sm font-semibold rounded-lg hover:bg-brand-teal/90 transition-colors">
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
