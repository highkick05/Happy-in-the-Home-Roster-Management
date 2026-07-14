import re

with open("src/index.css", "r") as f:
    code = f.read()

old = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 !important;
  display: flex;
  justify-content: flex-start;
  border-radius: 6px;
  overflow: hidden;
}
"""

new = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 !important;
  display: flex;
  justify-content: flex-start;
  border-radius: 6px;
  overflow: auto;
  resize: horizontal;
}
"""

code = code.replace(old.strip(), new.strip())

with open("src/index.css", "w") as f:
    f.write(code)
