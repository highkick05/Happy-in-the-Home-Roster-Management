import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # /api/me query
    text = text.replace(
        "SELECT id, email, role, first_name, last_name, can_switch_admin FROM users WHERE id = ?",
        "SELECT id, email, role, first_name, last_name, can_switch_admin, avatar_url FROM users WHERE id = ?"
    )

    # /api/me returned payload
    text = re.sub(
        r'(app\.get\("/api/me".*?user\.last_name,)(\s+canSwitchAdmin: !!user\.can_switch_admin,\s+\},)',
        r'\1\n        canSwitchAdmin: !!user.can_switch_admin,\n        avatarUrl: user.avatar_url,\n      },',
        text,
        flags=re.DOTALL
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
