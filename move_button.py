import re

with open("src/components/Tasks/TaskCard.tsx", "r") as f:
    code = f.read()

code = code.replace(
'''          </div>
        </form>
        <div className="p-3 border-t border-border-subtle bg-black/20 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2 font-medium text-white hover:bg-white/5 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-1.5 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 shadow-sm transition-colors text-sm">
            Save Task
          </button>
        </div>''',
'''          </div>
          
          <div className="pt-4 mt-2 border-t border-white/[0.05] flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2 font-medium text-white hover:bg-white/5 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-1.5 bg-brand-teal text-white font-semibold rounded-lg hover:bg-brand-teal/90 shadow-sm transition-colors text-sm">
              Save Task
            </button>
          </div>
        </form>'''
)

with open("src/components/Tasks/TaskCard.tsx", "w") as f:
    f.write(code)
