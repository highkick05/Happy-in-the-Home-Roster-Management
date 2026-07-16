import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("bg-transparent border-b border-transparent hover:border-white/20", "bg-transparent border-b border-white/10 hover:border-white/30")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
