import re

with open("src/server.ts", "r") as f:
    code = f.read()

delete_shift_api = """
  app.delete(
    "/api/progress-notes/shifts/:id",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { id } = req.params;
        const shift = db.prepare("SELECT staff_id FROM shifts WHERE id = ?").get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        db.prepare("UPDATE shifts SET notes = NULL WHERE id = ?").run(id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
"""

if "/api/progress-notes/shifts/:id" in code and "app.delete(" not in code.split("app.put(\\n    \"/api/progress-notes/shifts/:id\"")[0]: # well that's complicated
    pass

# let's just insert it before app.post("/api/progress-notes/upload-image"
code = code.replace("  app.post(\n    \"/api/progress-notes/upload-image\",", delete_shift_api + "\n  app.post(\n    \"/api/progress-notes/upload-image\",")

with open("src/server.ts", "w") as f:
    f.write(code)

