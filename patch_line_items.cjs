const fs = require('fs');
let content = fs.readFileSync('src/components/Invoicing/QuotesView.tsx', 'utf8');

const target = `                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="text-zinc-500 font-medium mr-1.5">Unit</span>
                        <span className="text-zinc-300">{unit}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-zinc-500 font-medium mr-1.5">Rate $</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rateOverride || ''}
                          onChange={(e) => updateService(idx, 'rateOverride', e.target.value)}
                          placeholder={rate.toFixed(2)}
                          className="w-20 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                        />
                      </div>
                      <div className="flex items-center">
                        <span className="text-zinc-500 font-medium mr-1.5">Qty</span>
                        <input 
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={row.qtyOverride}
                          onChange={(e) => updateService(idx, 'qtyOverride', e.target.value)}
                          placeholder="0"
                          className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                        />
                      </div>
                    </div>
                    <div className="text-right text-brand-teal font-medium pl-4">
                      ${"$"}{subtotal.toFixed(2)}
                    </div>
                  </div>`;

const repl = `                    <div className="flex flex-col space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Date</span>
                          <input 
                            type="date"
                            value={row.date || ''}
                            onChange={(e) => updateService(idx, 'date', e.target.value)}
                            className="bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                        <div className="flex items-center">
                          <span className="text-zinc-500 font-medium mr-1.5">Time</span>
                          <input 
                            type="time"
                            value={row.startTime || ''}
                            onChange={(e) => updateService(idx, 'startTime', e.target.value)}
                            className="bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                          <span className="text-zinc-500 mx-1">-</span>
                          <input 
                            type="time"
                            value={row.endTime || ''}
                            onChange={(e) => updateService(idx, 'endTime', e.target.value)}
                            className="bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-xs text-zinc-300 focus:border-brand-teal outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-4">
                          <div>
                            <span className="text-zinc-500 font-medium mr-1.5">Unit</span>
                            <span className="text-zinc-300">{unit}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-zinc-500 font-medium mr-1.5">Rate $</span>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.rateOverride || ''}
                              onChange={(e) => updateService(idx, 'rateOverride', e.target.value)}
                              placeholder={rate.toFixed(2)}
                              className="w-20 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                            />
                          </div>
                          <div className="flex items-center">
                            <span className="text-zinc-500 font-medium mr-1.5">Qty</span>
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={row.qtyOverride}
                              onChange={(e) => updateService(idx, 'qtyOverride', e.target.value)}
                              placeholder="0"
                              className="w-16 bg-[#09090b] border border-white/[0.12] rounded px-1.5 py-1 text-sm text-zinc-300 focus:border-brand-teal outline-none"
                            />
                          </div>
                        </div>
                        <div className="text-right text-brand-teal font-medium pl-4">
                          ${"$"}{subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>`;

if (content.includes(target)) {
  content = content.replace(target, repl);
  fs.writeFileSync('src/components/Invoicing/QuotesView.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Target not found!");
}
