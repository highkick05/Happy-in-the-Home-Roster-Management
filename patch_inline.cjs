const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// Change the inline progress bar to toggle and always be visible, but maybe look different when open, or just add a chevron.
code = code.replace(
  "{totalSubtasks > 0 && !showSubtasks && (",
  "{totalSubtasks > 0 && ("
);

code = code.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); setShowSubtasks\(true\); \}\}/,
  "onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks); }}"
);

// Add a chevron to the inline progress bar
code = code.replace(
  `                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{completedSubtasks}/{totalSubtasks}</span>
                  </div>
                  <div className="w-32 h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-teal"
                      initial={{ width: 0 }}
                      animate={{ width: \`\${progress}%\` }}
                    />
                  </div>
               </div>`,
  `                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{completedSubtasks}/{totalSubtasks}</span>
                  </div>
                  <div className="w-32 h-1.5 bg-[#0d1117] rounded-full overflow-hidden hidden sm:block">
                    <motion.div 
                      className="h-full bg-brand-teal"
                      initial={{ width: 0 }}
                      animate={{ width: \`\${progress}%\` }}
                    />
                  </div>
                  <div className="ml-1 text-[#8B949E]">
                    {showSubtasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
               </div>`
);

// We need to import ChevronDown and ChevronRight
if (!code.includes('ChevronDown')) {
  code = code.replace(
    "ListChecks}",
    "ListChecks, ChevronDown, ChevronRight}"
  );
}

// Remove the progress bar from the expanded subtasks view to avoid redundancy
code = code.replace(
  /<div className="w-full h-1\.5 bg-\[#0d1117\] rounded-full overflow-hidden mb-2">[\s\S]*?<\/div>/,
  ""
);

code = code.replace(
  /<div className="flex items-center justify-between text-\[11px\] font-medium text-\[#8B949E\] uppercase tracking-wider mb-1">[\s\S]*?<\/div>/,
  ""
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
