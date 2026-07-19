with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start = text.find("activeTab === 'evidence'")
end = text.find('<table', start)
print(text[start:end])
