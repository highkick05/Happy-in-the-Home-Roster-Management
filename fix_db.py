import sqlite3
import os

db_path = "/app/applet/data/dev-database.sqlite"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Make sure clients exists
cursor.execute("""
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
""")

# users
cursor.execute("""
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
""")

# providers
cursor.execute("""
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
""")

# services
cursor.execute("""
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
""")

# invoices
cursor.execute("""
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
        merged_into_invoice_id INTEGER,
        merged_into_shift_id INTEGER
      );
""")

# shifts
cursor.execute("""
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
        progress_note TEXT,
        provider_travel_km REAL DEFAULT 0,
        provider_travel_cost REAL DEFAULT 0,
        abt_km REAL DEFAULT 0,
        abt_cost REAL DEFAULT 0,
        transport_route_log TEXT,
        home_care_travel_km REAL DEFAULT 0,
        home_care_travel_total REAL DEFAULT 0,
        travel_breakdown TEXT,
        actual_start_time TEXT,
        actual_finish_time TEXT,
        odometer_start_reading TEXT,
        odometer_start_photo TEXT,
        odometer_end_reading TEXT,
        odometer_end_photo TEXT
      );
""")

# settings
cursor.execute("""
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
""")

# files
cursor.execute("""
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        folder_path TEXT NOT NULL
      );
""")

# client_roster_templates
cursor.execute("""
      CREATE TABLE IF NOT EXISTS client_roster_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL
      );
""")

# Ensure we have column `merged_into_shift_id` on invoices (if it existed before without it)
try:
    cursor.execute("ALTER TABLE invoices ADD COLUMN merged_into_shift_id INTEGER")
except:
    pass

try:
    cursor.execute("ALTER TABLE shifts ADD COLUMN transport_route_log TEXT")
except:
    pass

conn.commit()
conn.close()
print("DB fixed")
