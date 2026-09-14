const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const oldButtonStr = `<RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Bulk Sync Paid Invoice PDFs
                </button>
              </div>`;

const newButtonStr = `<RefreshCw className={\`w-4 h-4 mr-2 \${generalLoading ? 'animate-spin' : ''}\`} />
                  Repair Invoices
                </button>
              </div>`;
content = content.replace(oldButtonStr, newButtonStr);

const oldFunc = `const res = await fetch('/api/admin/invoices/regenerate-pdfs', {`;
const newFunc = `const res = await fetch('/api/admin/invoices/repair', {`;
content = content.replace(oldFunc, newFunc);

const oldMsg = `setSuccessMsg(\`Successfully synchronized \${data.generated} invoice PDFs to the filesystem.\`);`;
const newMsg = `setSuccessMsg(\`Repaired! Fixed \${data.fixedDbRecords} paths, cleared \${data.deletedGhosts} ghosts, generated \${data.regeneratedPdfs} PDFs, and synced \${data.syncedFiles} files.\`);`;
content = content.replace(oldMsg, newMsg);

fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
console.log("Updated React Settings view!");
