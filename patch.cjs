const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

code = code.replace(
  `const [showSubtasks, setShowSubtasks] = useState(wallboardMode || false);`,
  `const [showSubtasks, setShowSubtasks] = useState(wallboardMode || false);
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: any) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: any) => {
    const dx = e.clientX - mouseDownPos.x;
    const dy = e.clientY - mouseDownPos.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      onEdit();
    }
  };`
);

code = code.replace(
  `onClick={onEdit}`,
  `onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
