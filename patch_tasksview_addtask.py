import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("category_id: col.id === 'null' ? '' : col.id", "category_id: col.id")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
