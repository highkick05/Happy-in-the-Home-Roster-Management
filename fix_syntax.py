import re
with open("src/server.ts", "r") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if 3476 <= i <= 3477:
        continue
    new_lines.append(line)

with open("src/server.ts", "w") as f:
    f.writelines(new_lines)
