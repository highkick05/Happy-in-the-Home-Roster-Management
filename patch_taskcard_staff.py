import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace the status badge logic
status_pattern = re.compile(r'\{task\.status === \'In Progress\' && safeStaff\.length > 0 \? \(\s*<span className="inline-flex items-center gap-1\.5 bg-indigo-500/20 text-indigo-400 text-\[9px\] font-bold px-1\.5 py-0\.5 rounded-sm uppercase tracking-wider">\s*<span>In Progress</span>\s*<span className="w-3\.5 h-3\.5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-\[7px\] border border-indigo-500/50" title=\{safeStaff\[0\]\.name\}>\s*\{safeStaff\[0\]\.name\.substring\(0,2\)\.toUpperCase\(\)\}\s*</span>\s*</span>\s*\) : \(\s*<span className=\{\`text-\[9px\] font-bold px-1\.5 py-0\.5 rounded-sm uppercase tracking-wider \$\{task\.status === \'Done\' \? \'bg-zinc-500/20 text-zinc-400\' : task\.status === \'In Progress\' \? \'bg-indigo-500/20 text-indigo-400\' : \'bg-brand-teal/20 text-brand-teal\'\}\`\}>\s*\{task\.status \|\| \'To Do\'\}\s*</span>\s*\)\}', re.DOTALL)

new_status = """{task.assigned_to_id ? (
          <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
            <span>{task.status || 'To Do'}</span>
            <span className="w-3.5 h-3.5 rounded-full bg-white/10 text-white flex items-center justify-center text-[7px] border border-white/20" title={`${task.assigned_first_name} ${task.assigned_last_name}`}>
              {task.assigned_first_name?.substring(0,1).toUpperCase()}{task.assigned_last_name?.substring(0,1).toUpperCase()}
            </span>
          </span>
        ) : (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
            {task.status || 'To Do'}
          </span>
        )}"""

code = status_pattern.sub(new_status, code)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
