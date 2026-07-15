import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = re.sub(
    r'<div key=\{col\} className="flex flex-col w-full max-h-full">',
    r'<div key={col} className="flex flex-col w-full max-h-full bg-black/20 rounded-xl p-2">',
    code
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
