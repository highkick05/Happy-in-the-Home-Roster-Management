const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace(
  /<div\s*className="cursor-grab active:cursor-grabbing text-\[#8B949E\] hover:text-white p-2 -ml-3 transition-colors flex items-center justify-center rounded-md hover:bg-white\/\[0\.04\]"\s*onPointerDown=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*dragControls\.start\(e\);\s*\}\}\s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*>/m,
  `<div
              className="cursor-grab active:cursor-grabbing text-[#8B949E] hover:text-white px-3 py-4 -ml-4 -my-4 transition-colors flex items-center justify-center rounded-md hover:bg-white/[0.04]"
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
