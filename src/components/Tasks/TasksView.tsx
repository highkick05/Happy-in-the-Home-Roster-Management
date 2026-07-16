import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Settings2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { TaskCard, TaskModal } from './TaskCard';
import CustomDatePicker from '../ui/CustomDatePicker';


export default function TasksView() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [clientList, setClientList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
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
    const { source, destination, draggableId, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'category') {
      const newCategories = Array.from(categories);
      const [removed] = newCategories.splice(source.index, 1);
      newCategories.splice(destination.index, 0, removed);
      setCategories(newCategories);

      try {
        await fetch('/api/tasks/categories/order', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ categoryIds: newCategories.map((c: any) => c.id) })
        });
        fetchData();
      } catch (err) {
        console.error(err);
        fetchData();
      }
      return;
    }

    const newCategoryId = destination.droppableId === 'null' ? null : parseInt(destination.droppableId, 10);
    const taskId = parseInt(draggableId, 10);

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, category_id: newCategoryId } : t));

    try {
      await fetch(`/api/tasks/${taskId}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_id: newCategoryId })
      });
      fetchData();
    } catch (err) {
      console.error(err);
      fetchData(); // Revert on failure
    }
  };


  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
    const updatedTask = {
      ...task,
      status: newStatus,
      staff_ids: task.staff?.map((s: any) => s.id) || task.assigned_staff_parsed || [],
      client_ids: task.clients?.map((c: any) => c.id) || task.assigned_clients_parsed || []
    };
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleToggleSubtask = async (task: any, subtaskId: number) => {
    const updatedSubTasks = (task.sub_tasks || []).map((st: any) => st.id === subtaskId ? { ...st, completed: st.completed ? 0 : 1 } : st);
    const updatedTask = {
      ...task,
      sub_tasks: updatedSubTasks,
      staff_ids: task.staff?.map((s: any) => s.id) || task.assigned_staff_parsed || [],
      client_ids: task.clients?.map((c: any) => c.id) || task.assigned_clients_parsed || []
    };
    
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedTask)
      });
      if (!res.ok) throw new Error('Failed to update task');
      fetchData();
    } catch (err) {
      console.error(err);
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-2 pb-0 bg-transparent shrink-0">
        <div className="flex items-center">
          <button onClick={() => setIsCategoryModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-[#8B949E] hover:text-white bg-transparent hover:bg-white/5 border border-white/10 rounded-none transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
            Categories
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="active" className="bg-[#1A2332]">Active Tasks</option>
          <option value="done" className="bg-[#1A2332]">Done</option>
          <option value="all" className="bg-[#1A2332]">All Statuses</option>
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">All Staff</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id} className="bg-[#1A2332]">{s.first_name} {s.last_name}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-transparent border-b border-white/10 hover:border-white/30 text-[11px] text-[#8B949E] hover:text-white px-0 py-1 rounded-none outline-none transition-colors cursor-pointer appearance-none">
          <option value="all" className="bg-[#1A2332]">All Clients</option>
          {clientList.map((c: any) => <option key={c.id} value={c.id} className="bg-[#1A2332]">{c.first_name} {c.last_name}</option>)}
        </select>
        <div className="flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 transition-colors pb-0.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">From:</span>
          <div className="w-24">
            <CustomDatePicker 
              value={dateFrom} 
              onChange={(e: any) => setDateFrom(e.target ? e.target.value : '')}
              className="bg-transparent text-[11px] text-[#8B949E] hover:text-white px-0 outline-none w-full cursor-pointer h-full border-none"
              position="bottom"
              align="right"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-b border-white/10 hover:border-white/30 transition-colors pb-0.5">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider font-semibold">To:</span>
          <div className="w-24">
            <CustomDatePicker 
              value={dateTo} 
              onChange={(e: any) => setDateTo(e.target ? e.target.value : '')}
              className="bg-transparent text-[11px] text-[#8B949E] hover:text-white px-0 outline-none w-full cursor-pointer h-full border-none"
              position="bottom"
              align="right"
            />
          </div>
        </div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
        {loading ? (
          <div className="text-center text-[#8B949E] mt-10">Loading...</div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" type="category" direction="horizontal">
              {(provided) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps} 
                  className="flex h-full gap-3 items-start min-w-max"
                >
                  {categories.map((col: any, index: number) => {
                    const colTasks = tasks.filter(t => {
                    if (t.category_id !== col.id) return false;
                    
                    if (filterStatus === 'active' && t.status === 'Done') return false;
                    if (filterStatus === 'done' && t.status !== 'Done') return false;
                    
                    if (filterStaff !== 'all') {
                      const hasStaff = (t.staff && t.staff.some((s:any) => s.id.toString() === filterStaff)) || (t.assigned_to_id && t.assigned_to_id.toString() === filterStaff);
                      if (!hasStaff) return false;
                    }
                    
                    if (filterClient !== 'all') {
                      const hasClient = t.clients && t.clients.some((c:any) => c.id.toString() === filterClient);
                      if (!hasClient) return false;
                    }

                    if (dateFrom && t.created_at) {
                      if (new Date(t.created_at) < new Date(dateFrom)) return false;
                    }
                    
                    if (dateTo && t.created_at) {
                      const toDate = new Date(dateTo);
                      toDate.setHours(23, 59, 59, 999);
                      if (new Date(t.created_at) > toDate) return false;
                    }

                    return true;
                  });
                    return (
                      <Draggable key={col.id} draggableId={`category-${col.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.draggableProps} 
                            className={`flex flex-col w-[300px] max-h-full ${snapshot.isDragging ? 'opacity-80' : ''}`}
                          >
                            <div className="flex flex-col mb-2 px-1" {...provided.dragHandleProps}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-none" style={{ backgroundColor: col.color_hex }}></div>
                                  <h2 className="font-bold text-[14px] text-white tracking-widest uppercase font-sans drop-shadow-sm">{col.name}</h2>
                                  <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-none text-[#8B949E]">
                                    {colTasks.length}
                                  </span>
                                </div>
                              </div>
                              <button onClick={() => { setEditingTask({ category_id: col.id }); setIsModalOpen(true); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-[#8B949E] bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] rounded-none transition-colors">
                                <Plus className="w-3 h-3" />
                                Add task
                              </button>
                            </div>
                            
                            <Droppable droppableId={String(col.id)} type="task">
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`flex-1 overflow-y-auto rounded-none p-1 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-transparent border-transparent'}`}
                                >
                                  {colTasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                      {(provided, snapshot) => (
                                        <TaskCard
                                          task={task}
                                          provided={provided}
                                          snapshot={snapshot}
                                          onEdit={() => { setEditingTask(task); setIsModalOpen(true); }}
                                          onToggleSubtask={handleToggleSubtask}
                                          onToggleTaskStatus={handleToggleTaskStatus}
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
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
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
          onManageCategories={() => { setIsModalOpen(false); setIsCategoryModalOpen(true); }}
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
      <div className="bg-brand-navy border border-border-subtle rounded-none w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-black/20">
          <h2 className="text-lg font-bold text-white">Manage Categories</h2>
          <button onClick={onClose} className="p-2 text-[#8B949E] hover:text-white rounded-none hover:bg-white/[0.04]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="color"
              value={colorHex}
              onChange={e => setColorHex(e.target.value)}
              className="w-10 h-10 rounded-none cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Category name..."
              className="flex-1 bg-black/20 border border-border-subtle rounded-none px-3 py-2 text-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal outline-none"
            />
            <button type="submit" className="px-4 py-2 bg-brand-teal text-white font-semibold rounded-none hover:bg-brand-teal/90">
              Add
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {categories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-black/20 border border-border-subtle rounded-none">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color_hex }} />
                  <span className="font-medium">{c.name}</span>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-[#8B949E] hover:text-red-400 p-1 rounded-none hover:bg-red-400/10">
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
