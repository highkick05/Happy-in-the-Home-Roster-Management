-- Add custom_rate column to client_services
ALTER TABLE client_services ADD COLUMN custom_rate REAL;
-- Add home care travel persistence to shifts
ALTER TABLE shifts ADD COLUMN home_care_travel_km REAL DEFAULT 0;
ALTER TABLE shifts ADD COLUMN home_care_travel_total REAL DEFAULT 0;
