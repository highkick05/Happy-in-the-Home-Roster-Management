import db from './db.ts';
import { recalculateDayTravelForStaff } from './src/services/travelEngine.ts';

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
