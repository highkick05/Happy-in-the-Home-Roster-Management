const fs = require('fs');
let content = fs.readFileSync('src/components/Kiosk/WallboardView.tsx', 'utf8');

content = content.replace(
  /if \(a\.is_important !== b\.is_important\) \{\s*return \(b\.is_important \|\| 0\) - \(a\.is_important \|\| 0\);\s*\}\s*return b\.id - a\.id;/g,
  `if (a.is_important !== b.is_important) {
                        return (b.is_important || 0) - (a.is_important || 0);
                      }
                      if (a.sort_order !== b.sort_order) {
                        return (a.sort_order || 0) - (b.sort_order || 0);
                      }
                      return b.id - a.id;`
);

fs.writeFileSync('src/components/Kiosk/WallboardView.tsx', content);
