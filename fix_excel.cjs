const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// Replace "out.join(' ; ') || logStr;" with "out.join('\n') || logStr;" in formatRouteLog
content = content.replace(/out\.join\(' ; '\) \|\| logStr/g, "out.join('\\n') || logStr");

// Add TRANSPORT KM to excel columns
content = content.replace(
    /\{ header: "CLAIMABLE TRAVEL", key: "claimableTravel", width: 45 \},/,
    `{ header: "CLAIMABLE TRAVEL", key: "claimableTravel", width: 45 },\n          { header: "TRANSPORT KM", key: "transportKM", width: 15 },`
);

// Add transportKM to row
content = content.replace(
    /claimableTravel: claimableTravelCell,/,
    `claimableTravel: claimableTravelCell,\n            transportKM: totalTransportKM,`
);

// We need to define totalTransportKM before we use it
content = content.replace(
    /let claimableTravelCell = "-";/,
    `let claimableTravelCell = "-";\n          const totalTransportKM = p_km + hc_km + (s.abt_km || 0) + " km";`
);

fs.writeFileSync('src/server.ts', content);
