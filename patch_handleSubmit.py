import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = re.sub(
    r'const handleSubmit = \(e: React\.FormEvent\) => \{',
    r'const handleSubmit = (e: any) => {',
    code
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
