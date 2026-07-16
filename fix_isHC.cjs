const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const isHCMissing = /const hc_km = isHC \?/;

if (content.match(isHCMissing)) {
    const isHCDef = `const isHC = (row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP');\n                         const hc_km = isHC ?`;
    content = content.replace(isHCMissing, isHCDef);
}

const missingCells = `let travelCategoryCell = <span className="text-[#8B949E]">-</span>;
                         let travelRouteCell = <span className="text-[#8B949E]">-</span>;
                         let claimableTravelCell = <span className="text-[#8B949E]">-</span>;
                         return (`

if (content.match(/noteStatusStr = 'Pending Sync';\n                         }\n                         \n                         return \(/)) {
    content = content.replace(/noteStatusStr = 'Pending Sync';\n                         }\n                         \n                         return \(/, `noteStatusStr = 'Pending Sync';\n                         }\n                         ${missingCells}`);
}

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
