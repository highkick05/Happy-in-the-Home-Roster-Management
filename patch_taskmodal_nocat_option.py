import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace('<option value="">No Category</option>', '')

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
