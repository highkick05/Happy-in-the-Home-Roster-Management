const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const getRatesJsonFunc = `
function getRatesJsonForDate(db: any, srv: any, shiftDateStr: string): string | null {
  if (!srv || srv.type !== 'NDIS') return srv?.rates_json || null;
  if (!shiftDateStr) return srv.rates_json;
  try {
    const shiftDateOnly = shiftDateStr.split('T')[0];
    const pl = db.prepare("SELECT id FROM price_lists WHERE effective_date IS NOT NULL AND effective_date <= ? ORDER BY effective_date DESC LIMIT 1").get(shiftDateOnly) as any;
    if (pl) {
      const item = db.prepare("SELECT rates_json FROM price_list_items WHERE price_list_id = ? AND code = ?").get(pl.id, srv.code) as any;
      if (item && item.rates_json) {
        return item.rates_json;
      }
    }
  } catch (e) {}
  return srv.rates_json;
}
`;

// Insert it somewhere at the top, e.g. after the imports
code = code.replace(/import multer from "multer";/, 'import multer from "multer";\n' + getRatesJsonFunc);

// Now find everywhere it parses rates from `srv` and use the helper!
// But wait! Where do we get `shiftDateStr`?
// In POST /api/shifts (creating multiple), it's `localDateStr` or `tmpl.start_time`!
