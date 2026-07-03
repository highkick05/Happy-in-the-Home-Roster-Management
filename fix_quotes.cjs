const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  'className="text-[#8B949E] ${wallboardMode ? \'text-[18px]\' : \'text-[13px]\'} line-clamp-2 leading-relaxed"',
  'className={`text-[#8B949E] ${wallboardMode ? \'text-[18px]\' : \'text-[13px]\'} line-clamp-2 leading-relaxed`}'
);

content = content.replace(
  'className="flex flex-col gap-2 w-72 shrink-0 ${wallboardMode ? \'text-[16px] w-96\' : \'text-[13px]\'} text-[#8B949E] mt-0.5 z-10"',
  'className={`flex flex-col gap-2 w-72 shrink-0 ${wallboardMode ? \'text-[16px] w-96\' : \'text-[13px]\'} text-[#8B949E] mt-0.5 z-10`}'
);

content = content.replace(
  'className="w-full px-2 py-1.5 flex items-center justify-between ${wallboardMode ? \'text-[15px]\' : \'text-xs\'} font-semibold text-[#8B949E]"',
  'className={`w-full px-2 py-1.5 flex items-center justify-between ${wallboardMode ? \'text-[15px]\' : \'text-xs\'} font-semibold text-[#8B949E]`}'
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
