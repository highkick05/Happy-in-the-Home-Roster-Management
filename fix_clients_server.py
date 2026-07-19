import re

def fix_server(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    # Fix POST /api/clients
    text = text.replace(
        "ndisAgreementBudget !== undefined\n            ? parseFloat(ndisAgreementBudget)\n            : 0.0,\n        );",
        "ndisAgreementBudget !== undefined\n            ? parseFloat(ndisAgreementBudget)\n            : 0.0,\n          avatarUrl || null,\n        );"
    )

    # Fix PUT /api/clients/:id
    text = text.replace(
        "ndisAgreementBudget !== undefined\n            ? parseFloat(ndisAgreementBudget)\n            : 0.0,\n          paramId,\n        );",
        "ndisAgreementBudget !== undefined\n            ? parseFloat(ndisAgreementBudget)\n            : 0.0,\n          avatarUrl || null,\n          paramId,\n        );"
    )

    with open(filepath, 'w') as f:
        f.write(text)

fix_server('src/server.ts')
