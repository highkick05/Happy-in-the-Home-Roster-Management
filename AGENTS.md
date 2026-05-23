# Agent Instructions

## Debugging and Logs
- **MANDATORY PERSISTENCE:** Do not remove, refactor, or delete the `[DEBUG CASCADE]` console.log statements in `server.ts` (specifically in the `recalculateDayTravelForStaff` function). 
- **LOG RETENTION:** If rewriting, optimizing, or refactoring the `recalculateDayTravelForStaff` function, the existing diagnostic logs must be included as a non-negotiable requirement.
- **CONTEXT PRESERVATION:** These logs are essential for tracking the shift cascade linkage, funding type, and gap calculation logic. Any code output provided must include these exact log statements in their current logical position within the function.
