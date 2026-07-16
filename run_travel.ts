import db from './db.js';
import { calculateHomeCareTravel } from './src/utils/homeCareCalculator.js';

async function run() {
  const shifts = db.prepare("SELECT id, funding_type, status FROM shifts").all() as any[];
  console.log("All shifts:");
  shifts.slice(0, 10).forEach(s => console.log(s));
}
run();
