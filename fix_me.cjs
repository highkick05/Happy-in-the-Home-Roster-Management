const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /app\.get\("\/api\/me"[\s\S]*?res\.json\(\{[\s\S]*?user: \{[\s\S]*?role: user\.role,[\s\S]*?lastName: user\.last_name,[\s\S]*?canSwitchAdmin: !!user\.can_switch_admin,[\s\S]*?\},[\s\S]*?settings,[\s\S]*?\}\);[\s\S]*?\}\);/m;

const replacement = `app.get("/api/me", authenticateToken, (req: any, res: any) => {
    const user = db
      .prepare(
        "SELECT id, email, role, first_name, last_name, can_switch_admin FROM users WHERE id = ?"
      )
      .get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });

    // Also attach safe settings
    const settingsRows = db
      .prepare("SELECT key, value FROM settings")
      .all() as any[];
    const settings = settingsRows.reduce(
      (acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),
      {}
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: req.user.role || user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        canSwitchAdmin: !!user.can_switch_admin,
      },
      settings,
    });
  });`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/server.ts', code);
