const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `  try {
    db.exec(\`
      ALTER TABLE tasks ADD COLUMN is_important INTEGER DEFAULT 0;
    \`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }`;

const replacement = `  try {
    db.exec(\`
      ALTER TABLE tasks ADD COLUMN is_important INTEGER DEFAULT 0;
    \`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }

  try {
    db.exec(\`
      ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0;
    \`);
  } catch (e: any) {
    if (e.message && !e.message.includes("duplicate column")) {
      console.warn("Migration warning:", e.message);
    }
  }`;

content = content.replace(target, replacement);

const reorderEndpoint = `
  app.put('/api/tasks/reorder', authenticateToken, (req: any, res: any) => {
    try {
      const { tasks } = req.body;
      const updateStmt = db.prepare("UPDATE tasks SET sort_order = ? WHERE id = ?");
      db.transaction(() => {
        for (const task of tasks) {
          updateStmt.run(task.sort_order, task.id);
        }
      })();
      res.json({ message: "Tasks reordered" });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
`;

content = content.replace("  app.put('/api/tasks/:id',", reorderEndpoint + "\n  app.put('/api/tasks/:id',");
fs.writeFileSync('src/server.ts', content);
