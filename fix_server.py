import sys

with open('src/server.ts', 'r') as f:
    code = f.read()

code = code.replace("const client = db.prepare(\"SELECT first_name, last_name FROM clients WHERE id = ?\").get(parseInt(clientId));", "const client = db.prepare(\"SELECT first_name, last_name FROM clients WHERE id = ?\").get(parseInt(clientId)) as any;")
code = code.replace("(req).user?.id", "(req as any).user?.id")

with open('src/server.ts', 'w') as f:
    f.write(code)
