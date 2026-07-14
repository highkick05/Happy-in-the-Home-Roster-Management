import re

with open("src/index.css", "r") as f:
    code = f.read()

# Replace the first image-tool__image declaration
old1 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 !important;
  display: flex;
  justify-content: flex-start;
}
"""

new1 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  margin: 0 !important;
  display: inline-block !important;
}
"""
code = code.replace(old1.strip(), new1.strip())

# Replace the second image-tool__image declaration
old2 = """
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

new2 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  margin: 0 !important;
  display: inline-block !important;
  border-radius: 6px;
  overflow: hidden;
  resize: horizontal;
}
"""
code = code.replace(old2.strip(), new2.strip())

# Replace image-tool__image-picture declaration 1
old_pic1 = """
.editorjs-wrapper .image-tool__image-picture {
  max-width: 100% !important;
  max-height: 400px !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
  border-radius: 8px;
}
"""
new_pic1 = """
.editorjs-wrapper .image-tool__image-picture {
  width: 100% !important;
  height: auto !important;
  display: block;
  border-radius: 8px;
}
"""
code = code.replace(old_pic1.strip(), new_pic1.strip())

# Replace image-tool__image-picture declaration 2
old_pic2 = """
.editorjs-wrapper .image-tool__image-picture {
  max-width: 100% !important;
  max-height: 400px !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
}
"""
new_pic2 = """
.editorjs-wrapper .image-tool__image-picture {
  width: 100% !important;
  height: auto !important;
  display: block;
}
"""
code = code.replace(old_pic2.strip(), new_pic2.strip())

if ".editorjs-wrapper .image-tool__caption {" not in code:
    code += """
.editorjs-wrapper .image-tool__caption,
.editorjs-wrapper .cdx-input.image-tool__caption {
  display: none !important;
}
"""

with open("src/index.css", "w") as f:
    f.write(code)

