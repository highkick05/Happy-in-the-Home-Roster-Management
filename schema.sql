CREATE TABLE vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rego TEXT NOT NULL,
        user_id INTEGER,
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ownership TEXT DEFAULT 'COMPANY',
        rego_expiry TEXT,
        rego_evidence_url TEXT,
        insurance_type TEXT,
        insurance_provider TEXT,
        insurance_expiry TEXT,
        insurance_evidence_url TEXT,
        roadside_provider TEXT,
        roadside_expiry TEXT,
        roadside_evidence_url TEXT,
        year TEXT,
        has_roadside INTEGER DEFAULT 0
      );

CREATE TABLE users (
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
        super_member_number TEXT,
        primary_position TEXT
      , can_switch_admin INTEGER DEFAULT 0, last_active_role TEXT, avatar_url TEXT, last_chat_read DATETIME);

CREATE TABLE providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        provider_type TEXT,
        management_fee REAL DEFAULT 0,
        can_email_invoices INTEGER DEFAULT 1
      );

CREATE TABLE contractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        contractor_type TEXT
      );

CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        avatar_url TEXT,
        first_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
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
      , other_providers_spent REAL DEFAULT 0);

CREATE TABLE services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
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

CREATE TABLE shifts (
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
      , tags TEXT, transport_route_log TEXT, home_care_travel_km REAL DEFAULT 0, home_care_travel_total REAL DEFAULT 0, odometer_start_photo TEXT, odometer_end_photo TEXT, odometer_start_reading REAL, odometer_end_reading REAL, vehicle_id INTEGER, merged_into_shift_id INTEGER);

CREATE TABLE invoices (
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
        custom_staff_name TEXT,
        attachments_json TEXT
      , staff_id INTEGER, merged_into_shift_id INTEGER);

CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

CREATE TABLE progress_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      );

CREATE TABLE task_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        color_hex TEXT NOT NULL
      );

CREATE TABLE task_staff (
        task_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, staff_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
      );

CREATE TABLE task_clients (
        task_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, client_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );

CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Active',
        assigned_to_id INTEGER,
        start_date TEXT,
        end_date TEXT,
        assigned_staff TEXT,
        assigned_clients TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        due_date TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      , category_id INTEGER REFERENCES task_categories(id) ON DELETE SET NULL, is_important INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0, is_reminder INTEGER DEFAULT 0, attachments TEXT DEFAULT '[]');

CREATE TABLE sub_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

CREATE TABLE ndis_service_agreements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        total_budget REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

CREATE TABLE ndis_service_agreement_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agreement_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        allocated_budget REAL DEFAULT 0,
        allocated_hours REAL DEFAULT 0,
        FOREIGN KEY (agreement_id) REFERENCES ndis_service_agreements(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      );

CREATE TABLE position_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_title TEXT NOT NULL UNIQUE,
        description_text TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE client_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        cycle_start_date TEXT,
        cycle_end_date TEXT,
        historical_internal_consumptions REAL DEFAULT 0,
        spend_as_of_date TEXT,
        starting_rollover_balance REAL DEFAULT 0,
        rollover_spent_so_far REAL DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        base_cycle_allocation REAL,
        closing_balance REAL,
        rollover_amount_forwarded REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

CREATE TABLE client_ledger_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        service_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        vendor_name TEXT,
        base_amount REAL NOT NULL,
        care_coord_fee REAL DEFAULT 0,
        management_fee REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        source_type TEXT DEFAULT 'external',
        apply_loadings INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, client_share REAL DEFAULT 0, package_drawdown REAL DEFAULT 0, service_category TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

CREATE TABLE price_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_master BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , effective_date TEXT, file_id INTEGER);

CREATE TABLE files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        system_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        size INTEGER,
        uploaded_by INTEGER,
        region TEXT,
        folder_path TEXT,
        date_issued TEXT,
        date_expires TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        file_url TEXT,
        file_name TEXT,
        file_type TEXT,
        reactions TEXT DEFAULT '{}',
        is_edited INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

CREATE TABLE training_modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        expiry_months INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE staff_training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        training_module_id INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING',
        completion_date TEXT,
        expiry_date TEXT,
        certificate_file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (training_module_id) REFERENCES training_modules(id) ON DELETE CASCADE
      );

CREATE TABLE price_list_items (


        id INTEGER PRIMARY KEY AUTOINCREMENT,
        price_list_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        rate REAL NOT NULL,
        description TEXT,
        reg_group_number TEXT,
        reg_group_name TEXT,
        rates_json TEXT,
        unit TEXT,
        FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE
      );

CREATE TABLE roster_builds (
        id TEXT PRIMARY KEY,
        client_id INTEGER NOT NULL,
        shift_count INTEGER NOT NULL,
        date_range_start TEXT NOT NULL,
        date_range_end TEXT NOT NULL,
        template_name TEXT DEFAULT 'Default Template',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

CREATE TABLE client_template_settings (
        client_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        frequency TEXT DEFAULT 'Weekly',
        PRIMARY KEY (client_id, template_name)
      );
CREATE TABLE remittances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remittance_number TEXT NOT NULL,
    client_id INTEGER,
    provider_id INTEGER,
    staff_id INTEGER,
    custom_payee_name TEXT,
    amount REAL NOT NULL,
    file_path TEXT,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    services_json TEXT,
    attachments_json TEXT
);
