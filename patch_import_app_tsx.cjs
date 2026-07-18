const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `import TasksView from './components/Tasks/TasksView';`;
const replacementStr = `import TasksView from './components/Tasks/TasksView';
import TravelLogsView from './components/TravelLogsView';`;

if (code.includes(targetStr) && !code.includes('import TravelLogsView')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Added TravelLogsView import');
}
