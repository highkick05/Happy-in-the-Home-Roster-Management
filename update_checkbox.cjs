const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldCheck = `function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
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
        initial={false}
        animate={{ scale: checked ? 1.1 : 1, opacity: checked ? 1 : 0.5 }}
      >
        {checked ? <CheckSquare className="w-full h-full text-brand-green" /> : <Square className="w-full h-full text-[#8B949E]" />}
      </motion.div>
    </div>
  );
}`;

const newCheck = `function AnimatedCheckbox({ checked, className }: { checked: boolean, className?: string }) {
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
      {showFireworks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-brand-green"
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.5, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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
  );
}`;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
