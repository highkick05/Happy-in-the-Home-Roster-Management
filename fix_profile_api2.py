import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = re.sub(
        r'(const params: any\[\] = \[.*?superMemberNumber,)(\s+\];)',
        r'\1\n      avatarUrl || null,\n    ];',
        text,
        flags=re.DOTALL
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
