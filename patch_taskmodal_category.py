import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

old_state = "category_id: task?.category_id || '',"
new_state = "category_id: task?.category_id || (categories && categories.length > 0 ? categories[0].id : ''),"

code = code.replace(old_state, new_state)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
