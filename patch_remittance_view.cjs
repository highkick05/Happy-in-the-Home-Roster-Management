const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/RemittancesView.tsx', 'utf8');

const targetState = `    startTime: '09:00',
    endTime: '10:00',
    gstType: 'GST Free'
  });`;

const repState = `    startTime: '09:00',
    endTime: '10:00',
    gstType: 'GST Free',
    invoiceReference: editData ? (editData.invoice_reference || '') : '',
    transactionReference: editData ? (editData.transaction_reference || '') : ''
  });`;

code = code.replace(targetState, repState);

const targetUI = `          <select
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.gstType}
            onChange={e => setFormData({ ...formData, gstType: e.target.value })}
          >
            <option value="GST Free">GST Free</option>
            <option value="10%">GST (10%)</option>
          </select>
        </div>
      </div>`;

const repUI = `          <select
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.gstType}
            onChange={e => setFormData({ ...formData, gstType: e.target.value })}
          >
            <option value="GST Free">GST Free</option>
            <option value="10%">GST (10%)</option>
          </select>
        </div>
        
        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Invoice Number (Optional)</label>
          <input
            type="text"
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.invoiceReference}
            onChange={e => setFormData({ ...formData, invoiceReference: e.target.value })}
            placeholder="e.g. INV-2026"
          />
        </div>
        
        <div className="space-y-1.5 col-span-1 sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Transaction Reference (Optional)</label>
          <input
            type="text"
            className="w-full bg-[#121214] border border-white/[0.08] rounded-md py-2 px-3 text-white focus:ring-1 focus:ring-brand-teal outline-none font-mono text-sm"
            value={formData.transactionReference}
            onChange={e => setFormData({ ...formData, transactionReference: e.target.value })}
            placeholder="e.g. Receipt No. or EFT Ref"
          />
        </div>
      </div>`;

code = code.replace(targetUI, repUI);

fs.writeFileSync('src/components/Invoicing/RemittancesView.tsx', code);
console.log("RemittancesView patched");
