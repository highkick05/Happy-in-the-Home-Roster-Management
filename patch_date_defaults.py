import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = re.sub(r'const \[dateFrom, setDateFrom\] = useState<string>\(\(\) => \{[^}]+\}\);', "const [dateFrom, setDateFrom] = useState<string>('');", code)
code = re.sub(r'const \[dateTo, setDateTo\] = useState<string>\(\(\) => \{[^}]+\}\);', "const [dateTo, setDateTo] = useState<string>('');", code)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
