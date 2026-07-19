with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

start_idx = text.find("{/* System Audit Logs Visualizer */}")
end_idx = text.find("{/* Manage Staff Documents Modal */}")

print(text[start_idx:end_idx])
