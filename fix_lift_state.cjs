const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /const \[showSubtasks, setShowSubtasks\] = useState\(false\);/,
  ''
);

content = content.replace(
  /export function TaskCard\(\{([\s\S]*?)\}: any\) \{/,
  `export function TaskCard({
$1,
  isExpanded,
  onToggleExpand
}: any) {`
);

content = content.replace(
  /onClick=\{\(\) => setShowSubtasks\(\!showSubtasks\)\}/,
  'onClick={(e) => { e.preventDefault(); onToggleExpand?.(); }}'
);

content = content.replace(
  /\{showSubtasks && \(/g,
  '{isExpanded && ('
);

content = content.replace(
  /\{showSubtasks \? <ChevronDown className="w-4 h-4" \/> : <ChevronRight className="w-4 h-4" \/>\}/g,
  '{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
