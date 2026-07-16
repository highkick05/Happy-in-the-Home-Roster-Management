import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''<div className="flex flex-wrap items-center justify-end gap-4 px-4 pt-2 pb-2 bg-black/10 border-b border-border-subtle shrink-0">''',
'''<div className="flex flex-wrap items-center justify-end gap-4 px-6 pt-2 pb-0 bg-transparent shrink-0">'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
