const fs = require('fs');
let code = fs.readFileSync('src/components/ProgressNotes/EditorJSWrapper.tsx', 'utf8');

const regex = /selection:bg-brand-blue\/30 selection:text-white \*::selection:bg-brand-blue\/30 \*::selection:text-white/;

const replacementStr = 'selection:bg-brand-blue/30 selection:text-white';

if (regex.test(code)) {
    code = code.replace(regex, replacementStr);
    fs.writeFileSync('src/components/ProgressNotes/EditorJSWrapper.tsx', code);
    console.log('Successfully patched EditorJSWrapper.tsx!');
} else {
    console.log('Regex did not match!');
}
