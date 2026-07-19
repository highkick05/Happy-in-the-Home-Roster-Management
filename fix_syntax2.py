with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'r') as f:
    text = f.read()

bad_string = """           <span className="text-xs text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-sm font-medium border border-brand-teal/20">Tamper-Proof</span>
        <div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50 flex flex-wrap items-center justify-start gap-4">"""

good_string = """           <span className="text-xs text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-sm font-medium border border-brand-teal/20">Tamper-Proof</span>
        </div>
        <div className="p-4 md:p-6 border-b border-border-subtle bg-brand-bg/50 flex flex-wrap items-center justify-start gap-4">"""

text = text.replace(bad_string, good_string)

with open('/app/applet/src/components/Compliance/ComplianceDashboard.tsx', 'w') as f:
    f.write(text)
