with open("src/server.ts", "r") as f:
    code = f.read()

# find app.listen
import re
match = re.search(r'(app\.listen\(PORT, "0\.0\.0\.0", \(\) => {)', code)
if match:
    new_code = "  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));\n  " + match.group(1)
    code = code.replace(match.group(1), new_code)
    with open("src/server.ts", "w") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Could not find app.listen")
