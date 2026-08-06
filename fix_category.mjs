import fs from 'fs';
let content = fs.readFileSync('src/components/ClientDocuments/ClientDocumentsView.tsx', 'utf8');

content = content.replace(/d\.source === "Templates"/g, 'd.category === "Templates"');
content = content.replace(/d\.source === "Completed"/g, 'd.category === "Completed"');
content = content.replace(/selectedFile\?\.source === category/g, 'selectedFile?.category === category');
content = content.replace(/selectedFile\.source/g, 'selectedFile.category');

fs.writeFileSync('src/components/ClientDocuments/ClientDocumentsView.tsx', content);
