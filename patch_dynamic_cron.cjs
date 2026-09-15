const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const dynamicCronCode = `
  const checkDynamicExpiries = () => {
      try {
          console.log("Running dynamic Expiry Engine checks...");
          const today = new Date();
          const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all();
          const getSmtpSettingsLocal = () => {
            const row = db.prepare("SELECT * FROM settings WHERE \\\`key\\\` = 'smtp'").get();
            if (row && row.value) { return JSON.parse(row.value); }
            return null;
          };
          const smtpConfig = getSmtpSettingsLocal();

          const sendNotification = (staff, type, title, message, link) => {
              const staffId = staff.id;
              const existing = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message = ? AND type = ?").get(staffId, message, type);
              if (!existing) {
                  db.prepare("INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)").run(staffId, type, title, message, link);
                  for (const admin of admins) {
                      const adminExisting = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message = ?").get(admin.id, message);
                      if (!adminExisting) {
                          db.prepare("INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)").run(admin.id, type, "Staff Expiry Alert", \`\${staff.first_name} \${staff.last_name}: \${message}\`, \`/staff\`);
                      }
                  }
              }
          };

          const dynamicSteps = db.prepare("SELECT * FROM onboarding_hub_steps WHERE requires_expiry = 1").all();
          if (dynamicSteps.length === 0) return;

          const staffList = db.prepare("SELECT id, first_name, last_name, email, onboarding_json FROM users WHERE role = 'STAFF'").all();
          const allFiles = db.prepare("SELECT id, date_expires, original_name FROM files").all();
          const filesMap = new Map(allFiles.map(f => [f.id, f]));

          for (const staff of staffList) {
              let onboardingData = {};
              try { if (staff.onboarding_json) onboardingData = JSON.parse(staff.onboarding_json); } catch (e) {}
              
              for (const stepDef of dynamicSteps) {
                  const key = 'dynamic_' + stepDef.id;
                  const step = onboardingData[key] || {};
                  const stepFiles = step.files || [];
                  if (stepFiles.length > 0) {
                      const fInfo = stepFiles[0];
                      const fileMeta = filesMap.get(fInfo.id);
                      if (fileMeta && fileMeta.date_expires) {
                          const expDate = new Date(fileMeta.date_expires);
                          const diffTime = expDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const link = \`/onboarding\`;
                          
                          if (diffDays <= 0) {
                              sendNotification(staff, "DOCUMENT_EXPIRED", "Mandatory Document Expired", \`Your \${stepDef.title} has expired.\`, link);
                          } else if (diffDays <= 30 && diffDays > 0) {
                              sendNotification(staff, "DOCUMENT_EXPIRING_SOON", "Mandatory Document Expiring Soon", \`Your \${stepDef.title} is expiring in \${diffDays} day(s).\`, link);
                          }
                      }
                  }
              }
          }
      } catch (err) {
          console.error("Error running Dynamic Expiry Engine", err);
      }
  };

  cron.schedule("0 8 * * *", () => {
      checkDynamicExpiries();
  });
  setTimeout(() => {
      checkDynamicExpiries();
  }, 6000);
`;

content = content.replace(
  '  cron.schedule("0 2 * * *", async () => {',
  dynamicCronCode + '\n  cron.schedule("0 2 * * *", async () => {'
);

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log("Patched server for dynamic cron successfully");
