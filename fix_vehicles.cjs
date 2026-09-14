const fs = require('fs');
let vvContent = fs.readFileSync('src/components/VehiclesView.tsx', 'utf8');

vvContent = vvContent.replace(
    'const res = await fetch(url.includes("?") ? url : `${url}?context=STAFF_VEHICLES&targetUserId=${newVehicle?.user_id || originalVehicle?.user_id || user?.id || \'\'}`, {',
    'const res = await fetch(url.includes("?") ? url : `${url}?context=STAFF_VEHICLES&targetUserId=${newVehicle?.user_id || user?.id || \'\'}`, {'
);

vvContent = vvContent.replace(
    'const res = await fetch(url.includes("?") ? url : `${url}?context=STAFF_VEHICLES&targetUserId=${newVehicle?.user_id || originalVehicle?.user_id || user?.id || \'\'}`, {',
    'const res = await fetch(url.includes("?") ? url : `${url}?context=STAFF_VEHICLES&targetUserId=${originalVehicle?.user_id || user?.id || \'\'}`, {'
);

fs.writeFileSync('src/components/VehiclesView.tsx', vvContent);
console.log("Fixed VehiclesView");
