import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Fix the filter logic for imageAttachments and fileAttachments
old_img = "const imageAttachments = attachments.filter((a: any) => a.filename?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i));"
new_img = "const imageAttachments = attachments.filter((a: any) => (a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)));"
code = code.replace(old_img, new_img)

old_file = "const fileAttachments = attachments.filter((a: any) => !a.filename?.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i));"
new_file = "const fileAttachments = attachments.filter((a: any) => !((a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))));"
code = code.replace(old_file, new_file)


# And in the formData as well
old_img2 = "const imageAttachments = formData.attachments.filter((a: any) => a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i));"
new_img2 = "const imageAttachments = formData.attachments.filter((a: any) => (a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)));"
code = code.replace(old_img2, new_img2)

old_file2 = "const fileAttachments = formData.attachments.filter((a: any) => !a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i));"
new_file2 = "const fileAttachments = formData.attachments.filter((a: any) => !((a.filename && a.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) || (a.url && a.url.match(/\.(jpeg|jpg|gif|png|webp)$/i))));"
code = code.replace(old_file2, new_file2)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
