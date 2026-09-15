const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

// 1. Remove ONBOARDING_STEP_LABELS definition
const labelsRegex = /const ONBOARDING_STEP_LABELS[\s\S]*?};\n\n/m;
content = content.replace(labelsRegex, '');

// 2. Modify getStaffComplianceSummary
const oldSummaryCode = `const getStaffComplianceSummary = (complianceObj: Record<string, any>) => {
                let expired = 0;
                let expiring = 0;
                let missing = 0;
                let valid = 0;

                Object.values(complianceObj).forEach((item: any) => {
                  if (item.status === 'EXPIRED') expired++;
                  else if (item.status === 'EXPIRING_SOON') expiring++;
                  else if (item.status === 'MISSING') missing++;
                  else if (item.status === 'VALID') valid++;
                });

                return {
                  totalUploaded: valid + expiring + expired,
                  missing,
                  expired,
                  expiring,
                  valid
                };
              };`;
const newSummaryCode = `const getStaffComplianceSummary = (complianceObj: Record<string, any>) => {
                let expired = 0;
                let expiring = 0;
                let missing = 0;
                let valid = 0;
                const totalItems = Object.keys(complianceObj).length;

                Object.values(complianceObj).forEach((item: any) => {
                  if (item.status === 'EXPIRED') expired++;
                  else if (item.status === 'EXPIRING_SOON') expiring++;
                  else if (item.status === 'MISSING') missing++;
                  else if (item.status === 'VALID') valid++;
                });

                return {
                  totalUploaded: valid + expiring + expired,
                  missing,
                  expired,
                  expiring,
                  valid,
                  totalItems
                };
              };`;
content = content.replace(oldSummaryCode, newSummaryCode);

// 3. Update the Compliance Stats header rendering
content = content.replace(
  '{stats.totalUploaded} of {Object.keys(ONBOARDING_STEP_LABELS).length}',
  '{stats.totalUploaded} of {stats.totalItems}'
);

// 4. Update the object mapping for the expanded view
const oldMapCode = `{Object.entries(ONBOARDING_STEP_LABELS).map(([key, label]) => {
                                const item = (staff.compliance || {})[key] || { status: 'MISSING', expiry: null, issued: null, fileName: null, fileId: null };`;
const newMapCode = `{Object.entries(staff.compliance || {}).map(([key, item]: [string, any]) => {
                                const label = item.label || 'Unknown Document';`;
content = content.replace(oldMapCode, newMapCode);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content, 'utf8');
console.log("Patched ComplianceDashboard.tsx");
