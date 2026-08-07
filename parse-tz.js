function toUTC(dateStr, timeStr, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    // Let's create a date object as if it's UTC
    const d = new Date(`${dateStr}T${timeStr}:00Z`);
    // Then get the parts in the target timezone
    const parts = formatter.formatToParts(d);
    // Well that doesn't tell us the offset!
}
