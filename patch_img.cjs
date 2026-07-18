const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /import carImage from '\.\.\/assets\/images\/high_quality_car_[0-9]+\.jpg';/,
  "import carImage from '../assets/images/car_black_bg_1784365022147.jpg';"
);

code = code.replace(
  /className="h-\[60px\] w-auto object-contain" style=\{\{ mixBlendMode: "screen", filter: "contrast\(1\.2\)" \}\} \/>/,
  'className="h-[60px] w-auto object-contain" style={{ mixBlendMode: "screen", filter: "contrast(1.2) brightness(1.1)" }} />'
);

fs.writeFileSync(file, code);
