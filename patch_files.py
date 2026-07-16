import re

with open("src/server.ts", "r") as f:
    code = f.read()

files_table = """
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        system_name TEXT NOT NULL,
        size INTEGER,
        uploaded_by INTEGER,
        region TEXT,
        folder_path TEXT,
        date_issued TEXT,
        date_expires TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_list_items (
"""

code = code.replace("CREATE TABLE IF NOT EXISTS price_list_items (", files_table)

with open("src/server.ts", "w") as f:
    f.write(code)
