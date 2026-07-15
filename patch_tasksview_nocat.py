import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace("{[{id: 'null', name: 'No Category', color_hex: '#8B949E'}, ...categories].map(col => {", "{categories.map(col => {")

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
