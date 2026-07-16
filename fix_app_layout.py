import re

with open("src/App.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''${location.pathname.includes('/files') ? 'p-0' :''',
'''${location.pathname.includes('/files') || location.pathname.includes('/tasks') ? 'p-0' :'''
)

with open("src/App.tsx", "w") as f:
    f.write(code)
