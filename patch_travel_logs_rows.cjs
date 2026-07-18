const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacementStr = `  const expandedLogs = [];
  logs.forEach(log => {
    let parsed = {};
    try {
      if (log.services_json && log.services_json.startsWith('{')) {
        parsed = JSON.parse(log.services_json);
      }
    } catch (e) {}

    const fallbackOrigin = log.origin_address || 'Unknown';
    const fallbackDest = log.destination_address || 'Unknown';
    const cleanLocationStr = (val: string, fallback: string) => {
        if (!val || val.trim().toLowerCase() === 'location' || val.trim().toLowerCase() === 'unknown' || val.trim() === '') {
            return fallback;
        }
        return val;
    };

    let hasTravel = false;

    if (parsed.homeCareTravel && parsed.homeCareTravel.legs && parsed.homeCareTravel.legs.length > 0) {
      hasTravel = true;
      const hcLegs = parsed.homeCareTravel.legs.map((l: any, idx: number) => {
         if (l.description && l.description.includes('Private Commute')) return 'Private Commute';
         const start = l.startAddress ? extractAddress(l.startAddress) : null;
         const end = l.endAddress ? extractAddress(l.endAddress) : null;
         if (!start && !end) return \`Leg \${idx+1} \${l.distanceText || ''}\`;
         return \`\${cleanLocationStr(start || '', fallbackOrigin)} → \${cleanLocationStr(end || '', fallbackDest)}\`;
      });
      expandedLogs.push({
        ...log,
        _rowId: log.id + '_hc',
        _category: 'Home Care Travel',
        _route: hcLegs.join(', ')
      });
    } else {
      if (parsed.providerTravel && parsed.providerTravel.distanceValue > 0) {
        hasTravel = true;
        const start = parsed.providerTravel.startAddress ? extractAddress(parsed.providerTravel.startAddress) : null;
        const end = parsed.providerTravel.endAddress ? extractAddress(parsed.providerTravel.endAddress) : null;
        expandedLogs.push({
          ...log,
          _rowId: log.id + '_pt',
          _category: 'Provider Travel',
          _route: \`\${cleanLocationStr(start || '', fallbackOrigin)} → \${cleanLocationStr(end || '', fallbackDest)}\`
        });
      }
      if (parsed.activityBasedTransport && parsed.activityBasedTransport.distanceValue > 0) {
        hasTravel = true;
        const start = parsed.activityBasedTransport.startAddress ? extractAddress(parsed.activityBasedTransport.startAddress) : null;
        const end = parsed.activityBasedTransport.endAddress ? extractAddress(parsed.activityBasedTransport.endAddress) : null;
        expandedLogs.push({
          ...log,
          _rowId: log.id + '_abt',
          _category: 'Activity Based Transport',
          _route: \`\${cleanLocationStr(start || '', fallbackDest)} → \${cleanLocationStr(end || '', fallbackDest)}\`
        });
      }
    }

    if (!hasTravel) {
       // If no specific parsed travel data but maybe odometers exist, still show one row.
       expandedLogs.push({
          ...log,
          _rowId: log.id + '_none',
          _category: 'Other Travel',
          _route: log.services_json === 'No route logged' ? 'No route logged' : 'No route details'
       });
    }
  });`;

// Replace logs.map with expandedLogs.map
// Also add Category column
const findTableHead = `<th className="px-4 py-3 border-r border-border-subtle/30">Client</th>`;
const newTableHead = `<th className="px-4 py-3 border-r border-border-subtle/30">Client</th>
                  <th className="px-4 py-3 border-r border-border-subtle/30">Category</th>`;

const mapTarget = `logs.map(log => {
                    const isEditing = isEditingOdo === log.id.toString();`;
const newMapTarget = `expandedLogs.map(log => {
                    const isEditing = isEditingOdo === log.id.toString();`;

const keyTarget = `                      <tr key={log.id} className="hover:bg-brand-bg/50 transition-colors group">`;
const keyReplacement = `                      <tr key={log._rowId} className="hover:bg-brand-bg/50 transition-colors group">`;

const routeTarget = `                        <td className="px-4 py-3 border-r border-border-subtle/30 max-w-sm truncate" title={formatRouteLog(log.services_json, log) || ''}>
                          {formatRouteLog(log.services_json, log)}
                        </td>`;
const routeReplacement = `                        <td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border bg-brand-bg border-border-subtle text-[#E6EDF3]">
                            {log._category}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-border-subtle/30 max-w-sm truncate" title={log._route}>
                          {log._route}
                        </td>`;

code = code.replace(findTableHead, newTableHead);
code = code.replace(mapTarget, newMapTarget);
code = code.replace(keyTarget, keyReplacement);
code = code.replace(routeTarget, routeReplacement);

// Insert expandedLogs definition before the return statement of TravelLogsView
const returnTarget = `  return (
    <div className="flex flex-col h-full bg-brand-bg relative min-h-screen">`;
code = code.replace(returnTarget, replacementStr + '\n\n' + returnTarget);

fs.writeFileSync(file, code);
