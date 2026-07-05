const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /className=\{\`shrink-0 \$\{wallboardMode \? 'mt-1' : 'mt-0\.5'\} transition-colors \$\{task\.status === 'Completed' \? 'text-brand-green' : 'text-\\[#8B949E\\] hover:text-brand-green'\}\`\}/,
  'className={`shrink-0 ${wallboardMode ? "mt-1" : "mt-0.5"} transition-colors ${isChecked ? "text-brand-green" : "text-[#8B949E] hover:text-brand-green"}`}'
);

content = content.replace(
  /className=\{\`font-medium \$\{wallboardMode \? 'text-\\[22px\\]' : 'text-\\[14px\\]'\} leading-snug truncate \$\{task\.status === 'Completed' \? 'line-through text-\\[#8B949E\\]' : 'text-\\[#E6EDF3\\]'\}\`\}/,
  'className={`font-medium ${wallboardMode ? "text-[22px]" : "text-[14px]"} leading-snug truncate ${isChecked ? "line-through text-[#8B949E]" : "text-[#E6EDF3]"}`}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
