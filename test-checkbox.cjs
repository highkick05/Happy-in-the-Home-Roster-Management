const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');
if (code.includes('AnimatedCheckbox')) {
  console.log('AnimatedCheckbox found in TaskCard.tsx');
} else {
  console.log('AnimatedCheckbox not found!');
}
