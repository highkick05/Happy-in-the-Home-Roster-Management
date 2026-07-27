const fs = require('fs');
let code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf8');

if (!code.includes("Mail")) {
  code = code.replace("RefreshCw, Search", "RefreshCw, Search, Mail");
}

if (!code.includes("const [isEmailing, setIsEmailing]")) {
  code = code.replace(
    "const [isMerging, setIsMerging] = useState(false);",
    "const [isMerging, setIsMerging] = useState(false);\n  const [isEmailing, setIsEmailing] = useState<number | null>(null);"
  );
}

const handleEmail = `
  const handleEmailInvoice = async (invoiceId: number) => {
    setIsEmailing(invoiceId);
    try {
      const response = await fetch(\`/api/invoices/\${invoiceId}/email\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('token')}\`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to email invoice');
      }
      alert(data.message || 'Invoice emailed successfully');
      fetchInvoices();
    } catch (error: any) {
      alert(error.message || 'Failed to email invoice');
      console.error(error);
    } finally {
      setIsEmailing(null);
    }
  };
`;

if (!code.includes("const handleEmailInvoice")) {
  code = code.replace("const handleUndoMerge", handleEmail + "\n  const handleUndoMerge");
}

const buttonsAnchor = `                       {subTab === 'active' && (
                         <button
                           title="Lock & Send"
                           onClick={() => handleUpdateStatus(i.id, 'SENT')}
                           className="p-1.5 text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors"
                         >
                           <Send className="w-4 h-4" />
                         </button>
                       )}`;

const buttonsInject = `                       {subTab === 'active' && (
                         <>
                           <button
                             title="Email Invoice"
                             onClick={() => handleEmailInvoice(i.id)}
                             disabled={isEmailing === i.id}
                             className={\`p-1.5 rounded-md transition-colors \${isEmailing === i.id ? 'text-brand-blue opacity-50' : 'text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/10'}\`}
                           >
                             {isEmailing === i.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                           </button>
                           <button
                             title="Sent"
                             onClick={() => handleUpdateStatus(i.id, 'SENT')}
                             className="p-1.5 text-zinc-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-md transition-colors"
                           >
                             <CheckCircle className="w-4 h-4" />
                           </button>
                         </>
                       )}`;

if (code.includes(buttonsAnchor)) {
  code = code.replace(buttonsAnchor, buttonsInject);
}

fs.writeFileSync('src/components/Invoicing/InvoicingView.tsx', code);
console.log("Patched InvoicingView");
