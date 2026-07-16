import re

with open("src/components/Directory/EmploymentContractModal.tsx", "r") as f:
    code = f.read()

target1 = """    contractDate: new Date().toISOString().split('T')[0],
    commencementDate: new Date().toISOString().split('T')[0],
    probationPeriod: '6 Months',"""
replacement1 = """    contractDate: new Date().toISOString().split('T')[0],
    returnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    commencementDate: new Date().toISOString().split('T')[0],
    probationPeriod: '6 Months',"""
code = code.replace(target1, replacement1)

target2 = """              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Probation Period</label>
                <select 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.probationPeriod} onChange={e => setFormData(p => ({ ...p, probationPeriod: e.target.value }))}
                >
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>None</option>
                </select>
              </div>
            </div>"""
replacement2 = """              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Probation Period</label>
                <select 
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue"
                  value={formData.probationPeriod} onChange={e => setFormData(p => ({ ...p, probationPeriod: e.target.value }))}
                >
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>None</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Return Date</label>
                <input 
                  type="date"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  value={formData.returnDate} onChange={e => setFormData(p => ({ ...p, returnDate: e.target.value }))}
                />
              </div>
            </div>"""
code = code.replace(target2, replacement2)

with open("src/components/Directory/EmploymentContractModal.tsx", "w") as f:
    f.write(code)

