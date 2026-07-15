import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Make Header more compact
code = re.sub(
    r'<div className="flex justify-between items-center mb-6">',
    r'<div className="flex justify-between items-center mb-3">',
    code
)

code = re.sub(
    r'<h1 className="text-2xl font-bold text-white">Kanban Board</h1>',
    r'<h1 className="text-lg font-bold text-white tracking-tight">Kanban Board</h1>',
    code
)

code = re.sub(
    r'<button onClick=\{.*?\} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center">',
    r'<button onClick={() => setIsCategoryModalOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-[#E6EDF3] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center">',
    code
)

code = re.sub(
    r'<button onClick=\{.*?\} className="bg-brand-teal hover:bg-brand-teal/90 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center shadow-sm">',
    r'<button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-brand-teal hover:bg-brand-teal/90 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center shadow-sm">',
    code
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
