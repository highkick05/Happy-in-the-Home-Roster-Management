import re

with open("src/components/Tasks/TasksView.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">''',
'''        </div>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">'''
)

with open("src/components/Tasks/TasksView.tsx", "w") as f:
    f.write(code)
