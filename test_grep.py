with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if "activeTab === 'mandatory_documents' && (" in line:
            start = i
            break
    for i in range(start, start + 300):
        print(f"{i}: {lines[i]}", end="")
