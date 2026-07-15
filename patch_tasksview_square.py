import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("rounded-xl", "rounded-none")
code = code.replace("rounded-lg", "rounded-none")
code = code.replace("rounded-md", "rounded-none")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
