import re

def fix_file(file_path):
    with open(file_path, 'r') as f:
        text = f.read()

    # POST /api/staff
    text = re.sub(
        r'(app\.post\("/api/staff".*?superMemberNumber,)(\s+canSwitchAdmin,\s+\} = req\.body;)',
        r'\1\n      canSwitchAdmin,\n      avatarUrl,\n    } = req.body;',
        text,
        flags=re.DOTALL
    )
    
    text = re.sub(
        r'("INSERT INTO users \(email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin\)\\n"\s+\+\s+"VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)",)',
        r'"INSERT INTO users (email, password_hash, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin, avatar_url)\n" +\n        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",',
        text,
        flags=re.DOTALL
    )

    text = re.sub(
        r'(superMemberNumber,\s+canSwitchAdmin \? 1 : 0,\s+)(\);)',
        r'\1avatarUrl || null,\n      \2',
        text,
        flags=re.DOTALL
    )
    
    # PUT /api/staff/:id
    text = re.sub(
        r'(app\.put\("/api/staff/:id".*?superMemberNumber,)(\s+canSwitchAdmin,\s+\} = req\.body;)',
        r'\1\n      canSwitchAdmin,\n      avatarUrl,\n    } = req.body;',
        text,
        flags=re.DOTALL
    )
    
    text = re.sub(
        r'("UPDATE users SET email = \?, role = \?, first_name = \?, last_name = \?, phone = \?, address = \?, dob = \?, emergency_contact_name = \?, emergency_contact_phone = \?, bank_name = \?, bank_bsb = \?, bank_acc = \?, tax_number = \?, super_fund_name = \?, super_member_number = \?, can_switch_admin = \? WHERE id = \?",)',
        r'"UPDATE users SET email = ?, role = ?, first_name = ?, last_name = ?, phone = ?, address = ?, dob = ?, emergency_contact_name = ?, emergency_contact_phone = ?, bank_name = ?, bank_bsb = ?, bank_acc = ?, tax_number = ?, super_fund_name = ?, super_member_number = ?, can_switch_admin = ?, avatar_url = ? WHERE id = ?",',
        text,
        flags=re.DOTALL
    )

    # Note: there is a \); for the stmt.run() for PUT too
    # Let's just be specific about the stmt.run arguments for PUT
    text = re.sub(
        r'(canSwitchAdmin \? 1 : 0,\s+id,\s+)(\);)',
        r'canSwitchAdmin ? 1 : 0,\n        avatarUrl || null,\n        id,\n      \2',
        text,
        flags=re.DOTALL
    )

    with open(file_path, 'w') as f:
        f.write(text)

fix_file('src/server.ts')
