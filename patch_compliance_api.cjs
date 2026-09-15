const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// The original staff-compliance route
const regex = /app\.get\(\n\s*"\/api\/admin\/staff-compliance",\n\s*authenticateToken,\n\s*requireAdmin,[\s\S]*?(?=\/\/ --- Staff Chat APIs ---)/g;
let match = content.match(regex);
if (match) {
  const newStaffComplianceApi = `app.get("/api/admin/staff-compliance", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const staffList = db.prepare("SELECT id, first_name, last_name, email, onboarding_json, primary_position, additional_positions FROM users WHERE role = 'STAFF'").all() as any[];
      const allFiles = db.prepare("SELECT id, date_issued, date_expires, original_name FROM files").all() as any[];
      const filesMap = new Map(allFiles.map((f) => [f.id, f]));
      
      const allPositions = db.prepare("SELECT * FROM positions").all() as any[];
      const allSteps = db.prepare("SELECT * FROM onboarding_hub_steps").all() as any[];

      const result = staffList.map((staff) => {
        let onboardingData: any = {};
        try { onboardingData = staff.onboarding_json ? JSON.parse(staff.onboarding_json) : {}; } catch (e) {}

        const primary = staff.primary_position || '';
        let additionals = [];
        try { additionals = staff.additional_positions ? JSON.parse(staff.additional_positions) : []; } catch(e) {}
        
        const staffPositionNames = [primary, ...additionals].filter(Boolean);
        const matchedPositions = allPositions.filter(p => staffPositionNames.includes(p.name));
        const posIds = matchedPositions.map(p => p.id);
        
        const staffSteps = allSteps.filter(s => posIds.includes(s.position_id));

        const compliance: Record<string, any> = {};

        for (const step of staffSteps) {
          const key = 'dynamic_' + step.id;
          const stepData = onboardingData[key] || {};
          const files = stepData.files || [];
          
          if (files.length === 0) {
            compliance[key] = { label: step.title, status: "MISSING", expiry: null, issued: null, fileName: null, fileId: null };
            continue;
          }

          const fileMeta = filesMap.get(files[0].id);
          if (!fileMeta) {
            compliance[key] = { label: step.title, status: "MISSING", expiry: null, issued: null, fileName: null, fileId: null };
            continue;
          }

          let status = "VALID";
          let daysDiff = 999;
          
          if (step.requires_expiry === 1 && fileMeta.date_expires) {
            const expDate = new Date(fileMeta.date_expires);
            const today = new Date();
            const diffTime = expDate.getTime() - today.getTime();
            daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 0) {
              status = "EXPIRED";
            } else if (daysDiff <= 30) {
              status = "EXPIRING_SOON";
            }
          }

          compliance[key] = {
            label: step.title,
            status,
            expiry: fileMeta.date_expires || null,
            issued: fileMeta.date_issued || null,
            fileName: fileMeta.original_name,
            fileId: fileMeta.id,
            daysUntilExpiry: daysDiff
          };
        }

        return {
          ...staff,
          compliance,
        };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Staff compliance error:", err);
      res.status(500).json({ error: err.message });
    }
  });\n\n  `;
  
  content = content.replace(match[0], newStaffComplianceApi);
  fs.writeFileSync('src/server.ts', content, 'utf8');
  console.log("Patched /api/admin/staff-compliance");
} else {
  console.log("Could not match staff-compliance route.");
}
