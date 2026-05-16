# Project Features & Architecture Reference

This document provides a detailed breakdown of the core functionality, logic blocks, and architectures within your Care Management platform. You can use this as a reference point when requesting updates, redesigns, or new features to pinpoint exact files and workflows.

## 1. Authentication & User Management
* **Login & Sessions:** Secure authentication via JWT, rate limiting on login attempts.
* **Roles & Permissions:** Separate views and capabilities for Administrators vs. standard Staff.
* **Profile Management:** Users can update their own details and view notifications.
* **Onboarding Flow:** Specific steps and state tracking for new staff orientation/onboarding.
* **Files to pinpoint:** `src/components/Auth/`, `src/components/Profile/`, `server.ts` (routes: `/api/login`, `/api/auth/*`, `/api/profile`, `/api/users/onboarding`).

## 2. Directory Management (Clients, Staff, & Providers)
* **Client Directory:** Tracks NDIS vs Home Care (`HCP`) funding types, addresses, and active/inactive status.
* **Staff Directory:** Manages staff addresses (crucial for accurate travel logic), status, and onboarding.
* **Third-Party Providers:** Admin management of external provider entities.
* **Files to pinpoint:** `src/components/Directory/` (`ClientModal.tsx`, `StaffModal.tsx`, etc.), `server.ts` (routes: `/api/clients`, `/api/staff`, `/api/providers`).

## 3. Rostering & Shift Lifecycle
* **Visual Calendar:** The main Roster Calendar UI for assigning, moving, and viewing shifts.
* **Shift States:** Full lifecycle management from `Draft` -> `Published` -> `In Progress` -> `Completed`. 
* **Time & Attendance:** Staff "Check-in" and "Check-out" functionality (`actual_start_time`, `actual_finish_time`).
* **Respite Bookings:** Day/Night tracking, which specifically bypasses standard travel rules.
* **Roster Templates:** Client-specific recurring schedules and automated conflict resolution for generating weekly/monthly rosters.
* **Files to pinpoint:** `src/components/Roster/` (`RosterCalendar.tsx`, `ShiftDetailsModal.tsx`, `AddShiftModal.tsx`), `server.ts` (routes: `/api/shifts/*`, `/api/respite-bookings`, `/api/clients/:id/roster-templates`).

## 4. Complex Travel & Distance Logic (Crucial Billing Systems)
* **Geocoding & OSRM Routing:** Converts system addresses to Long/Lat coordinates and calculates real driving distances.
* **NDIS Provider Travel (Destination-Pays):** Look-back/Look-forward chaining logic (≤ 60 min gap). Determines if travel is billed from the Previous Client vs Staff Home, and if outgoing travel is covered by the Next Client instead of being charged as a return trip.
* **Home Care Travel ($1/km):** Isolated Return-to-Base routing rules specific to Home Care packages, decoupled from NDIS logic.
* **Activity Based Transport (ABT):** Mid-shift travel logging to specific locations alongside the client.
* **Odometer Tracking:** Before/After readings and Base64 Photo captures during the shift check-in/out flow.
* **Files to pinpoint:** `server.ts` (Core logic functions: `calculateProviderTravel`, `calculateHomeCareTravel`, `getOsrmDistance`, `getRecordCoordinates`, `parseLocationString`).

## 5. Invoicing & Financials
* **NDIS Service Item Catalog:** Import and management of official NDIS line items, rates, and limits.
* **Invoice Generation (PDFKit):** Compiles shift times, provider travel, and ABT into a stylistic, highly detailed PDF invoice.
* **Invoice Manipulation:** Merging multiple pending shifts onto a single invoice, undoing merges, and manual overrides.
* **Quotations:** Building pre-service quotes for clients and quoting PDF generation.
* **Files to pinpoint:** `src/components/Invoicing/` (`InvoicingView.tsx`, `InvoicePreviewModal.tsx`, `QuotesView.tsx`), `server.ts` (routes: `/api/invoices/*`, `/api/quotes`, `/api/services`).

## 6. Compliance, Audit & Evidence
* **System Audit Logs:** Immutable tracker for administrative overrides (e.g., manual edits to shift times or kilometers after completion).
* **Client Evidence Packs:** PDF generation outlining precise transport leg breakdowns (Long/Lat coords, addresses) to satisfy rigorous NDIS audits.
* **Staff Vehicle Usage Logbooks:** PDF generation for staff payroll and tax deductions encompassing all logged NDIS, HCP, and ABT kilometers/odometer readings.
* **Files to pinpoint:** `src/components/Compliance/` (`ComplianceDashboard.tsx`), `server.ts` (routes `/api/compliance/*` and PDF rendering functions like `drawPdfPhotoIfPresent`).

## 7. File Management & Attachments
* **General Storage:** Secure uploading and retrieving user or client-related documents.
* **Branding:** Uploading custom business letterheads and logos applied dynamically to all PDF outputs.
* **Files to pinpoint:** `src/components/Files/`, `server.ts` (routes: `/api/files/*`, `/api/settings/upload-logo`).

## 8. System Settings & Infrastructure
* **PWA (Progressive Web App):** Installability, manifest generation, and dynamic app icons for mobile use.
* **Database Management:** Core data safety controls allowing admins to list, download the real-time Live database, and access rotating backups (SQLite `.db` files).
* **Error Handling:** Global boundary checking UI in React to catch frontend crashes gracefully.
* **Files to pinpoint:** `src/components/Settings/`, `src/components/UniversalPWAInstall.tsx`, `src/components/ErrorBoundary.tsx`, `server.ts` (routes: `/api/admin/database/*`, `/api/settings`, `/manifest.webmanifest`).
