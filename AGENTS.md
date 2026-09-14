# Agent Instructions

## Debugging and Logs
- **MANDATORY PERSISTENCE:** Do not remove, refactor, or delete the `[DEBUG CASCADE]` console.log statements in `server.ts` (specifically in the `recalculateDayTravelForStaff` function). 
- **LOG RETENTION:** If rewriting, optimizing, or refactoring the `recalculateDayTravelForStaff` function, the existing diagnostic logs must be included as a non-negotiable requirement.
- **CONTEXT PRESERVATION:** These logs are essential for tracking the shift cascade linkage, funding type, and gap calculation logic. Any code output provided must include these exact log statements in their current logical position within the function.

## Core Infrastructure Protection
- **EXPIRY CRON ENGINE:** The "Automated Expiry Cron Engine" (which includes `checkExpiries`, the `cron.schedule("0 8 * * *")` block, and the startup `setTimeout` in `src/server.ts`) is **STRICTLY PROTECTED**. 
- **DO NOT MODIFY OR DELETE:** Do not remove, refactor, comment out, or alter this engine under any circumstances. It is mission-critical for staff compliance and training alerts. Treat this block of code as read-only.
