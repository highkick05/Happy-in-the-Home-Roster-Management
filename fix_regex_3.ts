import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/const base64Data = s\.odometer_start_photo\.replace\(\/\^data:image.*?\//g, 'const base64Data = s.odometer_start_photo.replace(/^data:image\\/\\w+;base64,/');

content = content.replace(/const base64Data = s\.odometer_end_photo\.replace\(\/\^data:image.*?\//g, 'const base64Data = s.odometer_end_photo.replace(/^data:image\\/\\w+;base64,/');

fs.writeFileSync('server.ts', content);
