const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert OdometerPhotoIcon component
const insertStr = `
const OdometerPhotoIcon = ({ url, type, onClick }: { url: string, type: string, onClick: () => void }) => {
  return (
    <div className="relative group flex items-center justify-center z-10 hover:z-50">
      <button onClick={onClick} className="text-brand-teal hover:text-white transition-colors p-1">
        <Eye className="w-3.5 h-3.5" />
      </button>
      
      <div className="absolute bottom-full mb-2 hidden group-hover:block pointer-events-none drop-shadow-2xl right-0 transform translate-x-1/4">
        <div className="bg-brand-navy border border-border-subtle p-1.5 rounded-lg">
           <img src={url.startsWith('data:') || url.startsWith('blob:') ? url : \`/uploads/\${url}\`} alt="Preview" className="max-h-[40vh] max-w-[40vw] object-contain rounded bg-black/50" />
        </div>
      </div>
    </div>
  );
};
`;

code = code.replace(/export default function TravelLogsView\(\) \{/, insertStr + '\nexport default function TravelLogsView() {');

// Replace the start icon
const startTarget = `{log.odometer_start_photo && (
                              <button onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} className="text-brand-teal hover:text-white transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}`;
const startReplacement = `{log.odometer_start_photo && (
                              <OdometerPhotoIcon url={log.odometer_start_photo} type="Start" onClick={() => setPreviewPhoto({url: log.odometer_start_photo, type: 'Start'})} />
                            )}`;
code = code.replace(startTarget, startReplacement);

// Replace the end icon
const endTarget = `{log.odometer_end_photo && (
                              <button onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} className="text-brand-teal hover:text-white transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}`;
const endReplacement = `{log.odometer_end_photo && (
                              <OdometerPhotoIcon url={log.odometer_end_photo} type="End" onClick={() => setPreviewPhoto({url: log.odometer_end_photo, type: 'End'})} />
                            )}`;
code = code.replace(endTarget, endReplacement);

fs.writeFileSync(file, code);
