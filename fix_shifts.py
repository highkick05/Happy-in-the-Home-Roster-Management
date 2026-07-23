import re

with open("src/server.ts", "r") as f:
    content = f.read()

content = content.replace("        client_id INTEGER NOT NULL,\n        staff_id INTEGER,", "        client_id INTEGER NOT NULL,")

with open("src/server.ts", "w") as f:
    f.write(content)
print("Fixed.")
