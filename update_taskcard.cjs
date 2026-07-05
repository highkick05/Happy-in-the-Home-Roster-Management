const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /<motion\.div[\s\S]*?className=\{`bg-brand-navy border \$\{task\.is_important \? 'border-orange-500\/50 shadow-\[0_0_15px_rgba\(249,115,22,0\.1\)\]' : 'border-border-subtle hover:border-\[#30363d\]'\} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden select-none`\}[\s\S]*?>[\s\S]*?<div[\s\S]*?className=\{`flex flex-col md:flex-row md:items-center \$\{wallboardMode \? 'p-4 gap-4' : 'px-4 py-3 gap-3'\} cursor-pointer select-none`\}/;

const replacementStr = `<motion.div 
      className={\`bg-brand-navy border \${task.is_important ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-border-subtle hover:border-[#30363d]'} rounded-xl flex flex-col relative transition-all duration-200 group overflow-hidden select-none\`}
    >
      {/* Overall Progress Background */}
      {totalSubtasks > 0 && task.status !== 'Completed' && (
        <div 
          className="absolute top-0 left-0 bottom-0 bg-brand-teal/5 pointer-events-none transition-all duration-500 z-0"
          style={{ width: \`\${progress}%\` }}
        />
      )}
      
      {/* Top Progress Bar */}
      {totalSubtasks > 0 && task.status !== 'Completed' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          <motion.div 
            className="h-full bg-brand-teal transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: \`\${progress}%\` }}
          />
        </div>
      )}

      <div 
        className={\`relative z-10 flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}`;

content = content.replace(regex, replacementStr);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
