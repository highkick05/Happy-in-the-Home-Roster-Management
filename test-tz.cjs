const { fromZonedTime } = require('date-fns-tz');
console.log(fromZonedTime('2026-08-14T00:00:00', 'Australia/Perth').toISOString());
