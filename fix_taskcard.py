import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''      <div className="flex flex-col p-3 flex-1">
            <div className="mb-2">
        {task.assigned_to_id ? (
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
        )}
      </div>''',
'''      <div className="flex flex-col p-3 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${task.status === 'Done' ? 'bg-zinc-500/20 text-zinc-400' : task.status === 'In Progress' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-brand-teal/20 text-brand-teal'}`}>
            {task.status || 'To Do'}
          </span>
          {task.assigned_to_id && (task.status === 'In Progress' || task.status === 'Done') ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/10 text-[#E6EDF3]">
              {task.assigned_first_name} {task.assigned_last_name}
            </span>
          ) : null}
        </div>'''
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
