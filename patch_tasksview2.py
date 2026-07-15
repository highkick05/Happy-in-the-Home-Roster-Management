import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

# Make Header more compact
code = re.sub(
    r'<div className="flex-none px-6 py-4 flex items-center justify-between border-b border-border-subtle bg-brand-navy">',
    r'<div className="flex-none px-4 py-2 flex items-center justify-between border-b border-border-subtle bg-brand-navy">',
    code
)

code = re.sub(
    r'<h1 className="text-xl font-bold tracking-tight">Kanban Board</h1>',
    r'<h1 className="text-lg font-bold tracking-tight text-white">Kanban Board</h1>',
    code
)

code = re.sub(
    r'<div className="flex-1 overflow-x-auto overflow-y-hidden p-6">',
    r'<div className="flex-1 overflow-x-auto overflow-y-hidden p-3">',
    code
)

code = re.sub(
    r'<div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6 items-start min-w-\[700px\]">',
    r'<div className="grid grid-cols-1 md:grid-cols-3 h-full gap-3 items-start min-w-[700px]">',
    code
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
