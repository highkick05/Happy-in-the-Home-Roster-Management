import re

with open("src/server.ts", "r") as f:
    content = f.read()

target = "          WHERE (s.status IN ('COMPLETED', 'CANCELLED') OR s.is_historical = 1 OR s.notes LIKE '%[HISTORICAL]%') AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)"
replacement = "          WHERE (UPPER(s.status) IN ('COMPLETED', 'CANCELLED', 'HISTORICAL') OR s.notes LIKE '%[HISTORICAL]%') AND (s.notes != 'Manually generated invoice' OR s.notes IS NULL)"

if target in content:
    content = content.replace(target, replacement)
    with open("src/server.ts", "w") as f:
        f.write(content)
    print("Fixed query.")
else:
    print("Not found.")
