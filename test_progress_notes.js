const fs = require('fs');
const content = fs.readFileSync('src/server.ts', 'utf8');
const searchString = 'actualNotes = notes;';
if (content.includes(searchString)) {
  console.log('Progress note fix is confirmed in src/server.ts');
} else {
  console.log('Could not find the fix in src/server.ts');
}
