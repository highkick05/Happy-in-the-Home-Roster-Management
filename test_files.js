const fs = require('fs');
const content = fs.readFileSync('src/components/Files/FilesView.tsx', 'utf8');

// find table rendering
const match = content.indexOf('<table');
if (match > -1) {
    console.log(content.substring(match - 100, match + 500));
}
