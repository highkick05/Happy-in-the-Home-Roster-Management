const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const tasksApiStart = code.indexOf('// --- TASKS API ---');
const tasksApiEnd = code.indexOf('// --- END TASKS API ---') + '// --- END TASKS API ---'.length;

const tasksApiCode = code.substring(tasksApiStart, tasksApiEnd);

// Remove it from its current position
code = code.replace(tasksApiCode, '');

// Insert it before Vite Middleware
code = code.replace('// --- Vite Middleware or Static Files ---', tasksApiCode + '\n\n  // --- Vite Middleware or Static Files ---');

fs.writeFileSync(file, code);
