import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace("rounded hover:bg-red-500", "rounded-none hover:bg-red-500")
code = code.replace("rounded-full text-xs font-semibold", "rounded-none text-xs font-semibold")

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
