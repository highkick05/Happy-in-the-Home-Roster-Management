const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

content = content.replace(
  /<AnimatePresence>\s*\{isExpanded && \(\s*<motion\.div/,
  '<AnimatePresence>\n        {isExpanded && (\n          <motion.div \n            key="subtasks"'
);

const targetProgress = `      {/* Top Progress Bar */}
      {totalSubtasks > 0 && !isChecked && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          <motion.div 
            className="h-full bg-brand-teal transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: \`\${progress}%\` }}
          />
        </div>
      )}`;

const replacementProgress = `      {/* Top Progress Bar */}
      {totalSubtasks > 0 && !isChecked && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-10">
          {/* Main progress */}
          <motion.div 
            className="absolute top-0 left-0 h-full bg-brand-teal"
            initial={{ width: 0 }}
            animate={{ width: \`\${progress}%\` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
          {/* Trailing fuse spark */}
          <motion.div 
            className="absolute top-0 h-full w-2 bg-orange-400 shadow-[0_0_10px_4px_rgba(251,146,60,0.8)] rounded-full z-10"
            style={{ y: '-10%' }}
            initial={{ left: 0 }}
            animate={{ left: \`calc(\${progress}% - 4px)\` }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.1 }}
          />
        </div>
      )}`;

content = content.replace(targetProgress, replacementProgress);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
