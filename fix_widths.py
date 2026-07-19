import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

# Make & Model
text = text.replace(
    '<div className="font-medium text-white w-48">',
    '<div className="font-medium text-white min-w-[200px] w-full">'
)

# Rego
text = text.replace(
    '<div className="text-xs text-[#8B949E] uppercase tracking-wider w-20">',
    '<div className="text-xs text-[#8B949E] uppercase tracking-wider w-24">'
)

# Insurance Type
text = text.replace(
    '<div className="w-20">\n                            <select value={v.insurance_type || \'\'} onChange={e => handleUpdateRow(v.id, {insurance_type: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] appearance-none text-sm">\n                              <option className="bg-brand-navy text-white" value="THIRD_PARTY">3rd Party</option>\n                              <option className="bg-brand-navy text-white" value="COMPREHENSIVE">Comp.</option>',
    '<div className="w-32">\n                            <select value={v.insurance_type || \'\'} onChange={e => handleUpdateRow(v.id, {insurance_type: e.target.value})} className="w-full bg-transparent outline-none focus:bg-brand-bg/50 focus:ring-1 focus:ring-brand-teal rounded px-1 -ml-1 text-[#8B949E] appearance-none text-sm">\n                              <option className="bg-brand-navy text-white" value="THIRD_PARTY">3rd Party</option>\n                              <option className="bg-brand-navy text-white" value="COMPREHENSIVE">Comprehensive</option>'
)

# Insurance Provider
text = text.replace(
    '<div className="w-20">\n                            <InlineInput value={v.insurance_provider}',
    '<div className="w-24">\n                            <InlineInput value={v.insurance_provider}'
)

# Roadside Provider
text = text.replace(
    '<div className="w-20">\n                            <InlineInput value={v.roadside_provider}',
    '<div className="w-24">\n                            <InlineInput value={v.roadside_provider}'
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
