const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const isTogglingState = `  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setIsToggling(false);
  }, [task.status]);

  const handleToggleComplete = (e: any) => {
    e.stopPropagation();
    if (isToggling) return;
    setIsToggling(true);
    setTimeout(() => {
      onComplete();
    }, 800);
  };

  const isChecked = task.status === 'Completed' ? !isToggling : isToggling;
`;

code = code.replace("  const [showSubtasks, setShowSubtasks] = useState(wallboardMode || false);", "  const [showSubtasks, setShowSubtasks] = useState(wallboardMode || false);\n" + isTogglingState);

code = code.replace(
  "onClick={(e) => { e.stopPropagation(); onComplete(); }}",
  "onClick={handleToggleComplete}"
);

code = code.replace(
  `<AnimatedCheckbox checked={task.status === "Completed"}`,
  `<AnimatedCheckbox checked={isChecked}`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
