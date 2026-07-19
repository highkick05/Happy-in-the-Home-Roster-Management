with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

# Let's find each tab's rendering block
print("--- client_evidence ---")
start1 = text.find("{activeTab === 'client_evidence' && (")
if start1 != -1:
    end1 = text.find("          <div className=\"bg-brand-navy rounded-lg", start1)
    print(text[start1:end1])

print("--- staff ---")
start2 = text.find("{activeTab === 'staff' && (")
if start2 != -1:
    end2 = text.find("          <div className=\"bg-brand-navy rounded-lg", start2)
    print(text[start2:end2])

print("--- mandatory ---")
start3 = text.find("{activeTab === 'mandatory' && (")
if start3 != -1:
    end3 = text.find("          <div className=\"bg-brand-navy rounded-lg", start3)
    print(text[start3:end3])

print("--- system_logs ---")
start4 = text.find("{activeTab === 'system_logs' && (")
if start4 != -1:
    end4 = text.find("          <div className=\"bg-brand-navy rounded-lg", start4)
    print(text[start4:end4])
