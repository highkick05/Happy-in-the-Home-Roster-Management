import re

with open("src/server.ts", "r") as f:
    code = f.read()

# I added `app.get('/api/test/dump-shifts', ...)`
start_idx = code.find("app.get('/api/test/dump-shifts'")
if start_idx != -1:
    end_idx = code.find("});", start_idx) + 3
    code = code[:start_idx] + code[end_idx:]

start_idx_old = code.find("app.get('/api/test/hc-recalculate-old'")
if start_idx_old != -1:
    end_idx_old = code.find("});", start_idx_old) + 3
    code = code[:start_idx_old] + code[end_idx_old:]

with open("src/server.ts", "w") as f:
    f.write(code)
print("Removed debug endpoints.")
