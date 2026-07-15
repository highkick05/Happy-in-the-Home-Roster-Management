import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("if (editingTask) {", "if (editingTask && editingTask.id) {")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
