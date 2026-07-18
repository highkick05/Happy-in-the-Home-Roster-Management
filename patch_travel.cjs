const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import \{ Plus, Trash2 \} from 'lucide-react';/,
  "import { Plus, Trash2 } from 'lucide-react';\nimport carImage from '../assets/images/high_quality_car_1784363727210.jpg';"
);

code = code.replace(
  /        <button \n          onClick=\{\(\) => setShowVehicles\(true\)\}\n          className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal\/90 transition-colors"\n        >\n          Vehicle Register\n        <\/button>/g,
  `        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowVehicles(true)}
            className="bg-brand-teal text-white px-4 py-2 rounded font-medium text-sm hover:bg-brand-teal/90 transition-colors h-fit"
          >
            Vehicle Register
          </button>
          <img src={carImage} alt="Luxury Vehicle" className="h-[52px] w-auto rounded-md shadow-sm border border-border-subtle object-cover" />
        </div>`
);

fs.writeFileSync(file, code);
