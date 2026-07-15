import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Settings2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TaskCard, TaskModal } from './TaskCard';

const COLUMNS = ['To Do', 'In Progress', 'Done'];

export default function TasksView() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [tasksRes, catRes, staffRes, clientsRes] = await Promise.all([
        fetch('/api/tasks', { headers }),
        fetch('/api/task-categories', { headers }),
        fetch('/api/staff', { headers }),
        fetch('/api/clients', { headers })
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (staffRes.ok) setStaffList(await staffRes.json());
      if (clientsRes.ok) setClientList(await clientsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId, 10);

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error(err);
      fetchData(); // Revert on failure
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      let res;
      if (editingTask && editingTask.id) {
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
      if (!res.ok) throw new Error('Failed to save task');
      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg text-[#E6EDF3]">
      <div className="flex-none px-4 py-2 flex items-center justify-between border-b border-border-subtle bg-brand-navy">
        <h1 className="text-lg font-bold tracking-tight text-white">Kanban Board</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-[#8B949E] bg-black/20 border border-white/[0.05] rounded-lg hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Categories
          </button>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 text-sm font-semibold bg-brand-teal text-white rounded-lg hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        {loading ? (
          <div className="text-center text-[#8B949E] mt-10">Loading...</div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-3 items-start min-w-[700px]">
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col);
                return (
                  <div key={col} className="flex flex-col w-full max-h-full bg-black/20 rounded-xl p-2">
                    <div className="flex flex-col mb-2 px-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-[15px] text-white tracking-wide">{col}</h2>
                          <span className="text-xs font-medium text-[#8B949E]">
                            {colTasks.length}
                          </span>
                        </div>
                        <button className="text-[#8B949E] hover:text-white transition-colors p-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </button>
                      </div>
                      <button onClick={() => { setEditingTask({ status: col }); setIsModalOpen(true); }} className="flex items-center gap-2 w-full px-3 py-2 text-[14px] font-medium text-[#8B949E] bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        Add task
                      </button>
                    </div>
                    
                    <Droppable droppableId={col}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto rounded-xl p-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-transparent border-transparent'}`}
                        >
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(provided, snapshot) => (
                                <TaskCard
                                  task={task}
                                  provided={provided}
                                  snapshot={snapshot}
                                  onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                                  wallboardMode={false}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          staffList={staffList}
          clientList={clientList}
          categories={categories}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={(editingTask && editingTask.id) ? () => handleDeleteTask(editingTask.id) : undefined}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          categories={categories}
          token={token!}
          onClose={() => setIsCategoryModalOpen(false)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

function CategoryModal({ categories, token, onClose, onRefresh }: any) {
  const [name, setName] = useState('');
  const [colorHex, setColorHex] = useState('#14b8a6'); // Default teal

  const handleAdd = async (e: any) => {
    e.preventDefault();
    try {
      await fetch('/api/task-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, color_hex: colorHex })
      });
      setName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/task-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-brand-navy border border-border-subtle rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-black/20">
          <h2 className="text-lg font-bold text-white">Manage Categories</h2>
          <button onClick={onClose} className="p-2 text-[#8B949E] hover:text-white rounded-md hover:bg-white/[0.04]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="color"
              value={colorHex}
              onChange={e => setColorHex(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Category name..."
              className="flex-1 bg-black/20 border border-border-subtle rounded-lg px-3 py-2 text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90">
              Add
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {categories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-black/20 border border-border-subtle rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color_hex }} />
                  <span className="font-medium">{c.name}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-[#8B949E] hover:text-red-400 p-1 rounded hover:bg-red-400/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center text-[#8B949E] py-4 text-sm">No categories yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
