import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # GET /api/profile
    text = text.replace(
        "super_member_number as superMemberNumber",
        "super_member_number as superMemberNumber, avatar_url as avatarUrl"
    )

    # PUT /api/profile
    text = re.sub(
        r'(app\.put\("/api/profile".*?superMemberNumber,)(\s+password,\s+\} = req\.body;)',
        r'\1\n      avatarUrl,\n      password,\n    } = req.body;',
        text,
        flags=re.DOTALL
    )

    text = text.replace(
        "super_fund_name = ?, super_member_number = ?",
        "super_fund_name = ?, super_member_number = ?, avatar_url = ?"
    )

    text = re.sub(
        r'(const params = \[.*?superMemberNumber,)(\s+\];)',
        r'\1\n      avatarUrl || null,\n    ];',
        text,
        flags=re.DOTALL
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
