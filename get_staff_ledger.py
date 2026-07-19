with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start = text.find("Staff Logbook (Workforce Compliance)</h3>")
start = text.rfind('<div className="p-4 md:p-6 border-b', 0, start)
end = text.find('<div className="overflow-x-auto">', start)
print(text[start:end])
