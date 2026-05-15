-- migration_v4.sql
ALTER TABLE invoices ADD COLUMN respite_booking_id INTEGER REFERENCES respite_bookings(id);
