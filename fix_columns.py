with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace('<div className="flex h-full gap-6 items-start">', '<div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6 items-start min-w-[700px]">')
code = code.replace('<div key={col} className="flex flex-col w-[320px] shrink-0 max-h-full">', '<div key={col} className="flex flex-col w-full max-h-full">')

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
