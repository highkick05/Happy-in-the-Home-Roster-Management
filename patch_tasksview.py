import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Make Header more Planner-like
code = re.sub(
    r'<div className="flex items-center justify-between mb-3 px-3">.*?<div className="flex items-center gap-2">.*?<div className=\{`w-2 h-2 rounded-full \$\{.*?\}\`\} />.*?<h2 className="font-semibold text-\[14px\] text-white tracking-wide uppercase">\{col\}</h2>.*?</div>.*?<span className="text-xs font-bold bg-white/5 border border-white/10 px-2\.5 py-0\.5 rounded-full text-\[\#8B949E\]">.*?\{colTasks\.length\}.*?</span>.*?</div>',
    r'''<div className="flex flex-col mb-2 px-1">
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
                    </div>''',
    code,
    flags=re.DOTALL
)

code = re.sub(
    r'className=\{`flex-1 overflow-y-auto rounded-xl p-3 min-h-\[150px\] transition-colors \$\{snapshot\.isDraggingOver \? \'bg-white/\[0\.05\] border border-white/\[0\.05\]\' : \'bg-black/10 border border-transparent\'\}`\}',
    r'className={`flex-1 overflow-y-auto rounded-xl p-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? \'bg-white/[0.03] border-white/[0.05]\' : \'bg-transparent border-transparent\'}`}',
    code
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
