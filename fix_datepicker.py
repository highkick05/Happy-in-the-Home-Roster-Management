import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# Replace rego_expiry DatePicker
text = text.replace(
'''                          <CustomDatePicker
                            position="bottom"
                            value={v.rego_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, {
                                rego_expiry: e.target.value,
                              })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />''',
'''                          <input
                            type="date"
                            value={v.rego_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { rego_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />'''
)

# Replace insurance_expiry DatePicker
text = text.replace(
'''                          <CustomDatePicker
                            position="bottom"
                            value={v.insurance_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, {
                                insurance_expiry: e.target.value,
                              })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />''',
'''                          <input
                            type="date"
                            value={v.insurance_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { insurance_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />'''
)

# Replace roadside_expiry DatePicker
text = text.replace(
'''                          <CustomDatePicker
                            position="bottom"
                            value={v.roadside_expiry || ""}
                            onChange={(e: any) =>
                              handleUpdateRow(v.id, {
                                roadside_expiry: e.target.value,
                              })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm"
                          />''',
'''                          <input
                            type="date"
                            value={v.roadside_expiry || ""}
                            onChange={(e) =>
                              handleUpdateRow(v.id, { roadside_expiry: e.target.value })
                            }
                            className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] text-sm [color-scheme:dark]"
                          />'''
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
