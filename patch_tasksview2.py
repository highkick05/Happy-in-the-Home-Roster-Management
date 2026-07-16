import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Make the categories Droppable and Draggable
# We will replace the children of DragDropContext

categories_container_pattern = re.compile(r'(<DragDropContext onDragEnd=\{onDragEnd\}>)\s*<div className="flex h-full gap-3 items-start min-w-max">\s*\{categories\.map\(col => \{\s*const colTasks = tasks\.filter\(t => t\.category_id === col\.id\);\s*return \(\s*<div key=\{col\.id\} className="flex flex-col w-\[300px\] max-h-full">(.*?)\n\s*</Droppable>\s*</div>\s*\);\s*\}\)\}\s*</div>', re.DOTALL)

def replace_categories(match):
    inner_content = match.group(2)
    return f'''<DragDropContext onDragEnd={{onDragEnd}}>
            <Droppable droppableId="board" type="category" direction="horizontal">
              {{(provided) => (
                <div 
                  ref={{provided.innerRef}} 
                  {{...provided.droppableProps}} 
                  className="flex h-full gap-3 items-start min-w-max"
                >
                  {{categories.map((col: any, index: number) => {{
                    const colTasks = tasks.filter(t => t.category_id === col.id);
                    return (
                      <Draggable key={{col.id}} draggableId={{`category-${{col.id}}`}} index={{index}}>
                        {{(provided, snapshot) => (
                          <div 
                            ref={{provided.innerRef}} 
                            {{...provided.draggableProps}} 
                            className={{`flex flex-col w-[300px] max-h-full ${{snapshot.isDragging ? 'opacity-80' : ''}}`}}
                          >
                            <div className="flex flex-col mb-2 px-1" {{...provided.dragHandleProps}}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-none" style={{{{ backgroundColor: col.color_hex }}}}></div>
                                  <h2 className="font-bold text-[14px] text-white tracking-widest uppercase font-sans drop-shadow-sm">{{col.name}}</h2>
                                  <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-none text-[#8B949E]">
                                    {{colTasks.length}}
                                  </span>
                                </div>
                              </div>
                              <button onClick={{() => {{ setEditingTask({{ category_id: col.id }}); setIsModalOpen(true); }}}} className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-[#8B949E] bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] rounded-none transition-colors">
                                <Plus className="w-3 h-3" />
                                Add task
                              </button>
                            </div>
                            
                            <Droppable droppableId={{String(col.id)}} type="task">
                              {{(provided, snapshot) => (
                                <div
                                  ref={{provided.innerRef}}
                                  {{...provided.droppableProps}}
                                  className={{`flex-1 overflow-y-auto rounded-none p-1 min-h-[150px] transition-colors ${{snapshot.isDraggingOver ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-transparent border-transparent'}}`}}
                                >
                                  {{colTasks.map((task, index) => (
                                    <Draggable key={{task.id}} draggableId={{String(task.id)}} index={{index}}>
                                      {{(provided, snapshot) => (
                                        <TaskCard
                                          task={{task}}
                                          provided={{provided}}
                                          snapshot={{snapshot}}
                                          onEdit={{() => {{ setEditingTask(task); setIsModalOpen(true); }}}}
                                          onToggleSubtask={{handleToggleSubtask}}
                                          wallboardMode={{false}}
                                        />
                                      )}}
                                    </Draggable>
                                  ))}}
                                  {{provided.placeholder}}
                                </div>
                              )}}
                            </Droppable>
                          </div>
                        )}}
                      </Draggable>
                    );
                  }})}}
                  {{provided.placeholder}}
                </div>
              )}}
            </Droppable>'''

code = categories_container_pattern.sub(replace_categories, code)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
