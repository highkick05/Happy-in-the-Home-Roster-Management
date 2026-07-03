const fs = require('fs');
console.log(fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8').includes('function DraggableTask'));
