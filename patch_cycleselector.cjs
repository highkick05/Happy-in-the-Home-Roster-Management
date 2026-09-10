const fs = require('fs');
let code = fs.readFileSync('src/components/ui/CycleSelector.tsx', 'utf8');

if (!code.includes('autoSelectCurrent?: boolean;')) {
    code = code.replace(
`  currentEnd: string | null;
}`,
`  currentEnd: string | null;
  autoSelectCurrent?: boolean;
}`);
}

if (!code.includes('autoSelectCurrent })')) {
    code = code.replace(
`export default function CycleSelector({ type, onSelect, currentStart, currentEnd }: CycleSelectorProps) {`,
`export default function CycleSelector({ type, onSelect, currentStart, currentEnd, autoSelectCurrent }: CycleSelectorProps) {`);
}

if (!code.includes('if (autoSelectCurrent) {')) {
    code = code.replace(
`         setCycles(c);
      })`,
`         setCycles(c);
         if (autoSelectCurrent && c.length >= 3) {
             onSelect(c[2].start, c[2].end);
         }
      })`);
}

fs.writeFileSync('src/components/ui/CycleSelector.tsx', code);
console.log("Patched CycleSelector.tsx");
