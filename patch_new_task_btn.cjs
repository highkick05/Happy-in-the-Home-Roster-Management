const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

const targetNewTaskBtn = `          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="flex items-center px-4 py-2 bg-brand-teal text-white font-medium text-[13px] rounded-lg hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Task
          </button>`;

const replNewTaskBtn = `          <button
            onClick={() => { 
              setEditingTask(activeTab === 'Reminders' ? { is_reminder: 1 } as any : null); 
              setIsModalOpen(true); 
            }}
            className="flex items-center px-4 py-2 bg-brand-teal text-white font-medium text-[13px] rounded-lg hover:bg-brand-teal/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New {activeTab === 'Reminders' ? 'Reminder' : 'Task'}
          </button>`;

content = content.replace(targetNewTaskBtn, replNewTaskBtn);
fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
