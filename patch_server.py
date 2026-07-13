with open("src/server.ts", "r") as f:
    code = f.read()

delete_route = """  app.delete(
    "/api/progress-notes/:id",
    authenticateToken,
    async (req: any, res) => {
      const { id } = req.params;
      try {
        db.prepare("DELETE FROM progress_notes WHERE id = ?").run(id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`Error deleting progress note: ${e.message}`, { error: e });
        res.status(500).json({ error: "Failed to delete progress note" });
      }
    },
  );
"""

if 'app.delete(\n    "/api/progress-notes/:id"' not in code and 'app.delete("/api/progress-notes/:id"' not in code:
    code = code.replace('  app.put(\n    "/api/progress-notes/:id"', delete_route + '\n  app.put(\n    "/api/progress-notes/:id"')

with open("src/server.ts", "w") as f:
    f.write(code)

