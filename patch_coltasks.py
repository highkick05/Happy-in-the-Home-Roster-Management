import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("const colTasks = tasks.filter(t => col.id === 'null' ? !t.category_id : t.category_id === col.id);", "const colTasks = tasks.filter(t => t.category_id === col.id);")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
