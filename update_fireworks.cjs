const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const regex = /return \(\n    <div className=\{\`relative flex items-center justify-center \$\{className\}\`\}>\n      <motion\.div\n        initial=\{false\}\n        animate=\{\{ scale: checked \? 1\.1 : 1, opacity: checked \? 1 : 0\.5 \}\}\n      >\n        \{checked \? <CheckSquare className="w-full h-full text-brand-green" \/> : <Square className="w-full h-full text-\[#8B949E\]" \/>\}\n      <\/motion\.div>\n    <\/div>\n  \);/;

const replacement = `return (
    <div className={\`relative flex items-center justify-center \${className}\`}>
      {showFireworks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-brand-green"
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 16,
                y: Math.sin((i * 60 * Math.PI) / 180) * 16,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
      <motion.div
        initial={false}
        animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}
      >
        {checked ? <CheckSquare className="w-full h-full text-brand-green" /> : <Square className="w-full h-full text-[#8B949E]" />}
      </motion.div>
    </div>
  );`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
