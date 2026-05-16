# Pre-Launch Testing Checklist

Before deploying your Care Management platform to a live environment with real clients and staff, you must rigorously test the boundaries of the system. This list simulates real-world usage, specifically targeting areas with complex logic or high financial impact.

## 1. Authentication & Security
- [ ] **Login/Logout**: Test correct credentials, incorrect credentials, and lockout/rate-limiting behaviors.
- [ ] **Role Segregation**: Log in as a standard Staff member. Ensure they *cannot* access Invoicing, Admin Settings, or other staff members' data.
- [ ] **Token Expiration**: Leave a session open until the token expires. Ensure the app gracefully forces a re-login without crashing.
- [ ] **Onboarding Flow**: Take a brand new staff account through the onboarding steps to ensure all required profile hooks fire correctly.

## 2. Directory & Geocoding (Crucial for Travel)
- [ ] **Address Resolution**: Enter various formats of addresses for Clients and Staff (e.g., unit numbers, vague street names). Ensure the Geocoding/OSRM engine resolves them to coordinates correctly instead of silently defaulting to fallback coordinates (Brisbane CBD).
- [ ] **Client Funding Types**: Ensure Clients are correctly tagged as 'NDIS' or 'Home Care'. *This dictates entirely different billing logic downstream.*

## 3. Rostering & Shift Lifecycle
- [ ] **Roster Generation**: Create a recurring template for a client and generate a month's roster. Check for duplicates or missing days.
- [ ] **Conflict Resolution**: Attempt to double-book a staff member. Ensure the conflict warning appears and handles it correctly.
- [ ] **Shift Status Flow**: Push a shift through `Draft` -> `Published` -> `In Progress` -> `Completed`. Verify the UI accurately reflects these states for both Admin and Staff views.
- [ ] **Respite Bookings**: Create a respite booking and verify it bypasses standard NDIS hourly rules/travel.

## 4. Travel Logic & Billing (The Danger Zone)
*The most critical component to test, given recent logic separation.*
- [ ] **NDIS First Shift**: Staff Home -> Client A. Ensure Client A is billed for this distance.
- [ ] **NDIS Consecutive Shifts (≤ 60 mins)**: Client A -> Client B (gap of 30 mins). Ensure Client B is billed for travel *from Client A*, not from the Staff Home.
- [ ] **NDIS Consecutive Shifts (> 60 mins)**: Client A -> Gap of 2 hours -> Client B. Ensure Client B is billed for travel from the Staff Home (the continuous chain is broken).
- [ ] **NDIS Last Shift**: Ensure the final client of the day is billed for the return trip to the Staff Home.
- [ ] **Home Care Isolation**: Create a Home Care shift. Verify it completely ignores the NDIS chaining logic and strictly uses the isolated $1.00/km Return-to-Base rules.
- [ ] **ABT (Activity Based Transport)**: Add ABT during a shift. Ensure it tracks separately from Provider Travel.

## 5. Mobile App (PWA) & Staff Check-In Experience
- [ ] **Mobile Layout**: Open the site on a mobile device/emulator. Ensure the dashboard and shift "Start/End Shift" buttons are easily tappable.
- [ ] **Odometer Photos**: Using a mobile device, start a shift, take an odometer photo via the device camera, and end the shift with another photo.
- [ ] **Photo Uploads**: Check that taking large photos doesn't crash the server upon completion, and renders properly without breaking the PDF structure.

## 6. Financials & PDF Generation
- [ ] **Invoice Accuracy**: Generate an invoice for a completed shift. Check that the Line Items (Saturday rates, Evening rates, etc.) automatically apply based on the *actual* start/finish times, not just scheduled times.
- [ ] **Merged Invoices**: Select 3 shifts for a single client and merge them into one invoice. Ensure the totals sum up correctly without dropping transport data.
- [ ] **PDF Rendering**: Open generated Invoices, Evidence Packs, and Staff Logbooks. Look closely for:
    - Overlapping text or tables extending off the page.
    - Missing Base64 Odometer images.
    - Missing Coordinates/Addresses in the travel routes.
- [ ] **Custom Letterhead**: Upload a custom logo in Settings and verify it applies instantly to newly generated PDFs.

## 7. Infrastructure & Compliance
- [ ] **Database Backup**: Go to Admin Settings and manually trigger a Database Download. Verify the `.db` file is playable/readable via a local DB browser (like DB Browser for SQLite). 
- [ ] **Audit Trail**: Manually modify a completed shift's times or travel km as an Admin. Go to the Compliance Dashboard and verify an audit log was created identifying *who* changed it, *when*, and *why*.
- [ ] **Error Boundary**: Trigger an intentional frontend error (if possible, perhaps by entering invalid text in a numeric search field) to ensure the white "Something went wrong" failsafe screen appears instead of a blank white page.
