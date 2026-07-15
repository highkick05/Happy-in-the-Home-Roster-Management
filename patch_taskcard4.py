import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Replace the Title and Checkbox
code = re.sub(
    r'<h3 className=\{`text-\[13px\] font-semibold leading-snug mb-1\.5 \$\{isChecked \? \'text-\[\#8B949E\] line-through\' : \'text-\[\#E6EDF3\]\'\}`\}>\s*\{task\.title\}\s*</h3>',
    r'''<div className="flex items-start gap-2.5 mb-2 mt-1">
        <button onClick={(e) => { e.stopPropagation(); /* TODO */ }} className={`mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${isChecked ? 'bg-brand-teal border-brand-teal' : 'border-[#8B949E] group-hover:border-white/50'}`}>
          {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className={`text-[14px] font-medium leading-snug ${isChecked ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]'}`}>
            {task.title}
          </h3>
        </div>
      </div>''',
    code
)

# And move the description inside that div!
code = re.sub(
    r'</div>\n      </div>\s*\{task\.description && \(\s*<p className="text-\[11px\] text-\[\#8B949E\] line-clamp-2 mb-2 leading-tight">\s*\{task\.description\}\s*</p>\s*\)\}',
    r'''          {task.description && (
            <p className="text-[12px] text-[#8B949E] line-clamp-2 mt-1 leading-tight">
              {task.description}
            </p>
          )}
        </div>
      </div>''',
    code
)


# Replace Category tag styling
code = re.sub(
    r'\{task\.category_name && \(\s*<span\s*className="text-\[10px\] font-bold px-2 py-0\.5 rounded-md uppercase tracking-wider"\s*style=\{\{ backgroundColor: `\$\{task\.category_color\}20`, color: task\.category_color, border: `1px solid \$\{task\.category_color\}40` \}\}\s*>\s*\{task\.category_name\}\s*</span>\s*\)\}',
    r'''{task.category_name && (
            <span 
              className="text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ backgroundColor: `${task.category_color}20`, color: task.category_color, border: `1px solid ${task.category_color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.category_color }}></span>
              {task.category_name}
            </span>
          )}''',
    code
)


with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
