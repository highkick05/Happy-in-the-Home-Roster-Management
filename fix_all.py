import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# Make sure CustomDatePicker is imported
if 'import CustomDatePicker' not in text and 'import { CustomDatePicker' not in text:
    text = text.replace('import { useAuth } from "../context/AuthContext";', 'import { useAuth } from "../context/AuthContext";\nimport CustomDatePicker from "./ui/CustomDatePicker";')

# 1. Rego Expiry
text = text.replace(
'''                        <div className="w-24">
                          <input
                            type="date"
                            value={v.rego_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { rego_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />''',
'''                        <div className="w-[130px]">
                          <CustomDatePicker
                            position="bottom"
                            value={v.rego_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, { rego_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />'''
)

# 2. Insurance Expiry
text = text.replace(
'''                        <div className="w-24">
                          <input
                            type="date"
                            value={v.insurance_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { insurance_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />''',
'''                        <div className="w-[130px]">
                          <CustomDatePicker
                            position="bottom"
                            value={v.insurance_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, { insurance_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />'''
)

# 3. Roadside Expiry
text = text.replace(
'''                        <div className="w-24">
                          <input
                            type="date"
                            value={v.roadside_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { roadside_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />''',
'''                        <div className="w-[130px]">
                          <CustomDatePicker
                            position="bottom"
                            value={v.roadside_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, { roadside_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />'''
)

# Reduce Insurance Type width
text = text.replace(
    '<div className="w-40">\n                          <select\n                            value={v.insurance_type || ""} ',
    '<div className="w-[125px]">\n                          <select\n                            value={v.insurance_type || ""} '
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
