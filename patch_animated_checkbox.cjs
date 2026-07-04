const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useRef } from 'react';");

const oldAnimatedCheckbox = `function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    if (checked) {
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 800);
      return () => clearTimeout(timer);
    }
  }, [checked]);

  return (
    <div className={\`relative flex items-center justify-center \${className}\`}>
      <motion.div
        className={\`w-full h-full rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors \${checked ? 'bg-brand-green border-brand-green' : 'border-[#8B949E] bg-transparent group-hover:border-brand-green'}\`}
        initial={false}
        animate={{ 
          scale: checked ? [1, 0.8, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3/4 h-3/4"
            >
              <motion.polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showFireworks && (
          <>
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-brand-green rounded-full pointer-events-none"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ 
                  opacity: 0, 
                  x: Math.cos(i * 36 * Math.PI / 180) * 60, 
                  y: Math.sin(i * 36 * Math.PI / 180) * 60,
                  scale: 0
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}`;

const newAnimatedCheckbox = `function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
  const [showFireworks, setShowFireworks] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (checked && !isFirstRender.current) {
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 800);
      return () => clearTimeout(timer);
    }
  }, [checked]);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <div className={\`relative flex items-center justify-center \${className}\`}>
      <motion.div
        className={\`w-full h-full rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors \${checked ? 'bg-brand-green border-brand-green' : 'border-[#8B949E] bg-transparent group-hover:border-brand-green'}\`}
        initial={false}
        animate={{ 
          scale: (checked && !isFirstRender.current) ? [1, 0.8, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              initial={isFirstRender.current ? { opacity: 1, pathLength: 1 } : { opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3/4 h-3/4"
            >
              <motion.polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showFireworks && (
          <>
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-brand-green rounded-full pointer-events-none"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{ 
                  opacity: 0, 
                  x: Math.cos(i * 36 * Math.PI / 180) * 60, 
                  y: Math.sin(i * 36 * Math.PI / 180) * 60,
                  scale: 0
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}`;

code = code.replace(oldAnimatedCheckbox, newAnimatedCheckbox);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
