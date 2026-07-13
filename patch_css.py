with open("src/index.css", "r") as f:
    code = f.read()

code = code.replace("padding: 0.25em 0 !important;", "padding: 0 !important;")

if ".editorjs-wrapper .ce-paragraph" not in code:
    code += """
.editorjs-wrapper .ce-paragraph {
  line-height: 1.4 !important;
  margin: 0 !important;
  padding: 0 !important;
}
"""

with open("src/index.css", "w") as f:
    f.write(code)
