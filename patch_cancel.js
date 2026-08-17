import fs from 'fs';
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  app.post(
    "/api/shifts/:id/cancel",
    authenticateToken,
    (req: any, res: any) => {
      const { id } = req.params;
      const { reason, clientGaveNotice = true } = req.body;
      try {
        const shift = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
          return res.status(403).json({ error: "Forbidden" });

        let finalReason = reason ? \`Cancelled: \${reason}\` : "Cancelled by staff";
        if (!clientGaveNotice) {
           finalReason += " (Less than required notice)";
        }

        db.prepare("UPDATE shifts SET status = ?, notes = ? WHERE id = ?").run(
          "CANCELLED",
          finalReason,
          id,
        );

        if (!clientGaveNotice) {
          try {
            generateInvoiceForShift(shift.id);
            console.log(\`[DEBUG] Generated invoice for cancelled shift \${shift.id} due to late notice.\`);
          } catch(e) {
            console.error(\`[DEBUG] Failed to generate invoice for cancelled shift \${shift.id}:\`, e);
          }
        }`;

content = content.replace(`  app.post(
    "/api/shifts/:id/cancel",
    authenticateToken,
    (req: any, res: any) => {
      const { id } = req.params;
      const { reason } = req.body;
      try {
        const shift = db
          .prepare("SELECT * FROM shifts WHERE id = ?")
          .get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id)
          return res.status(403).json({ error: "Forbidden" });

        db.prepare("UPDATE shifts SET status = ?, notes = ? WHERE id = ?").run(
          "CANCELLED",
          reason ? \`Cancelled: \${reason}\` : "Cancelled by staff",
          id,
        );`, replacement);

fs.writeFileSync(file, content);
