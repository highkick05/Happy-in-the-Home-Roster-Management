with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

import re
match = re.search(r'(<DragDropContext.*?</DragDropContext>)', code, re.DOTALL)
if match:
    print(match.group(1))
