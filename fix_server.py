import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # Remove all the bad insertions
    text = re.sub(
        r'(\s+if \(!usersCols\.some\(c => c\.name === \'avatar_url\'\)\) \{\n\s+db\.exec\("ALTER TABLE users ADD COLUMN avatar_url TEXT"\);\n\s+\})',
        '',
        text
    )

    # Put exactly ONE insertion back where it belongs
    # Where does it belong? Right after `last_active_role TEXT");` in the init tables area (around line 550)
    init_loc = """db.exec("ALTER TABLE users ADD COLUMN last_active_role TEXT");
    }"""
    
    replacement = """db.exec("ALTER TABLE users ADD COLUMN last_active_role TEXT");
    }
    if (!usersCols.some(c => c.name === 'avatar_url')) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
    }"""
    text = text.replace(init_loc, replacement, 1)

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
