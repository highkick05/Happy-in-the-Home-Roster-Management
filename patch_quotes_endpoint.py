import re

with open('src/server.ts', 'r') as f:
    code = f.read()

doc_start = code.find("const existingDoc = db")
if doc_start != -1:
    doc_end = code.find("const fallbackNum =", doc_start)
    if doc_end != -1:
        new_file_insert = """try {
          db.prepare(
            "INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path) VALUES (?, ?, ?, ?, ?)"
          ).run(
            newFileName,
            systemName,
            stats.size,
            (req as any).user?.id || 1,
            folderPathDb
          );
        } catch (fileErr) {
          console.error("Failed to insert file record for historical quote", fileErr);
        }

        """
        code = code[:doc_start] + new_file_insert + code[doc_end:]
        with open('src/server.ts', 'w') as f:
            f.write(code)
        print("Patched.")
    else:
        print("Fallback num not found")
else:
    print("Could not find existingDoc block.")
