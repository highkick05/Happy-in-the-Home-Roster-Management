import re

def fix_server(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Fix POST /api/clients
    text = text.replace(
        "ndisAgreementBudget,\n        } = reqBody;",
        "ndisAgreementBudget,\n          avatarUrl,\n        } = reqBody;"
    )

    text = text.replace(
        "INSERT INTO clients (first_name, last_name, ndis_number, care_plan_details, contact_email, contact_phone, provider_id, dob, funding_type, my_aged_care_id, address, representative_name, representative_phone, representative_email, home_care_sub_type, home_care_level_or_class, joined_date, care_coordination_fee, billing_tier, historical_monthly_cap, assessed_independence_pct, assessed_everyday_living_pct, ndis_agreement_start_date, ndis_agreement_end_date, ndis_agreement_budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO clients (first_name, last_name, ndis_number, care_plan_details, contact_email, contact_phone, provider_id, dob, funding_type, my_aged_care_id, address, representative_name, representative_phone, representative_email, home_care_sub_type, home_care_level_or_class, joined_date, care_coordination_fee, billing_tier, historical_monthly_cap, assessed_independence_pct, assessed_everyday_living_pct, ndis_agreement_start_date, ndis_agreement_end_date, ndis_agreement_budget, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    text = text.replace(
        "ndisAgreementBudget,\n        );",
        "ndisAgreementBudget,\n          avatarUrl || null,\n        );"
    )


    # Fix PUT /api/clients/:id
    text = text.replace(
        "UPDATE clients SET first_name = ?, last_name = ?, ndis_number = ?, care_plan_details = ?, contact_email = ?, contact_phone = ?, provider_id = ?, dob = ?, funding_type = ?, my_aged_care_id = ?, address = ?, representative_name = ?, representative_phone = ?, representative_email = ?, home_care_sub_type = ?, home_care_level_or_class = ?, joined_date = ?, care_coordination_fee = ?, billing_tier = ?, historical_monthly_cap = ?, assessed_independence_pct = ?, assessed_everyday_living_pct = ?, ndis_agreement_start_date = ?, ndis_agreement_end_date = ?, ndis_agreement_budget = ? WHERE id = ?",
        "UPDATE clients SET first_name = ?, last_name = ?, ndis_number = ?, care_plan_details = ?, contact_email = ?, contact_phone = ?, provider_id = ?, dob = ?, funding_type = ?, my_aged_care_id = ?, address = ?, representative_name = ?, representative_phone = ?, representative_email = ?, home_care_sub_type = ?, home_care_level_or_class = ?, joined_date = ?, care_coordination_fee = ?, billing_tier = ?, historical_monthly_cap = ?, assessed_independence_pct = ?, assessed_everyday_living_pct = ?, ndis_agreement_start_date = ?, ndis_agreement_end_date = ?, ndis_agreement_budget = ?, avatar_url = ? WHERE id = ?"
    )

    text = text.replace(
        "ndisAgreementBudget,\n          id,\n        );",
        "ndisAgreementBudget,\n          avatarUrl || null,\n          id,\n        );"
    )


    with open(filepath, 'w') as f:
        f.write(text)

fix_server('src/server.ts')
