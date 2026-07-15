import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Make Kanban Card more compact
code = re.sub(
    r'<div\n\s*ref=\{provided\.innerRef\}\n\s*\{\.\.\.provided\.draggableProps\}\n\s*\{\.\.\.provided\.dragHandleProps\}\n\s*onClick=\{onEdit\}\n\s*className=\{`group relative flex flex-col p-4',
    r'<div\n      ref={provided.innerRef}\n      {...provided.draggableProps}\n      {...provided.dragHandleProps}\n      onClick={onEdit}\n      className={`group relative flex flex-col p-2.5',
    code
)

code = re.sub(
    r'<h3 className=\{`text-\[15px\] font-semibold leading-snug mb-2 \$\{isChecked \? \'text-\[\#8B949E\] line-through\' : \'text-\[\#E6EDF3\]\'\}`\}>',
    r'<h3 className={`text-[13px] font-semibold leading-snug mb-1.5 ${isChecked ? \'text-[#8B949E] line-through\' : \'text-[#E6EDF3]\'}`}>',
    code
)

code = re.sub(
    r'<p className="text-\[13px\] text-\[\#8B949E\] line-clamp-2 mb-3">',
    r'<p className="text-[11px] text-[#8B949E] line-clamp-2 mb-2 leading-tight">',
    code
)

code = re.sub(
    r'<div className="flex gap-2 overflow-x-auto mb-3 pb-1 -mx-2 px-2 no-scrollbar">',
    r'<div className="flex gap-1.5 overflow-x-auto mb-2 pb-0.5 -mx-1.5 px-1.5 no-scrollbar">',
    code
)

code = re.sub(
    r'<img key=\{idx\} src=\{img\.url\} alt=\{img\.filename\} className="h-16 w-16 object-cover rounded-lg border border-border-subtle shrink-0" />',
    r'<img key={idx} src={img.url} alt={img.filename} className="h-10 w-10 object-cover rounded-md border border-border-subtle shrink-0" />',
    code
)

# Subtasks and attachments margins
code = re.sub(
    r'<div className="flex flex-wrap gap-3 mb-3 text-xs font-medium text-\[\#8B949E\]">',
    r'<div className="flex flex-wrap gap-2 mb-2 text-[10px] font-medium text-[#8B949E]">',
    code
)

code = re.sub(
    r'<div className="space-y-1.5 mb-3 pt-2 border-t border-white/\[0\.03\]">',
    r'<div className="space-y-1 mb-2 pt-1.5 border-t border-white/[0.03]">',
    code
)

code = re.sub(
    r'<span className=\{`text-\[12px\] leading-tight \$\{st\.completed \? \'text-\[\#8B949E\] line-through\' : \'text-\[\#E6EDF3\]/90\'\}`\}>',
    r'<span className={`text-[11px] leading-tight ${st.completed ? \'text-[#8B949E] line-through\' : \'text-[#E6EDF3]/90\'}`}>',
    code
)

code = re.sub(
    r'<div className="mt-auto pt-3 flex items-center justify-between border-t border-white/\[0\.03\]">',
    r'<div className="mt-auto pt-2 flex items-center justify-between border-t border-white/[0.03]">',
    code
)

# Modal Form Save Button Fix and Compactness
code = re.sub(
    r'<div className="bg-brand-navy border border-border-subtle rounded-xl w-full max-w-3xl max-h-\[90vh\] flex flex-col shadow-2xl overflow-hidden">',
    r'<div className="bg-brand-navy border border-border-subtle rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-sm">',
    code
)

code = re.sub(
    r'<div className="flex items-center justify-between p-5 border-b border-border-subtle shrink-0 bg-black/20">',
    r'<div className="flex items-center justify-between p-3 border-b border-border-subtle shrink-0 bg-black/20">',
    code
)

code = re.sub(
    r'<form id="task-form" onSubmit=\{handleSubmit\} className="flex-1 overflow-y-auto p-6 space-y-6">',
    r'<form id="task-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">',
    code
)

code = re.sub(
    r'<input\s*required\s*type="text"\s*value=\{formData\.title\}',
    r'<input\n                required\n                type="text"\n                value={formData.title}',
    code
)

code = re.sub(
    r'<input\s*type="text"\s*value=\{newSubtask\}',
    r'<input\n                type="text"\n                value={newSubtask}',
    code
)

code = re.sub(
    r'<div className="p-5 border-t border-border-subtle bg-black/20 flex justify-end gap-3 shrink-0">',
    r'<div className="p-3 border-t border-border-subtle bg-black/20 flex justify-end gap-2 shrink-0">',
    code
)

code = re.sub(
    r'<button type="submit" form="task-form" className="px-6 py-2 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 shadow-sm transition-colors">\s*Save Task\s*</button>',
    r'<button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 shadow-sm transition-colors text-sm">\n            Save Task\n          </button>',
    code
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
