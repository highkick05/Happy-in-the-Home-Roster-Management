with open("src/server.ts", "r") as f:
    code = f.read()

new_endpoint = """  app.put('/api/tasks/:id/category', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      const catId = req.body.category_id || null;
      db.prepare("UPDATE tasks SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(catId, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/tasks/:id/status', authenticateTokenOrWallboard, (req: any, res: any) => {"""

code = code.replace("  app.put('/api/tasks/:id/status', authenticateTokenOrWallboard, (req: any, res: any) => {", new_endpoint)

with open("src/server.ts", "w") as f:
    f.write(code)
