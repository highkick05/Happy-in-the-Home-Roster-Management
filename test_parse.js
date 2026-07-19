const parseDate = (d) => {
  if (!d) return null;
  if (d.includes('/')) {
    const parts = d.split(/[ \/]/); // splits by space or slash
    // assuming DD/MM/YYYY
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    let timeStr = d.substring(d.indexOf(' ') + 1);
    if (!d.includes(' ')) timeStr = '00:00:00';
    // try to make ISO
    const iso = `${year}-${month}-${day}T${timeStr}`;
    return new Date(iso).toISOString();
  }
  return new Date(d).toISOString();
};
console.log(parseDate('30/4/2027'));
console.log(parseDate('30/4/2027 12:00:00'));
console.log(parseDate('2026-07-20T12:00:00Z'));
