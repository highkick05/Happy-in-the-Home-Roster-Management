import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    text = text.replace(
        "INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    text = text.replace(
        """        taxNumber,
        superFundName,
        superMemberNumber,
        canSwitchAdmin ? 1 : 0,
      );""",
        """        taxNumber,
        superFundName,
        superMemberNumber,
        canSwitchAdmin ? 1 : 0,
        avatarUrl || null,
      );"""
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
