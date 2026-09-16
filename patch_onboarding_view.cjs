const fs = require('fs');
const file = 'src/components/Onboarding/OnboardingView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const mapped: Step\[\] = dynData\.map\(d => \(\{[\s\S]*?\}\)\);/,
    `const mapped: Step[] = dynData.map((d: any) => ({
          id: \`dynamic_\${d.id}\`,
          title: d.title,
          description: d.description || '',
          type: d.upload_required ? 'upload' : 'confirm',
          optional: d.is_mandatory ? false : true,
          links: d.media_url ? [{ text: 'View Attached Media', url: d.media_url }] : []
        }));`
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched onboarding view');
