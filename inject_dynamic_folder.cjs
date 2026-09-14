const fs = require('fs');
let srvContent = fs.readFileSync('src/server.ts', 'utf8');

const dynamicFolderLogic = `
  const resolveDynamicFolder = (req: any, res: any, next: any) => {
    if (req.query.context) {
        const targetUserId = req.query.targetUserId || req.user?.id;
        try {
            const user = db.prepare("SELECT first_name, last_name FROM users WHERE id = ?").get(targetUserId) as any;
            if (user) {
                const nameDir = \`\${user.first_name}_\${user.last_name}\`;
                if (req.query.context === "STAFF_ONBOARDING") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Onboarding\`;
                } else if (req.query.context === "STAFF_VEHICLES") {
                    req.query.folderPath = \`/Staff/\${nameDir}/Vehicles\`;
                }
            }
        } catch(e) {
            console.error("Failed dynamic folder route:", e);
        }
    }
    next();
  };

  app.post('/api/files', authenticateToken, resolveDynamicFolder, upload.single('file'), (req: any, res: any) => {`;

srvContent = srvContent.replace(
    "  app.post('/api/files', authenticateToken, upload.single('file'), (req: any, res: any) => {",
    dynamicFolderLogic
);

fs.writeFileSync('src/server.ts', srvContent);
console.log("Injected resolveDynamicFolder into server.ts");
