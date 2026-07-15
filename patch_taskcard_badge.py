import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace TaskCard rounded corners to rounded-none
code = code.replace("rounded-xl", "rounded-none")
code = code.replace("rounded-lg", "rounded-none")
code = code.replace("rounded-md", "rounded-none")

# Remove category badge
old_badge = """{task.category_name && (
            <span 
              className="text-[10px] font-medium px-2 py-0.5 rounded-none flex items-center gap-1.5"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.category_color }}></span>
              {task.category_name}
            </span>
          )}"""

code = code.replace(old_badge, "")

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
