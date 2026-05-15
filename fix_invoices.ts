import Database from 'better-sqlite3';

const db = new Database('database.sqlite', { verbose: console.log });

console.log("Fixing respite invoices...");
const invoices = db.prepare('SELECT * FROM invoices WHERE respite_booking_id IS NOT NULL').all();

// I need the `getInvoiceDataForRespiteBooking` logic... Wait, it's easier to just POST to an endpoint or evaluate it inside `server.ts`.
