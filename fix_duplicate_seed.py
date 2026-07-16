import re

with open("src/server.ts", "r") as f:
    code = f.read()

seed_code = """  try {
    const existingCats = db.prepare("SELECT COUNT(\*) as count FROM task_categories").get() as any;
.*?
    console\.warn\("Migration warning for task_categories seed:", e\.message\);
  \}"""

# find all matches
matches = re.findall(seed_code, code, flags=re.DOTALL)
if len(matches) > 1:
    # replace the first one with empty string
    code = code.replace(matches[0], "", 1)
    
with open("src/server.ts", "w") as f:
    f.write(code)
