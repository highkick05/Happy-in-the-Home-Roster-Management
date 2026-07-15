import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace classes on the task card wrapper
code = code.replace(
    """className={`group relative flex flex-col p-0 bg-[#1E293B] hover:bg-[#273548] border border-border-subtle rounded-none shadow-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}""",
    """className={`group relative flex flex-col p-0 bg-[#1E293B] hover:bg-[#273548] shadow-md border border-black/20 rounded-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}"""
)

# Insert the badge just inside the card content, above the title and checkbox
badge_code = """      <div className="flex flex-col p-3 flex-1">
      <div className="mb-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
          {task.status || 'To Do'}
        </span>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">"""

code = code.replace(
    """      <div className="flex flex-col p-3 flex-1">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">""",
    badge_code
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
