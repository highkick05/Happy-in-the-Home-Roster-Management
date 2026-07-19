import re

with open('src/components/VehiclesView.tsx', 'r') as f:
    text = f.read()

text = text.replace('<div className="w-32">\n                          <select\n                            value={v.insurance_type || ""} ', '<div className="min-w-[140px] w-full">\n                          <select\n                            value={v.insurance_type || ""} ')

text = text.replace(
'''                        <div className="w-32">
                          <select
                            value={v.insurance_type || ""}''',
'''                        <div className="min-w-[140px] w-full">
                          <select
                            value={v.insurance_type || ""}'''
)

with open('src/components/VehiclesView.tsx', 'w') as f:
    f.write(text)
