const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

const oldStr = `  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      onAddSubTask(task.id, newSubTask.trim());
      setNewSubTask('');
    }
  };`;

const newStr = `  const handleAddSubTask = () => {
    if (newSubTask.trim()) {
      onAddSubTask(task.id, newSubTask.trim());
      setNewSubTask('');
    }
  };

  const clickStartRef = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: any) => {
    clickStartRef.current = { x: e.clientX, y: e.clientY };
    if (!wallboardMode && dragControls) {
      dragControls.start(e);
    }
  };

  const handlePointerUp = (e: any) => {
    if (!clickStartRef.current) return;
    const dx = e.clientX - clickStartRef.current.x;
    const dy = e.clientY - clickStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If we moved less than 5 pixels, consider it a click
    if (distance < 5) {
      onEdit();
    }
    clickStartRef.current = null;
  };`;

code = code.replace(oldStr, newStr);

const oldDiv = `className={\`flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}
        onClick={onEdit}
        onPointerDown={(e) => {
          if (!wallboardMode && dragControls) {
            dragControls.start(e);
          }
        }}`;

const newDiv = `className={\`flex flex-col md:flex-row md:items-center \${wallboardMode ? 'p-4 gap-4' : 'px-4 py-3 gap-3'} cursor-pointer select-none\`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}`;

code = code.replace(oldDiv, newDiv);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
