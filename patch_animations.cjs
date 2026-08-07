const fs = require('fs');
const file = 'src/components/Directory/StaffClientsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add motion import
content = content.replace(
  "import { useAuth } from '../../context/AuthContext';",
  "import { useAuth } from '../../context/AuthContext';\nimport { motion } from 'motion/react';"
);

// Update lucide-react imports
content = content.replace(
  "import { Plus, Edit2, Ban, CheckCircle, UsersIcon, UserPlus, Calendar, FileText } from 'lucide-react';",
  "import { Plus, Edit2, Ban, CheckCircle, UsersIcon, UserPlus, Calendar, FileText, Tractor, Sparkles, Zap, Wrench, Activity, Droplet, Apple, Footprints, Smile, Mic } from 'lucide-react';"
);

// Add the ServiceIcon component
const serviceIconComponent = `
const ServiceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Gardening':
      return (
        <motion.div
          animate={{ x: [0, 5, 0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-flex items-center"
        >
          <Tractor className="w-3.5 h-3.5 mr-1 text-green-400" />
        </motion.div>
      );
    case 'Cleaning':
      return (
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-400" />
        </motion.div>
      );
    case 'Electrical':
      return (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="inline-flex items-center"
        >
          <Zap className="w-3.5 h-3.5 mr-1 text-yellow-400" />
        </motion.div>
      );
    case 'Home Maintenance':
      return (
        <motion.div
          animate={{ rotate: [0, 45, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center"
        >
          <Wrench className="w-3.5 h-3.5 mr-1 text-orange-400" />
        </motion.div>
      );
    case 'Physiotherapy':
    case 'Occupational Therapy':
      return (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center"
        >
          <Activity className="w-3.5 h-3.5 mr-1 text-purple-400" />
        </motion.div>
      );
    case 'Plumbing':
      return (
        <motion.div
          animate={{ y: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center"
        >
          <Droplet className="w-3.5 h-3.5 mr-1 text-blue-500" />
        </motion.div>
      );
    case 'Dietitian':
      return (
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-flex items-center"
        >
          <Apple className="w-3.5 h-3.5 mr-1 text-red-400" />
        </motion.div>
      );
    case 'Podiatry':
      return (
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="inline-flex items-center"
        >
          <Footprints className="w-3.5 h-3.5 mr-1 text-zinc-300" />
        </motion.div>
      );
    case 'Remedial Massage':
      return (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-flex items-center"
        >
          <Smile className="w-3.5 h-3.5 mr-1 text-pink-400" />
        </motion.div>
      );
    case 'Speech Pathology':
      return (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="inline-flex items-center"
        >
          <Mic className="w-3.5 h-3.5 mr-1 text-sky-400" />
        </motion.div>
      );
    default:
      return null;
  }
};
`;

content = content.replace(
  "export default function StaffClientsView",
  serviceIconComponent + "\nexport default function StaffClientsView"
);

// Add the badge rendering
const stringReplacement = `<span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#1d1f23] text-brand-teal border border-brand-teal/20 inline-flex items-center">
                        <ServiceIcon type={c.contractor_type || 'Other'} />
                        {c.contractor_type || 'Other'}
                      </span>`;

content = content.replace(
  /<span className="px-1\.5 py-0\.2 rounded text-\[10px\] uppercase font-bold tracking-wider bg-\[\#1d1f23\] text-brand-teal border border-brand-teal\/20 inline-block">\s*\{c\.contractor_type \|\| 'Other'\}\s*<\/span>/,
  stringReplacement
);

fs.writeFileSync(file, content);
