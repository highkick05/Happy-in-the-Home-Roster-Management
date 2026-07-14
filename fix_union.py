with open("src/server.ts", "r") as f:
    code = f.read()

old_str = """          pn.tags as tags
        FROM progress_notes pn"""
new_str = """          pn.tags as tags, pn.author_id
        FROM progress_notes pn"""
code = code.replace(old_str, new_str)

with open("src/server.ts", "w") as f:
    f.write(code)
