const { format, utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');

// Simulated backend data
const utcShiftStart = '2026-09-09T01:00:00Z'; // 9:00 AM Perth time

const myBrowserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('Browser TZ:', myBrowserTz);

const orgTz = 'Australia/Perth';

// Current approach (react-big-calendar native date parsing)
const dateLocal = new Date(utcShiftStart);
console.log('Current (Browser Local):', dateLocal.toLocaleString());

// Zoned approach
const zonedOrg = utcToZonedTime(utcShiftStart, orgTz);
// We fake the JS date so big calendar renders it exactly at the org's time digits
const spoofedLocal = new Date(
    zonedOrg.getFullYear(),
    zonedOrg.getMonth(),
    zonedOrg.getDate(),
    zonedOrg.getHours(),
    zonedOrg.getMinutes(),
    zonedOrg.getSeconds(),
    zonedOrg.getMilliseconds()
);
console.log('Spoofed (For Big Calendar):', spoofedLocal.toLocaleString());

