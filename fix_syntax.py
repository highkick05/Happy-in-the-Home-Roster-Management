import re

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

# Let's count the number of <div> and </div> tags in the system_logs tab
start_idx = text.find("{/* System Audit Logs Visualizer */}")
end_idx = text.find("{/* Manage Staff Documents Modal */}")

system_logs_text = text[start_idx:end_idx]

div_count = system_logs_text.count("<div")
end_div_count = system_logs_text.count("</div")

print(f"<div> count: {div_count}")
print(f"</div> count: {end_div_count}")
