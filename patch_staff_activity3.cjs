const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

let replaced = false;
code = code.replace(/if \(!isHomeCare && prov_km > 0\) \{/g, () => {
    replaced = true;
    return 'if (!isHomeCare && prov_km > 0 && hasProviderTravelService) {';
});

if (replaced) {
    console.log("Replaced provider travel condition");
}

let replaced2 = false;
code = code.replace(/if \(!isHomeCare && abt_km > 0\) \{/g, () => {
    replaced2 = true;
    return 'if (!isHomeCare && abt_km > 0 && hasABTService) {';
});

if (replaced2) {
    console.log("Replaced abt condition");
}

fs.writeFileSync('src/server.ts', code);
