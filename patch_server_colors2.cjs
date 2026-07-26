const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `                let bgColor = '#0ea5e9'; // PUBLISHED
                if (shift.status === 'DRAFT') bgColor = '#52525b';
                if (shift.status === 'COMPLETED') bgColor = '#a3e635';
                if (shift.status === 'IN_PROGRESS') bgColor = '#38bdf8';
                if (shift.status === 'PENDING_SYNC') bgColor = '#f59e0b';
                if (shift.status === 'CANCELLED') bgColor = '#ef4444';
                if (shift.isRespiteWrapper) bgColor = '#8b5cf6';
                if (shift.id && typeof shift.id === 'string' && shift.id.startsWith('rb_')) bgColor = '#f59e0b';
                else if (shift.status === 'PUBLISHED') bgColor = '#10b981';
                else if (shift.status === 'COMPLETED') bgColor = '#6366f1';
                else if (shift.status === 'CANCELLED') bgColor = '#ef4444';
                else if (shift.status === 'IN_PROGRESS') bgColor = '#3b82f6';`;

const replacementStr = `                let bgColor = '#0ea5e9'; // PUBLISHED
                if (shift.status === 'DRAFT') bgColor = '#52525b';
                if (shift.status === 'COMPLETED') bgColor = '#a3e635';
                if (shift.status === 'IN_PROGRESS') bgColor = '#38bdf8';
                if (shift.status === 'PENDING_SYNC') bgColor = '#f59e0b';
                if (shift.status === 'CANCELLED') bgColor = '#ef4444';
                if (shift.isRespiteWrapper) bgColor = '#8b5cf6';`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully cleaned up colors!');
} else {
    console.log('Target string not found for colors cleanup!');
}
