const fs = require('fs');
let content = fs.readFileSync('src/components/Tasks/TaskCard.tsx', 'utf8');

// 1. Add URGENT badge next to Flame icon
const flameButton = `          <motion.button
            onClick={(e: any) => { e.stopPropagation(); onToggleImportant(); }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className={\`mt-0.5 p-1.5 rounded-full transition-colors z-10 \${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:text-orange-400 hover:bg-orange-500/10'}\`}
            title="Toggle Importance"
          >
            <Flame className={\`w-5 h-5 \${task.is_important ? 'fill-orange-500/50 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : ''}\`} />
          </motion.button>`;

const replacementFlameButton = `          <div className="flex flex-col items-end gap-1">
            <motion.button
              onClick={(e: any) => { e.stopPropagation(); onToggleImportant(); }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              className={\`mt-0.5 p-1.5 rounded-full transition-colors z-10 \${task.is_important ? 'text-orange-500 bg-orange-500/10' : 'text-[#8B949E] hover:text-orange-400 hover:bg-orange-500/10'}\`}
              title="Toggle Importance"
            >
              <div className="flex items-center space-x-1">
                {task.is_important ? <span className="text-[10px] font-bold text-orange-500 tracking-wider">URGENT</span> : null}
                <Flame className={\`w-5 h-5 \${task.is_important ? 'fill-orange-500/50 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : ''}\`} />
              </div>
            </motion.button>
          </div>`;

content = content.replace(flameButton, replacementFlameButton);

// 2. Add created_at date
const datesTarget = `            {(task.start_date || task.end_date) && (
              <div className="flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                <span className="truncate">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString() : '...'} - {task.end_date ? new Date(task.end_date).toLocaleDateString() : '...'}
                </span>
              </div>
            )}`;

const replacementDates = `            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate" title="Created date">
                {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'New'}
              </span>
            </div>
            {(task.start_date || task.end_date) && (
              <div className="flex items-center space-x-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                <span className="truncate">
                  {task.start_date ? new Date(task.start_date).toLocaleDateString() : '...'} - {task.end_date ? new Date(task.end_date).toLocaleDateString() : '...'}
                </span>
              </div>
            )}`;

content = content.replace(datesTarget, replacementDates);

// 3. Sub-tasks in columns
const subTasksTarget = `        <div className="px-2 pb-2 pt-0.5 space-y-1">
          {task.sub_tasks?.map((st: any) => (`;

const subTasksReplacement = `        <div className="px-2 pb-2 pt-0.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {task.sub_tasks?.map((st: any) => (`;

const subTasksEndTarget = `          ))}
          <div className="flex items-center space-x-2 mt-2 pt-1 border-t border-border-subtle/50">`;

const subTasksEndReplacement = `            ))}
          </div>
          <div className="flex items-center space-x-2 mt-2 pt-1 border-t border-border-subtle/50">`;

content = content.replace(subTasksTarget, subTasksReplacement);
content = content.replace(subTasksEndTarget, subTasksEndReplacement);

fs.writeFileSync('src/components/Tasks/TaskCard.tsx', content);
