import re

with open("src/server.ts", "r") as f:
    code = f.read()

code = code.replace('const categories = db.prepare("SELECT * FROM task_categories").all();', 'const categories = db.prepare("SELECT * FROM task_categories ORDER BY sort_order ASC, id ASC").all();')

with open("src/server.ts", "w") as f:
    f.write(code)
