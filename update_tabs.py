import re

with open("src/components/Compliance/ComplianceDashboard.tsx", "r") as f:
    code = f.read()

target_tab_type = """  const [activeTab, setActiveTab] = useLocalStorage<'evidence' | 'staff' | 'mandatory_documents'>('compliance_active_tab', 'evidence');"""
replacement_tab_type = """  const [activeTab, setActiveTab] = useLocalStorage<'evidence' | 'staff' | 'mandatory_documents' | 'system_logs'>('compliance_active_tab', 'evidence');"""
code = code.replace(target_tab_type, replacement_tab_type)

with open("src/components/Compliance/ComplianceDashboard.tsx", "w") as f:
    f.write(code)
