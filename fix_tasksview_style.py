import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Update the droppable column area
code = code.replace(
'''<Droppable droppableId={col}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto rounded-xl p-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.03]' : 'bg-transparent'}`}
                        >''',
'''<Droppable droppableId={col}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto rounded-xl p-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.05] border border-white/[0.05]' : 'bg-black/10 border border-transparent'}`}
                        >'''
)

code = code.replace(
'''<div className="flex items-center justify-between mb-4 px-2">
                      <h2 className="font-semibold text-[15px] tracking-tight">{col}</h2>
                      <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full text-[#8B949E]">
                        {colTasks.length}
                      </span>
                    </div>''',
'''<div className="flex items-center justify-between mb-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col === 'Done' ? 'bg-brand-green' : col === 'In Progress' ? 'bg-amber-400' : 'bg-brand-teal'}`} />
                        <h2 className="font-semibold text-[14px] text-white tracking-wide uppercase">{col}</h2>
                      </div>
                      <span className="text-xs font-bold bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[#8B949E]">
                        {colTasks.length}
                      </span>
                    </div>'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
