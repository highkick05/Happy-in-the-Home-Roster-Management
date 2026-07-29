const d = { start_time: "2026-07-28 10:00:00" };
console.log(new Date(d.start_time.includes('T') ? d.start_time : d.start_time.replace(' ', 'T')));
