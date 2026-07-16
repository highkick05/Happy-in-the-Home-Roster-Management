import re

with open("src/server.ts", "r") as f:
    code = f.read()

endpoint_code = """
  app.put('/api/tasks/categories/order', authenticateTokenOrWallboard, (req: any, res: any) => {
    try {
      const { categoryIds } = req.body;
      const stmt = db.prepare(`UPDATE task_categories SET sort_order = ? WHERE id = ?`);
      const transaction = db.transaction((ids: number[]) => {
        ids.forEach((id, index) => {
          stmt.run(index, id);
        });
      });
      transaction(categoryIds);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/tasks/:id/category',"""

code = code.replace("app.put('/api/tasks/:id/category',", endpoint_code)

with open("src/server.ts", "w") as f:
    f.write(code)
