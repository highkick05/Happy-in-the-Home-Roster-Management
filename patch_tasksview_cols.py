import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Remove COLUMNS
code = re.sub(r'const COLUMNS = \[\'To Do\', \'In Progress\', \'Done\'\];\n', '', code)

# Fix onDragEnd
old_dragend = """  const onDragEnd = async (result: any) => {
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
  };"""

new_dragend = """  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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
  };"""

code = code.replace(old_dragend, new_dragend)

# Fix header and grid
old_header = """    <div className="flex flex-col h-full bg-brand-bg text-[#E6EDF3]">
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[#8B949E]">Loading tasks...</div>
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
                        >"""

new_header = """    <div className="flex flex-col h-full bg-brand-bg text-[#E6EDF3]">
      <div className="flex-none px-4 py-1.5 flex items-center justify-between border-b border-border-subtle bg-brand-navy">
        <h1 className="text-sm font-semibold tracking-tight text-white">Tasks</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-3 py-1.5 text-xs font-medium bg-brand-teal text-white rounded-none hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Categories
          </button>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-3 py-1.5 text-xs font-semibold bg-brand-teal text-white rounded-none hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[#8B949E]">Loading tasks...</div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-3 items-start min-w-max">
              {[{id: 'null', name: 'No Category', color_hex: '#8B949E'}, ...categories].map(col => {
                const colTasks = tasks.filter(t => col.id === 'null' ? !t.category_id : t.category_id === col.id);
                return (
                  <div key={col.id} className="flex flex-col w-[300px] max-h-full bg-black/20 rounded-none p-2 border border-white/[0.02]">
                    <div className="flex flex-col mb-2 px-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-none" style={{ backgroundColor: col.color_hex }}></div>
                          <h2 className="font-semibold text-[13px] text-white tracking-wide uppercase">{col.name}</h2>
                          <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-none text-[#8B949E]">
                            {colTasks.length}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => { setEditingTask({ category_id: col.id === 'null' ? '' : col.id }); setIsModalOpen(true); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-[#8B949E] bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] rounded-none transition-colors">
                        <Plus className="w-3 h-3" />
                        Add task
                      </button>
                    </div>
                    
                    <Droppable droppableId={String(col.id)}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto rounded-none p-1 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-transparent border-transparent'}`}
                        >"""

code = code.replace(old_header, new_header)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
