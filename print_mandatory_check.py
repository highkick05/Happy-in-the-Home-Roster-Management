with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start = text.find("activeTab === 'mandatory_documents' && (")
end = text.find('<div className="bg-brand-navy">', start)
print(text[start:end])
