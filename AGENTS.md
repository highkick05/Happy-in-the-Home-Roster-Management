# Agent Instructions

## Debugging and Logs
- **MANDATORY PERSISTENCE:** Do not remove, refactor, or delete the `[DEBUG CASCADE]` console.log statements in `server.ts` (specifically in the `recalculateDayTravelForStaff` function). 
- **LOG RETENTION:** If rewriting, optimizing, or refactoring the `recalculateDayTravelForStaff` function, the existing diagnostic logs must be included as a non-negotiable requirement.
- **CONTEXT PRESERVATION:** These logs are essential for tracking the shift cascade linkage, funding type, and gap calculation logic. Any code output provided must include these exact log statements in their current logical position within the function.

## Core Infrastructure Protection


- **COMPLIANCE & AUDIT ENGINE:** The Evidence Matrix Generator, System Logs Ledger, and Excel Exporter logic (including `/api/compliance/evidence/matrix`, `/api/compliance/logs`, and `/api/compliance/export/evidence`) are **STRICTLY PROTECTED**.
- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter these compliance endpoints or the `audit_logs` table architecture. They are mission-critical for NDIA/Home Care auditing. Treat this block of code as read-only.

- **DATABASE BACKUP ENGINE:** The "Automated Database Backup Engine" (which includes the `/api/admin/database/*` endpoints and the `cron.schedule("0 2 * * *")` backup task in `src/server.ts`) is **STRICTLY PROTECTED**.
- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter the backup engine under any circumstances. It is mission-critical for data safety. Treat this block of code as read-only.

## File System & Upload Architecture Protection
- **FILES SECTION ROUTING & LOGIC:** Do not modify, refactor, or delete routing logic, API endpoints (`/api/files/*`), or UI components related to the **Files** section (`src/components/Files/FilesView.tsx`). This includes how files are listed, previewed, downloaded, and managed.
- **PROTECTED UPLOAD DOMAINS:** The following upload mechanisms and their specific filesystem paths/database syncing logic MUST NEVER be altered, refactored, or stripped:
  1. **Onboarding Hub Uploads**
  2. **Vehicles Section Uploads**
  3. **Training Section Uploads**
  4. **Client Documents:** Uploads in the Clients Dashboard > Documents page (both the "Templates" and "Completed Documents" folders).
  5. **Invoicing Engine:** The logic where invoices marked as "paid" generate a PDF, save to the physical filesystem, and sync to the `files` table under the `Clients/Client_Name/Invoices` folder path.
  6. **Live Chat Uploads**
- **UPLOAD RENAMING & FOLDER PATH LOGIC:** The specific custom renaming logic (e.g., `customName` query parameter processing in `multer` storage) and dynamic folder path resolution (`resolveDynamicFolder` in `server.ts` and the exact fetch calls in the UI) for **Onboarding, Training, and Vehicles** are **STRICTLY PROTECTED**. The recent fixes for explicitly querying `folder_path` to prevent UI vanishing on date updates must remain intact. Do NOT modify, alter, or touch this upload processing and file querying architecture.
- **FUTURE FILE HANDLING:** If the application requires new file handling capabilities in the future, it MUST strictly adhere to the existing, protected architecture patterns (combining physical filesystem storage strictly within `/uploads` (such as `/uploads/Clients/[Client_Name]/Invoices`) with database tracking in the `files` table). Do not reinvent, alter, or remove the current stable file architecture.
