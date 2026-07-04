const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldFireworks = `      <AnimatePresence>
        {showFireworks && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-brand-green rounded-full pointer-events-none"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ 
                  opacity: 0, 
                  x: Math.cos(i * 60 * Math.PI / 180) * 24, 
                  y: Math.sin(i * 60 * Math.PI / 180) * 24,
                  scale: 0
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>`;

const newFireworks = `      <AnimatePresence>
        {showFireworks && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-brand-green rounded-full pointer-events-none"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ 
                  opacity: 0, 
                  x: Math.cos(i * 45 * Math.PI / 180) * 48, 
                  y: Math.sin(i * 45 * Math.PI / 180) * 48,
                  scale: 0
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>`;

code = code.replace(oldFireworks, newFireworks);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
