const fs = require('fs');

// Patch OnboardingView.tsx
let obContent = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');
obContent = obContent.replace(
    'const res = await fetch(`/api/files`, {',
    'const res = await fetch(`/api/files?context=STAFF_ONBOARDING&targetUserId=${contextUserId || \'\'}`, {'
);
fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', obContent);

// Patch VehiclesView.tsx
let vvContent = fs.readFileSync('src/components/VehiclesView.tsx', 'utf8');
// There are two uploads in VehiclesView (new vehicle and edit vehicle)
vvContent = vvContent.replace(
    /const res = await fetch\(url, \{\n\s*method: "POST",/g,
    'const res = await fetch(url.includes("?") ? url : `${url}?context=STAFF_VEHICLES&targetUserId=${newVehicle?.user_id || originalVehicle?.user_id || user?.id || \'\'}`, {\n        method: "POST",'
);
fs.writeFileSync('src/components/VehiclesView.tsx', vvContent);
console.log("Patched frontend!");
