const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const switchRoleRoute = `
  app.post("/api/switch-role", authenticateToken, (req, res) => {
    const { targetRole } = req.body;
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.user.id);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure they have permission
    if (user.role !== 'ADMIN' && !user.can_switch_admin) {
      return res.status(403).json({ error: "Forbidden: Not allowed to switch roles" });
    }

    if (targetRole !== 'ADMIN' && targetRole !== 'STAFF') {
      return res.status(400).json({ error: "Invalid target role" });
    }

    const token = jwt.sign({ id: user.id, role: targetRole }, process.env.JWT_SECRET || "happyinthehome-secret-key-123", {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: targetRole,
        firstName: user.first_name,
        lastName: user.last_name,
        canSwitchAdmin: !!user.can_switch_admin,
      },
    });
  });
`;

code = code.replace(
  'app.post("/api/login", loginRateLimiter, (req, res) => {',
  switchRoleRoute + '\n  app.post("/api/login", loginRateLimiter, (req, res) => {'
);

fs.writeFileSync('src/server.ts', code);
