const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace(
  /<GripVertical className="w-5 h-5" \/>/g,
  '<GripVertical className="w-5 h-5 pointer-events-none" />'
);

code = code.replace(
  /className="cursor-grab active:cursor-grabbing text-\[#8B949E\] hover:text-white px-3 py-4 -ml-4 -my-4 transition-colors flex items-center justify-center rounded-md hover:bg-white\/\[0\.04\]"/,
  'style={{ touchAction: "none" }} className="cursor-grab active:cursor-grabbing text-[#8B949E] hover:text-white px-3 py-4 -ml-4 -my-4 transition-colors flex items-center justify-center rounded-md hover:bg-white/[0.04]"'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
