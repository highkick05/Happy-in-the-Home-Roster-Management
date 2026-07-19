with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

import re

# Evidence ledger filters
print("=== Evidence Ledger ===")
start = text.find("Global Evidence Ledger</h3>")
end = text.find('<div className="p-0">', start)
print(text[start:end])

# Staff ledger filters
print("=== Staff Ledger ===")
start2 = text.find("Staff Logbook (Workforce Compliance)</h3>")
end2 = text.find('<div className="p-0">', start2)
print(text[start2:end2])

# Mandatory Docs filters
print("=== Mandatory Docs ===")
start3 = text.find("Staff Compliance Matrix</h3>")
end3 = text.find('<div className="p-4 md:p-6">', start3)
print(text[start3:end3])

# System Logs filters
print("=== System Logs ===")
start4 = text.find("Immutable System Logs (Read-Only)")
end4 = text.find('<div className="p-5">', start4)
print(text[start4:end4])
