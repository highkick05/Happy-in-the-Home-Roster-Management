import re

with open("src/server.ts", "r") as f:
    code = f.read()

# I want to find the first occurrence of:
#   app.delete('/api/tasks/:id' ...
# which I inserted. And then remove anything between it and `app.post('/api/tasks/:id/important'` that looks like broken braces.

pattern = re.compile(r"app\.delete\('/api/tasks/:id', authenticateTokenOrWallboard, \(req: any, res: any\) => \{.*?\s*\}\s*\);\s*\} catch \(error: any\) \{.*?\}\s*\);\s*app\.post\('/api/tasks/:id/important", re.DOTALL)

def repl(m):
    original = m.group(0)
    print("MATCHED:\n", original)
    return original.replace("} catch (error: any) {\n      console.error(\"Error completing task:\", error);\n      res.status(500).json({ error: error.message });\n    }\n  });", "")

code = re.sub(r"\}\s*catch \(error: any\) \{\s*console\.error\(\"Error completing task:\", error\);\s*res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\s*\}\);\s*", "", code)

with open("src/server.ts", "w") as f:
    f.write(code)
