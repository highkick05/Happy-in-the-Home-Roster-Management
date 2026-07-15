import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# 1. Remove the entire <div className="flex justify-between items-start mb-2"> ... </div>
old_badge_div = """      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-1.5">
          {task.category_name && (
            <span 
              className="text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.category_color }}></span>
              {task.category_name}
            </span>
          )}
        </div>
        <div className="text-[#8B949E] group-hover:text-[#E6EDF3] transition-colors" {...provided.dragHandleProps}>
          <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>"""

code = code.replace(old_badge_div, "")

# 2. Modify imageAttachments rendering
old_img = """      {imageAttachments.length > 0 && (
        <div className="mb-3 -mx-3 mt-1">
          <img src={imageAttachments[0].url} alt="Cover" className="w-full h-24 object-cover border-y border-border-subtle" />
        </div>
      )}"""

new_img = """      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 mt-1">
          {imageAttachments.map((img: any, idx: number) => (
            <a 
              key={idx}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-12 border border-border-subtle hover:border-brand-teal transition-colors"
            >
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}"""

code = code.replace(old_img, new_img)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
