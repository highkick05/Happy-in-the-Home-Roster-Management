import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Update Task Card render for Planner styling
code = re.sub(
    r'<div\n      ref=\{provided\.innerRef\}.*?onClick=\{onEdit\}.*?className=\{`group relative flex flex-col p-2\.5.*?`\}>.*?<!-- Categories -->',
    r'''<div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onEdit}
      className={`group relative flex flex-col p-3 mb-2 rounded-lg bg-[#1E293B] hover:bg-[#273548] border border-border-subtle shadow-sm transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-xl ring-2 ring-brand-teal/50 rotate-2' : ''}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-[#8B949E] hover:text-white p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
      
      {/* Categories */ }''',
    code,
    flags=re.DOTALL
)

# Fix Category tags
code = re.sub(
    r'\{category && \(\n\s*<div className="flex mb-1\.5">\n\s*<span className="text-\[9px\] font-bold uppercase tracking-wider px-1\.5 py-0\.5 rounded"\s*style=\{\{ backgroundColor: `\$\{category\.color_hex\}30`, color: category\.color_hex \}\}\n\s*>\n\s*\{category\.name\}\n\s*</span>\n\s*</div>\n\s*\)\}',
    r'''{category && (
        <div className="flex mb-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5"
                style={{ backgroundColor: `${category.color_hex}20`, color: category.color_hex, border: `1px solid ${category.color_hex}40` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color_hex }}></span>
            {category.name}
          </span>
        </div>
      )}''',
    code
)

# Fix Title with Checkbox next to it
code = re.sub(
    r'<div className="flex items-start gap-3">\n\s*<button onClick=\{handleCheck\}.*?</button>\n\s*<div className="flex-1 min-w-0">\n\s*<h3.*?</h3>\n\s*\{task\.description && \(\n\s*<p.*?</p>\n\s*\)\}\n\s*</div>\n\s*</div>',
    r'''<div className="flex items-start gap-2.5 mb-2">
        <button onClick={handleCheck} className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${isChecked ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E] group-hover:border-white/50'}`}>
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
      </div>''',
    code,
    flags=re.DOTALL
)

# Move Thumbnail to middle (if exists)
code = re.sub(
    r'\{imageAttachments\.length > 0 && \(\n\s*<div className="flex gap-1\.5 overflow-x-auto mb-2 pb-0\.5 -mx-1\.5 px-1\.5 no-scrollbar">.*?</div>\n\s*\)\}',
    r'''{imageAttachments.length > 0 && (
        <div className="mb-3 -mx-3 mt-1">
          <img src={imageAttachments[0].url} alt="Cover" className="w-full h-24 object-cover border-y border-border-subtle" />
        </div>
      )}''',
    code,
    flags=re.DOTALL
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
