const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TasksView.tsx', 'utf8');

content = content.replace(
  /const fetchData = async \(\) => \{\n    try \{\n      setLoading\(true\);/,
  `const fetchData = async (silent = false) => {
    try {
      if (!silent && tasks.length === 0) setLoading(true);`
);

content = content.replace(
  /fetchData\(\);/g,
  'fetchData(true);'
);

content = content.replace(
  /fetchData\(true\);\n    fetchStaffAndClients\(\);/,
  'fetchData(false);\n    fetchStaffAndClients();'
);

fs.writeFileSync('src/components/Tasks/TasksView.tsx', content);
