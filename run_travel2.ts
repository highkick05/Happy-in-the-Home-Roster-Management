import Database from 'better-sqlite3';
import { calculateHomeCareTravel } from './src/utils/homeCareCalculator.js';

const db = new Database('./data/dev-database.sqlite');
import my_db from './db.js'; // this will initialize db in mapUtils

async function run() {
  const shifts = db.prepare("SELECT * FROM shifts WHERE (funding_type = 'HCP' OR funding_type = 'Home Care' OR funding_type = 'HOME_CARE') AND status = 'COMPLETED'").all() as any[];
  for (const shift of shifts) {
    console.log("Calculating for shift", shift.id);
    await calculateHomeCareTravel(shift);
  }
  console.log("Done");
}
run();
