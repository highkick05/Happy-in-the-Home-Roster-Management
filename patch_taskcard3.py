import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

# Add Settings to lucide-react import
code = code.replace("Circle } from 'lucide-react';", "Circle, Settings } from 'lucide-react';")

# Add onToggleSubtask to TaskCard
code = code.replace(
    """export function TaskCard({
  task,
  onEdit,
  wallboardMode,
  dragControls,
  provided,
  snapshot
}: any) {""",
    """export function TaskCard({
  task,
  onEdit,
  wallboardMode,
  dragControls,
  provided,
  snapshot,
  onToggleSubtask
}: any) {"""
)

# Replace subtasks map to add onClick
subtask_div_pattern = re.compile(r'<div key={st.id} className="flex items-start gap-2">.*?<div className={`w-3\.5 h-3\.5 rounded-sm flex items-center justify-center border \${st\.completed \? \'bg-brand-teal/20 border-brand-teal/50\' : \'border-\[#8B949E\]/50\'}`}>', re.DOTALL)

code = code.replace(
    """<div key={st.id} className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${st.completed ? 'bg-brand-teal/20 border-brand-teal/50' : 'border-[#8B949E]/50'}`}>""",
    """<div key={st.id} className="flex items-start gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); if (onToggleSubtask) onToggleSubtask(task, st.id); }}>
              <div className="mt-0.5 shrink-0">
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${st.completed ? 'bg-brand-teal/20 border-brand-teal/50' : 'border-[#8B949E]/50 group-hover:border-[#8B949E]'}`}>"""
)

# Also apply the strikethrough logic (already present: `${st.completed ? 'text-[#8B949E] line-through' : 'text-[#E6EDF3]/90'}`)
# Wait, check if that logic is correct. Yes, `st.completed` is truthy, so line-through works.

# Add onManageCategories to TaskModal
code = code.replace(
    """export function TaskModal({
  task,
  staffList,
  clientList,
  categories,
  onClose,
  onSave,
  onDelete
}: any) {""",
    """export function TaskModal({
  task,
  staffList,
  clientList,
  categories,
  onClose,
  onSave,
  onDelete,
  onManageCategories
}: any) {"""
)

# Add button next to category select
select_pattern = """              <select
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
                className="bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none"
              >
                
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>"""

new_select_code = """              <div className="flex items-center gap-1">
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  className="bg-black/20 border border-border-subtle rounded-none px-3 py-1.5 text-sm font-medium text-white focus:border-brand-teal outline-none"
                >
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onManageCategories}
                  className="p-1.5 text-[#8B949E] hover:text-white bg-black/20 hover:bg-black/40 border border-border-subtle rounded-none transition-colors"
                  title="Manage Categories"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>"""

code = code.replace(select_pattern, new_select_code)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
