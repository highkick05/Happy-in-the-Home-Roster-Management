const fs = require('fs');
const file = 'src/components/Directory/StaffModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const positionsState = `
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/positions', { headers: { Authorization: \`Bearer \${token}\` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPositions(data);
        })
        .catch(err => console.error("Failed to load positions", err));
    }
  }, [isOpen, token]);
`;

if (!content.includes('const [positions, setPositions]')) {
    content = content.replace(
        'export default function StaffModal({ isOpen, onClose, onSave, token, staff }: StaffModalProps) {',
        'export default function StaffModal({ isOpen, onClose, onSave, token, staff }: StaffModalProps) {\n' + positionsState
    );
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added positions fetch to StaffModal');
}
