import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    text = text.replace(
        "SELECT id, first_name, last_name, role FROM users WHERE role = ?",
        "SELECT id, first_name, last_name, role, avatar_url FROM users WHERE role = ?"
    )

    text = text.replace(
        "SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at, can_switch_admin FROM users",
        "SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at, can_switch_admin, avatar_url FROM users"
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
