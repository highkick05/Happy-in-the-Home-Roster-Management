import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}", "onDelete={(editingTask && editingTask.id) ? () => handleDeleteTask(editingTask.id) : undefined}")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
