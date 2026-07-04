const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldToggle = `  const handleToggleComplete = (e: any) => {
    e.stopPropagation();
    if (isToggling) return;
    setIsToggling(true);
    setTimeout(() => {
      onComplete();
    }, 800);
  };`;

const newToggle = `  const handleToggleComplete = (e: any) => {
    e.stopPropagation();
    if (isToggling) return;
    setIsToggling(true);
    if (task.status === 'Active') {
      setTimeout(() => {
        onComplete();
      }, 800);
    } else {
      onComplete();
    }
  };`;

code = code.replace(oldToggle, newToggle);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
