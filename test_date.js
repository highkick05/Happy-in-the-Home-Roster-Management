let invoiceDate = "2026-06-10";
let displayDate = invoiceDate;
if (displayDate && displayDate.includes("-")) {
    const parts = displayDate.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
        displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
}
console.log(displayDate);
