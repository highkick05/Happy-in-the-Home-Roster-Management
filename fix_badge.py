import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''          {task.assigned_to_id && (task.status === 'In Progress' || task.status === 'Done') ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/10 text-[#E6EDF3]">
              {task.assigned_first_name} {task.assigned_last_name}
            </span>
          ) : null}''',
'''          {(task.assigned_to_id || (task.staff && task.staff.length > 0)) && (task.status === 'In Progress' || task.status === 'Done') ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-white/10 text-[#E6EDF3]">
              {task.assigned_to_id ? `${task.assigned_first_name} ${task.assigned_last_name}` : task.staff[0].name}
            </span>
          ) : null}'''
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
