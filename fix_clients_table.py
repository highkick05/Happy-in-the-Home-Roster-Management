import sqlite3
import os

db_path = 'local.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("ALTER TABLE clients ADD COLUMN avatar_url TEXT;")
        conn.commit()
    except sqlite3.OperationalError:
        pass # column might already exist
    conn.close()

with open('src/server.ts', 'r') as f:
    text = f.read()

text = text.replace(
    "CREATE TABLE IF NOT EXISTS clients (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,",
    "CREATE TABLE IF NOT EXISTS clients (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        avatar_url TEXT,"
)

# Also need to update POST /api/clients and PUT /api/clients/:id
with open('src/server.ts', 'w') as f:
    f.write(text)
