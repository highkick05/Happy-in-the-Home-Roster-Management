import re

with open("src/components/Directory/EmploymentContractModal.tsx", "r") as f:
    code = f.read()

target1 = """    industrialInstrument: 'Social, Community, Home Care and Disability Services Industry Award 2010 [MA000100]',
    commencementDate: new Date().toISOString().split('T')[0],
    probationPeriod: '6 Months',"""
replacement1 = """    industrialInstrument: 'Social, Community, Home Care and Disability Services Industry Award 2010 [MA000100]',
    contractDate: new Date().toISOString().split('T')[0],
    commencementDate: new Date().toISOString().split('T')[0],
    probationPeriod: '6 Months',"""
code = code.replace(target1, replacement1)

target2 = """              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Commencement Date</label>"""
replacement2 = """              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Contract Date</label>
                <input 
                  type="date"
                  className="w-full bg-black/40 border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-brand-blue cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                  value={formData.contractDate} onChange={e => setFormData(p => ({ ...p, contractDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-400 mb-1.5">Commencement Date</label>"""
code = code.replace(target2, replacement2)

with open("src/components/Directory/EmploymentContractModal.tsx", "w") as f:
    f.write(code)

print("Updated EmploymentContractModal")
