const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

content = content.replace(
    "const km = (isHC ? (row.home_care_travel_km || row.provider_travel_km || 0) : (row.provider_travel_km || 0)) + (row.abt_km || 0);",
    "const isHC = (row.funding_type === 'HOME_CARE' || row.funding_type === 'Home Care' || row.funding_type === 'HCP');\n                         const km = (isHC ? (row.home_care_travel_km || row.provider_travel_km || 0) : (row.provider_travel_km || 0)) + (row.abt_km || 0);"
);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
