with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

interactive_subtasks = """
      {subTasks.length > 0 && (
        <div className="space-y-1 mb-3 pt-2 border-t border-white/[0.03]">
          {subTasks.map((st: any) => (
            <div key={st.id} className="flex items-center gap-2 group/st">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // In a real app we'd call an API here to toggle this specific subtask,
                  // for now we'll just fire a custom event or let it be handled if we pass a toggle function.
                  // Wait, we don't have a toggle function passed from TasksView!
                }}
                className="shrink-0"
              >
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${st.completed ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E]'}`}>
                  {st.completed ? <CheckSquare className="w-3 h-3 text-white" /> : null}
                </div>
              </button>
              <span className={`text-xs ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}
"""

code = code.replace(
'''      {(subTasks.length > 0 || fileAttachments.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-3 text-xs font-medium text-[#8B949E]">
          {subTasks.length > 0 && (
            <div className={`flex items-center gap-1.5 ${completedSubtasks === subTasks.length ? 'text-brand-green' : ''}`}>
              <CheckSquare className="w-3.5 h-3.5" />
              {completedSubtasks}/{subTasks.length}
            </div>
          )}''',
'''      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 text-xs font-medium text-[#8B949E]">'''
)

code = code.replace(
'''          {fileAttachments.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              {fileAttachments.length}
            </div>
          )}
        </div>
      )}''',
'''          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            {fileAttachments.length} file{fileAttachments.length === 1 ? '' : 's'}
          </div>
        </div>
      )}
      
      {subTasks.length > 0 && (
        <div className="space-y-1.5 mb-3 pt-2 border-t border-white/[0.03]">
          {subTasks.map((st: any) => (
            <div key={st.id} className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${st.completed ? 'bg-brand-teal/20 border-brand-teal/50' : 'border-[#8B949E]/50'}`}>
                  {st.completed ? <CheckSquare className="w-2.5 h-2.5 text-brand-teal" /> : null}
                </div>
              </div>
              <span className={`text-[12px] leading-tight ${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]/90'}`}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      )}'''
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
