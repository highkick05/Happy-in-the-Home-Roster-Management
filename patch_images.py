import re

with open("src/index.css", "r") as f:
    code = f.read()

# Fix EditorJS image tool centering
old_image_css1 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}
"""
new_image_css1 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 !important;
  display: flex;
  justify-content: flex-start;
}
"""
code = code.replace(old_image_css1.strip(), new_image_css1.strip())

old_image_css2 = """
.editorjs-wrapper .image-tool__image {
  max-width: 100% !important;
  max-height: 400px !important;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  border-radius: 6px;
  overflow: hidden;
}
"""
new_image_css2 = """
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
code = code.replace(old_image_css2.strip(), new_image_css2.strip())

with open("src/index.css", "w") as f:
    f.write(code)

