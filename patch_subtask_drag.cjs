const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldSubtasks = `      <AnimatePresence>
        {showSubtasks && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle/50 bg-black/10"
          >`;

const newSubtasks = `      <AnimatePresence>
        {showSubtasks && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-subtle/50 bg-black/10"
            onPointerDown={(e) => e.stopPropagation()}
          >`;

code = code.replace(oldSubtasks, newSubtasks);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
