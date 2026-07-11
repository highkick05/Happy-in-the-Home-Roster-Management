const fs = require('fs');
let content = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf8');

const targetStr = `              Total Amount: <span className="text-brand-teal">\${servicesData.reduce((acc, s) => {
                const { rate, unit, name } = getServiceDetails(s.serviceId);
                const isProviderTravel = name.toLowerCase().includes('provider travel');
                const isABT = name.toLowerCase().includes('activity based transport');
                if (isProviderTravel || isABT) return acc;`;

const replaceStr = `              Total Amount: <span className="text-brand-teal">\${servicesData.reduce((acc, s) => {
                const { rate, unit, name } = getServiceDetails(s.serviceId);
                const isProviderTravel = name.toLowerCase().includes('provider travel');
                const isABT = name.toLowerCase().includes('activity based transport');
                if ((isProviderTravel || isABT) && !isHistorical) return acc;`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', content);
  console.log('Successfully fixed Total Amount in AddShiftModal.tsx');
} else {
  console.log('Could not find target string in AddShiftModal.tsx');
}
