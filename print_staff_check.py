with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start = text.find("activeTab === 'staff' && (")
end = text.find("overflow-x-auto", start)
print(text[start:end])
