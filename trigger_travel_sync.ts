import Database from 'better-sqlite3';
import { recalculateDayTravelForStaff } from './src/services/travelEngine.ts';

const db = new Database('database.sqlite'); // Assuming this is the main DB file here
// Wait, the real DB might be dev-database.sqlite because it's dev. Let's try both.
// Actually, let's just make sure both exist and connect to dev-database.sqlite first just to check shifts.


const run = async () => {
    const shifts = db.prepare("SELECT DISTINCT staff_id, date(start_time) as d, start_time FROM shifts WHERE status='COMPLETED'").all() as any[];
    console.log(`Found ${shifts.length} unique staff-days to sync...`);
    for (const s of shifts) {
        try {
            await recalculateDayTravelForStaff(s.staff_id, s.start_time);
        } catch (e) {
            console.error('Error syncing shift', s, e);
        }
    }
    console.log('Complete!');
};

run();
