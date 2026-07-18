const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /const expandedLogs = logs\.map\(log => \{/;

const replacementStr = `  const formatRouteLog = (logStr: string | null, row?: any): string | null => {
    if (!logStr) return null;
    if (logStr === 'No route logged') return 'No route logged';
    if (!logStr.startsWith('{')) return logStr;
      
    const fallbackOrigin = row?.origin_address || 'Unknown';
    const fallbackDest = row?.destination_address || 'Unknown';

    const cleanLocationStr = (val: string, fallback: string) => {
        if (!val || val.trim().toLowerCase() === 'location' || val.trim().toLowerCase() === 'unknown' || val.trim() === '') {
            return fallback;
        }
        return val;
    };

    try {
      const parsed = JSON.parse(logStr);
      let out = [];
      
      if (parsed.homeCareTravel && parsed.homeCareTravel.legs) {
        const hcLegs = parsed.homeCareTravel.legs.map((l: any, idx: number) => {
           if (l.description && l.description.includes('Private Commute')) {
              return 'Private Commute';
           }
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const parts = l.description ? l.description.split(' to ') : [];
              if (parts.length === 2) {
                 start = start || extractAddress(parts[0]);
                 end = end || extractAddress(parts[1]);
              }
           }
           return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
        }).join(' | ');
        if (hcLegs) out.push(hcLegs);
      }
      
      if (parsed.providerTravel && parsed.providerTravel.legs) {
        const pLegs = parsed.providerTravel.legs.map((l: any, idx: number) => {
           if (l.distance === 0 && l.description && l.description.includes('Capped')) return 'MMM6 Capped';
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const parts = l.description ? l.description.split(' to ') : [];
              if (parts.length === 2) {
                 start = start || extractAddress(parts[0]);
                 end = end || extractAddress(parts[1]);
              } else {
                 const arrowParts = l.description ? l.description.split(' → ') : [];
                 if (arrowParts.length === 2) {
                    start = start || extractAddress(arrowParts[0]);
                    end = end || extractAddress(arrowParts[1]);
                 }
              }
           }
           return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
        }).join(' | ');
        if (pLegs) out.push(\`PT: \${pLegs}\`);
      }
      
      if (parsed.abt && parsed.abt.legs) {
        const aLegs = parsed.abt.legs.map((l: any, idx: number) => {
           let start = l.addressStart;
           let end = l.addressEnd;
                    
           if (!start || !end) {
              const arrowParts = l.description ? l.description.split(' → ') : [];
              if (arrowParts.length === 2) {
                 start = start || extractAddress(arrowParts[0]);
                 end = end || extractAddress(arrowParts[1]);
              } else {
                 const parts = l.description ? l.description.split(' to ') : [];
                 if (parts.length === 2) {
                    start = start || extractAddress(parts[0]);
                    end = end || extractAddress(parts[1]);
                 }
              }
           }
           return \`\${cleanLocationStr(start, idx === 0 ? fallbackOrigin : 'Unknown')} ➡️ \${cleanLocationStr(end, fallbackDest)}\`;
        }).join(' | ');
        if (aLegs) out.push(\`ABT: \${aLegs}\`);
      }
          
      return out.join(' ; ') || logStr;
    } catch (e) {
      return logStr;
    }
  };

const expandedLogs = logs.map(log => {`;

code = code.replace(regex, replacementStr);
fs.writeFileSync(file, code);
console.log("Restored formatRouteLog");
