with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace the Kanban Card View div start
old_card_div = """    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-2.5 bg-brand-navy border border-border-subtle rounded-xl shadow-sm mb-3 cursor-pointer hover:border-brand-teal/50 transition-colors ${snapshot.isDragging ? 'opacity-90 shadow-xl ring-2 ring-brand-teal scale-[1.02]' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">"""

new_card_div = """    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-3 bg-[#1E293B] hover:bg-[#273548] border border-border-subtle rounded-xl shadow-sm mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-[#8B949E] hover:text-white p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-between items-start mb-2">"""

code = code.replace(old_card_div, new_card_div)

# Replace the Title and Checkbox
old_title = """      <h3 className={`text-[13px] font-semibold leading-snug mb-1.5 ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
        {task.title}
      </h3>
            
      {task.description && (
        <p className="text-[11px] text-[#8B949E] line-clamp-2 mb-2 leading-tight">
          {task.description}
        </p>
      )}"""

new_title = """      <div className="flex items-start gap-2.5 mb-2">
        <button onClick={(e) => { e.stopPropagation(); /* TODO implement check */ }} className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${isChecked ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E] group-hover:border-white/50'}`}>
          {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-medium leading-snug ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-[12px] text-[#8B949E] line-clamp-2 mt-1 leading-tight">
              {task.description}
            </p>
          )}
        </div>
      </div>"""

code = code.replace(old_title, new_title)

# Replace Category tag styling
old_tag = """          {task.category_name && (
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              {task.category_name}
            </span>
          )}"""

new_tag = """          {task.category_name && (
            <span 
              className="text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.category_color }}></span>
              {task.category_name}
            </span>
          )}"""

code = code.replace(old_tag, new_tag)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
