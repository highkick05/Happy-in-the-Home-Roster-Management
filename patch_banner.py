import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace banner link with div
banner_pattern = re.compile(r'<a\s*key=\{idx\}\s*href=\{img\.url\}\s*target="_blank"\s*rel="noopener noreferrer"\s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*className="block w-full border-b border-border-subtle"\s*>\s*<img src=\{img\.url\} alt=\{img\.filename\} className="w-full h-32 object-cover" />\s*</a>', re.DOTALL)

new_banner = """<div 
              key={idx}
              className="block w-full border-b border-border-subtle"
            >
              <img src={img.url} alt={img.filename} className="w-full h-32 object-cover" />
            </div>"""

code = banner_pattern.sub(new_banner, code)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
