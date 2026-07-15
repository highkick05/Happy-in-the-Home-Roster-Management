import re

with open("src/server.ts", "r") as f:
    code = f.read()

schema_sql = """
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        address TEXT,
        dob TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        bank_name TEXT,
        bank_bsb TEXT,
        bank_acc TEXT,
        tax_number TEXT,
        super_fund_name TEXT,
        super_member_number TEXT
      );

      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        provider_type TEXT,
        management_fee REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        ndis_number TEXT,
        care_plan_details TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        provider_id INTEGER,
        dob TEXT,
        funding_type TEXT,
        my_aged_care_id TEXT,
        address TEXT,
        representative_name TEXT,
        representative_phone TEXT,
        representative_email TEXT,
        home_care_sub_type TEXT,
        home_care_level_or_class TEXT,
        joined_date TEXT,
        care_coordination_fee REAL,
        billing_tier TEXT,
        historical_monthly_cap REAL,
        assessed_independence_pct REAL,
        assessed_everyday_living_pct REAL,
        ndis_agreement_start_date TEXT,
        ndis_agreement_end_date TEXT,
        ndis_agreement_budget REAL,
        cycle_start_date TEXT,
        cycle_end_date TEXT,
        historical_internal_consumptions REAL,
        spend_as_of_date TEXT,
        starting_rollover_balance REAL,
        rollover_spent_so_far REAL,
        status TEXT DEFAULT 'ACTIVE'
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        rate REAL NOT NULL,
        description TEXT,
        type TEXT,
        service_category TEXT,
        unit TEXT,
        rates_json TEXT,
        reg_group_number TEXT,
        reg_group_name TEXT,
        status TEXT DEFAULT 'ACTIVE'
      );

      CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        client_id INTEGER NOT NULL,
        service_id INTEGER,
        respite_booking_id INTEGER,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        batch_id TEXT,
        funding_type TEXT,
        is_abt_approved INTEGER DEFAULT 0,
        services_json TEXT,
        custom_staff_name TEXT,
        provider_travel_minutes REAL DEFAULT 0,
        is_historical INTEGER DEFAULT 0,
        progress_note TEXT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        respite_booking_id INTEGER,
        client_id INTEGER NOT NULL,
        shift_id INTEGER,
        amount REAL NOT NULL,
        file_path TEXT,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        services_json TEXT,
        merged_into_invoice_id INTEGER
      );
    `);
"""

old_try = "  try {\n    const tableInfo = db.pragma(\"table_info(shifts)\") as any[];"
new_try = "  try {\n" + schema_sql + "\n    const tableInfo = db.pragma(\"table_info(shifts)\") as any[];"

code = code.replace(old_try, new_try)

with open("src/server.ts", "w") as f:
    f.write(code)
