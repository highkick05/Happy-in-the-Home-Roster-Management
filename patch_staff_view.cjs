const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// The activeTab logic uses a prop named "type", but state variable is called "activeTab" which defaults to "type"
// Find how activeTab is defined
const activeTabRegex = /const \[activeTab, setActiveTab\] = useState<\'STAFF\' \| \'CLIENTS\' \| \'PROVIDERS\' \| \'CONTRACTORS\'>(.*)/;
console.log(content.match(activeTabRegex));

