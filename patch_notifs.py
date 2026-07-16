import re

with open("src/server.ts", "r") as f:
    code = f.read()

notifs_table = """
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_list_items (
"""

code = code.replace("CREATE TABLE IF NOT EXISTS price_list_items (", notifs_table)

with open("src/server.ts", "w") as f:
    f.write(code)
