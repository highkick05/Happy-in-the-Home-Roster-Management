import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace("\\'", "'")

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
