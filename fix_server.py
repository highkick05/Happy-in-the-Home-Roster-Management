with open("src/server.ts", "r") as f:
    code = f.read()

bad = """    db.exec(`
          db.exec(`
      CREATE TABLE IF NOT EXISTS progress_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      )
    `);
      CREATE TABLE IF NOT EXISTS tasks ("""

good = """    db.exec(`
      CREATE TABLE IF NOT EXISTS progress_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS tasks ("""

if bad in code:
    print("Found exact bad string")
    code = code.replace(bad, good)
else:
    print("Not found exact bad string, using regex...")
    import re
    code = re.sub(r'db\.exec\(`\s*db\.exec\(`', r'db.exec(`', code)
    code = re.sub(r'\)\s*`\);\s*CREATE TABLE IF NOT EXISTS tasks \(', r');\n      CREATE TABLE IF NOT EXISTS tasks (', code)

with open("src/server.ts", "w") as f:
    f.write(code)
