import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, Circle, Clock, Users, User, Calendar as CalendarIcon, ChevronDown, ChevronRight, X, UserCircle2, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { TaskCard, TaskModal } from './TaskCard';

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
  status: 'Active' | 'Completed';
  start_date: string | null;
  end_date: string | null;
  sort_order?: number;
  assigned_staff: string; // JSON string
  assigned_clients: string; // JSON string
  created_at: string;
  is_important?: number;
  sub_tasks: SubTask[];
};


function DraggableTask({ task, setEditingTask, setIsModalOpen, handleDelete, handleComplete, toggleSubTask, addSubTask, deleteSubTask, handleToggleImportant, staffList, clientList, handleDragEnd }: any) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item value={task} dragListener={false} dragControls={dragControls} onDragEnd={handleDragEnd}>
      <TaskCard
        task={task}
        dragControls={dragControls}
        onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
        onDelete={() => handleDelete(task.id)}
        onComplete={() => handleComplete(task.id)}
        onToggleSubTask={toggleSubTask}
        onAddSubTask={addSubTask}
        onDeleteSubTask={deleteSubTask}
        onToggleImportant={() => handleToggleImportant(task.id)}
        staffList={staffList}
        clientList={clientList}
      />
    </Reorder.Item>
  );
}

export default function TasksView() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');
  const [localDisplayTasks, setLocalDisplayTasks] = useState<Task[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: quickTaskTitle, status: 'Active' })
      });
      if (!res.ok) throw new Error('Failed to create task');
      setQuickTaskTitle('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };

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
      if (editingTask?.id === id) {
        setIsModalOpen(false);
        setEditingTask(null);
      }
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

  const handleToggleImportant = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}/important`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle important task');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(String(err));
    }
  };


  const handleReorder = (newOrder: Task[]) => {
    setLocalDisplayTasks(newOrder);
  };

  useEffect(() => {
    const filtered = tasks.filter(t => t.status === activeTab).sort((a, b) => {
      if (a.is_important !== b.is_important) {
        return (b.is_important || 0) - (a.is_important || 0);
      }
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return b.id - a.id;
    });
    setLocalDisplayTasks(filtered);
  }, [tasks, activeTab]);

  const handleDragEnd = async () => {
    const reorderedWithSortOrder = localDisplayTasks.map((t, index) => ({ ...t, sort_order: index }));
    setTasks(prev => prev.map(t => {
      const match = reorderedWithSortOrder.find(r => r.id === t.id);
      return match ? match : t;
    }));

    try {
      await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tasks: reorderedWithSortOrder.map(t => ({ id: t.id, sort_order: t.sort_order })) })
      });
    } catch(err) {
      console.error(err);
    }
  };

  

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      {/* Header */}
      <div className="flex-none px-4 pt-4 pb-1">
        <div className="bg-brand-navy border border-border-subtle rounded-xl flex items-center justify-between p-1.5 shadow-sm">
          <div className="flex space-x-1">
            {['Active', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 text-[13px] font-medium tracking-tight rounded-lg transition-colors ${activeTab === tab ? 'bg-brand-teal/20 text-brand-teal' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/[0.02]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-1.5 bg-brand-teal text-white text-[13px] font-medium tracking-tight rounded-lg hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        {loading ? (
          <div className="text-center text-[#8B949E] py-10">Loading...</div>
        ) : localDisplayTasks.length === 0 ? (
          <div className="text-center text-[#8B949E] py-10 bg-brand-navy/50 rounded-lg border border-border-subtle">
            No {activeTab.toLowerCase()} tasks found.
          </div>
        ) : (
          <Reorder.Group values={localDisplayTasks} onReorder={handleReorder} className="flex flex-col gap-2">
            {localDisplayTasks.map(task => (
              <DraggableTask
                key={task.id}
                task={task}
                setEditingTask={setEditingTask}
                setIsModalOpen={setIsModalOpen}
                handleDelete={handleDelete}
                handleComplete={handleComplete}
                toggleSubTask={toggleSubTask}
                addSubTask={addSubTask}
                deleteSubTask={deleteSubTask}
                handleToggleImportant={handleToggleImportant}
                staffList={staffList}
                clientList={clientList}
                handleDragEnd={handleDragEnd}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Quick Add Task */}
      <div className="flex-none p-4 pt-0">
        <form onSubmit={handleQuickAddTask} className="max-w-3xl mx-auto relative group">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder="Quick add a task..."
            className="w-full bg-brand-navy border border-border-subtle rounded-xl py-3 pl-5 pr-12 text-[14px] text-[#E6EDF3] placeholder:text-[#8B949E] focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all shadow-sm group-hover:border-brand-teal/50"
          />
          <button
            type="submit"
            disabled={!quickTaskTitle.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-brand-teal text-white rounded-lg hover:bg-brand-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-teal"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          staffList={staffList}
          clientList={clientList}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={handleSaveTask}
          onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
        />
      )}
    </div>
  );
}

