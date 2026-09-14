const fs = require('fs');
let content = fs.readFileSync('src/components/Settings/SettingsView.tsx', 'utf8');

const oldFuncRegex = /const handleRegeneratePdfs = async \(\) => \{[\s\S]*?^\s*\};\s*const handleSaveSettings/m;

const newFunc = `const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showRepairModal && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [repairLogs, showRepairModal]);

  const handleRegeneratePdfs = async () => {
    if (!window.confirm("Are you sure you want to run the Repair Invoices engine?")) return;
    setGeneralLoading(true);
    setSuccessMsg('');
    setShowRepairModal(true);
    setRepairLogs(["Initializing Repair Engine..."]);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/invoices/repair', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      const decoder = new TextDecoder("utf-8");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('DONE|')) {
            setSuccessMsg(line.split('|')[1]);
          } else if (line.startsWith('ERROR|')) {
            alert(line.split('|')[1]);
          } else {
            setRepairLogs(prev => [...prev, line]);
          }
        }
      }
    } catch (e) {
      alert('Error during repair process');
      console.error(e);
    } finally {
      setGeneralLoading(false);
      setTimeout(() => setSuccessMsg(''), 8000);
    }
  };

  const handleSaveSettings`;

if (oldFuncRegex.test(content)) {
    content = content.replace(oldFuncRegex, newFunc);
    fs.writeFileSync('src/components/Settings/SettingsView.tsx', content);
    console.log("Replaced function successfully.");
} else {
    console.log("Failed to match old function.");
}
