import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

old_header = """      <div className="flex-none px-4 py-2 flex items-center justify-between border-b border-border-subtle bg-brand-navy">
        <h1 className="text-lg font-bold tracking-tight text-white">Kanban Board</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-[#8B949E] bg-black/20 border border-white/[0.05] rounded-none hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Categories
          </button>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 text-sm font-semibold bg-brand-teal text-white rounded-none hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>"""

new_header = """      <div className="flex-none px-3 py-2 flex items-center justify-between border-b border-border-subtle bg-brand-navy">
        <h1 className="text-sm font-bold tracking-tight text-white">Tasks</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-3 py-1 text-xs font-medium text-[#8B949E] bg-black/20 border border-white/[0.05] rounded-none hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Categories
          </button>
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-3 py-1 text-xs font-semibold bg-brand-teal text-white rounded-none hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Task
          </button>
        </div>
      </div>"""

code = code.replace(old_header, new_header)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
