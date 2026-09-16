const fs = require('fs');
let content = fs.readFileSync('src/components/Onboarding/OnboardingView.tsx', 'utf8');

// Replace the array checks with a check that includes requires_expiry
content = content.replace(
  /\{\['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine'\]\.includes\(step\.id\) && \(/,
  "{(['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine'].includes(step.id) || (step.id.startsWith('dynamic_') && step.requires_expiry === 1)) && ("
);

content = content.replace(
  /\{\['ndis_screening', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine', 'police_check'\]\.includes\(step\.id\) && \(/g,
  "{(['ndis_screening', 'cpr', 'first_aid', 'manual_handling', 'flu_shot', 'immunisation', 'covid_vaccine', 'police_check'].includes(step.id) || (step.id.startsWith('dynamic_') && step.requires_expiry === 1)) && ("
);

content = content.replace(
  /\{\['wwcc', 'ahpra', 'driver_license', 'first_aid', 'cpr', 'manual_handling', 'car_insurance', 'flu_shot', 'police_check'\]\.includes\(step\.id\) && \(/,
  "{(['wwcc', 'ahpra', 'driver_license', 'first_aid', 'cpr', 'manual_handling', 'car_insurance', 'flu_shot', 'police_check'].includes(step.id) || (step.id.startsWith('dynamic_') && step.requires_expiry === 1)) && ("
);

// We need to also patch the traffic light checks for ID Number Redacted
content = content.replace(
  /\{\['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine', 'police_check'\]\.includes\(step\.id\) && \(/,
  "{(['ndis_screening', 'wwcc', 'cpr', 'first_aid', 'manual_handling', 'vevo', 'ahpra', 'driver_license', 'car_insurance', 'flu_shot', 'immunisation', 'covid_vaccine', 'police_check'].includes(step.id) || (step.id.startsWith('dynamic_') && step.requires_expiry === 1)) && ("
);


fs.writeFileSync('src/components/Onboarding/OnboardingView.tsx', content);
