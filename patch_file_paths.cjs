const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const helper = `
function resolveFilePath(systemName) {
  let filePath = path.join(process.cwd(), "data", "uploads", systemName);
  if (!fs.existsSync(filePath) && systemName.startsWith("uploads/")) {
    filePath = path.join(process.cwd(), "data", systemName);
  }
  if (!fs.existsSync(filePath) && systemName.startsWith("data/uploads/")) {
    filePath = path.join(process.cwd(), systemName);
  }
  if (!fs.existsSync(filePath) && systemName.startsWith("/")) {
    filePath = path.join(process.cwd(), "data", "uploads", systemName.substring(1));
  }
  return filePath;
}
`;

content = content.replace(
  '// --- Files APIs ---',
  helper + '\n  // --- Files APIs ---'
);

content = content.replace(
  /const filePath = path\.join\(process\.cwd\(\), "data", "uploads", file\.system_name\);/g,
  'const filePath = resolveFilePath(file.system_name);'
);

fs.writeFileSync('src/server.ts', content);
