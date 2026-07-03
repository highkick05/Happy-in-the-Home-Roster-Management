const fs = require('fs');
let code = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// Add GripVertical import
code = code.replace(
  "CheckCircle2, Circle, Clock, Flame,",
  "CheckCircle2, Circle, Clock, Flame, GripVertical,"
);

// Add dragControls to props
code = code.replace(
  "onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant,\n  staffList, clientList, wallboardMode \n}: any) {",
  "onToggleSubTask, onAddSubTask, onDeleteSubTask, onToggleImportant,\n  staffList, clientList, wallboardMode, dragControls \n}: any) {"
);

// Remove the complex handlePointerDown and handlePointerUp since we aren't dragging the whole card anymore, it's just normal click now.
// Actually, let's keep it simple: just use onClick={onEdit} instead of pointer down/up.
code = code.replace(
  /const handlePointerDown = [\s\S]*?onEdit\(\);\n    }\n  };/,
  ""
);

code = code.replace(
  "const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });",
  ""
);

// Replace onPointerDown/Up with onClick
code = code.replace(
  `onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}`,
  `onClick={onEdit}`
);

// Add the drag handle before the checkbox
code = code.replace(
  `{/* Left side: Checkbox + Title + Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={\`shrink-0 \${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors \${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}\`}
          >`,
  `{/* Left side: Checkbox + Title + Description */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {!wallboardMode && dragControls && (
            <div
              className="cursor-grab active:cursor-grabbing text-[#8B949E] hover:text-white p-1 -ml-2 transition-colors"
              onPointerDown={(e) => {
                e.stopPropagation();
                dragControls.start(e);
              }}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className={\`shrink-0 \${wallboardMode ? 'mt-1' : 'mt-0.5'} transition-colors \${task.status === 'Completed' ? 'text-brand-green' : 'text-[#8B949E] hover:text-brand-green'}\`}
          >`
);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', code);
