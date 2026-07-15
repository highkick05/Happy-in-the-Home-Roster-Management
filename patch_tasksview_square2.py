import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace('className="w-10 h-10 rounded cursor-pointer border-0 p-0"', 'className="w-10 h-10 rounded-none cursor-pointer border-0 p-0"')
code = code.replace('className="text-[#8B949E] hover:text-red-400 p-1 rounded hover:bg-red-400/10"', 'className="text-[#8B949E] hover:text-red-400 p-1 rounded-none hover:bg-red-400/10"')

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
