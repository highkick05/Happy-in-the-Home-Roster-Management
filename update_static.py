import re

with open("src/server.ts", "r") as f:
    code = f.read()

target = "  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));"
replacement = """  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res, path, stat) => {
      if (!path.match(/\\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
        res.set('Content-Disposition', 'attachment');
      }
    }
  }));"""

if target in code:
    code = code.replace(target, replacement)
    print("Replaced static handler")
else:
    print("Target not found")
    
with open("src/server.ts", "w") as f:
    f.write(code)

