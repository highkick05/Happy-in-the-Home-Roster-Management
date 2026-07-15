import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

badge_code = """      <div className="mb-2">
        {task.status === 'In Progress' && safeStaff.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
            <span>In Progress</span>
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[7px] border border-indigo-500/50" title={safeStaff[0].name}>
              {safeStaff[0].name.substring(0,2).toUpperCase()}
            </span>
          </span>
        ) : (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
            {task.status || 'To Do'}
          </span>
        )}
      </div>"""

# Find the existing badge code
# <div className="mb-2">
#   <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
#     {task.status || 'To Do'}
#   </span>
# </div>

old_badge_pattern = re.compile(r'<div className="mb-2">\s*<span className={`text-\[9px\].*?</span>\s*</div>', re.DOTALL)

code = old_badge_pattern.sub(badge_code, code)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
