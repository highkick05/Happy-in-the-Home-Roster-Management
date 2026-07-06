const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

const targetFilter = `  useEffect(() => {
    const filtered = tasks.filter(t => t.status === activeTab).sort((a, b) => {
      if (a.is_important !== b.is_important) {
        return (b.is_important || 0) - (a.is_important || 0);
      }
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return b.id - a.id;
    });
    setLocalDisplayTasks(filtered);
  }, [tasks, activeTab]);`;

const replFilter = `  useEffect(() => {
    const filtered = tasks.filter(t => {
      if (activeTab === 'Reminders') {
        return !!t.is_reminder;
      }
      return t.status === activeTab && !t.is_reminder;
    }).sort((a, b) => {
      if (a.is_important !== b.is_important) {
        return (b.is_important || 0) - (a.is_important || 0);
      }
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return b.id - a.id;
    });
    setLocalDisplayTasks(filtered);
  }, [tasks, activeTab]);`;

content = content.replace(targetFilter, replFilter);
fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
