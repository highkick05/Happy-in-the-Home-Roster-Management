const { fromZonedTime } = require('date-fns-tz');
const d = fromZonedTime('2026-01-29T09:00:00', 'Australia/Perth');
console.log(d.toISOString());
