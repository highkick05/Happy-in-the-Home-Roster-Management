const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const oldExtractStr = `          const extractAddress = (desc) => {
              if (!desc) return '';
              const match = desc.match(/\\(([^)]+)\\)/);
              if (match) {
                  const content = match[1].trim();
                  if (!content.match(/^\\s*[-+]?\\d*\\.?\\d+$/)) {
                      return match;
                  }
              }
              let cleaned = desc.replace(/\\([^)]+\\)/g, '').trim();
              return cleaned || desc.trim();
          };`;

const newExtractStr = `          const extractAddress = (desc) => {
              if (!desc) return null;
              const matches = [...desc.matchAll(/\\(([^)]+)\\)/g)];
              for (let i = matches.length - 1; i >= 0; i--) {
                  const m = matches[i][1];
                  if (!m.includes('%') && !m.match(/^[-+]?\\d*\\.?\\d+,\\s*[-+]?\\d*\\.?\\d+$/)) {
                      return m;
                  }
              }
              let cleaned = desc.replace(/\\([^)]+\\)/g, '').trim();
              return cleaned || desc.trim();
          };`;

if (content.includes(oldExtractStr)) {
    content = content.replace(oldExtractStr, newExtractStr);
    fs.writeFileSync('src/server.ts', content);
    console.log("Patched successfully!");
} else {
    console.log("Could not find the target string.");
}
