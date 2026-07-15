with open("src/server.ts", "r") as f:
    code = f.read()

# Remove the one at the bottom
code = code.replace("    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));", "")

# Insert it before Vite middleware block
old_vite = """  if (process.env.NODE_ENV !== "production") {"""
new_vite = """  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  if (process.env.NODE_ENV !== "production") {"""

code = code.replace(old_vite, new_vite)

with open("src/server.ts", "w") as f:
    f.write(code)
