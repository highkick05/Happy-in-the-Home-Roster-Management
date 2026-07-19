const fs = require('fs');

let content = fs.readFileSync('src/components/VehiclesView.tsx', 'utf8');

content = content.replace(/import \{ Plus, Trash2, CheckCircle2, Circle, Upload, FileText, Download, Edit2, X, Save \} from 'lucide-react';/, "import { Plus, Trash2, CheckCircle2, Circle, Upload, FileText, Download, Edit2, X, Save } from 'lucide-react';");

fs.writeFileSync('src/components/VehiclesView2.tsx', content);
