with open("src/server.ts", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "DROP INDEX IF EXISTS" in line and "db.exec(" not in line:
        lines[i] = line.replace("DROP INDEX IF EXISTS", "db.exec(`DROP INDEX IF EXISTS")

with open("src/server.ts", "w") as f:
    f.writelines(lines)
