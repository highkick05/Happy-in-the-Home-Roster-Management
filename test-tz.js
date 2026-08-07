import { fromZonedTime } from 'date-fns-tz';
const d = fromZonedTime('2026-08-07T09:00:00', 'Australia/Perth');
console.log(d.toISOString());
