const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const expiryCronLogic = `
  // ==========================================
  // EXPIRY ALERTS CRON ENGINE
  // ==========================================
  const checkExpiries = () => {
      try {
          logger.info("Running daily Expiry Engine checks...");
          const today = new Date();
          const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all() as any[];
          
          const getSmtpSettingsLocal = () => {
            const row = db.prepare("SELECT * FROM settings WHERE \`key\` = 'smtp'").get() as any;
            if (row && row.value) {
              return JSON.parse(row.value);
            }
            return null;
          };
          
          const smtpConfig = getSmtpSettingsLocal();
          
          // --- 1. COMPLIANCE DOCUMENTS ---
          const staffList = db.prepare("SELECT id, first_name, last_name, email, onboarding_json FROM users WHERE role = 'STAFF'").all() as any[];
          const allFiles = db.prepare("SELECT id, date_expires, original_name FROM files").all() as any[];
          const filesMap = new Map(allFiles.map((f: any) => [f.id, f]));
          
          const complianceKeys = [
              "tfn_super", "ndis_screening", "wwcc", "vevo", "ahpra",
              "ndis_orientation", "cpr", "first_aid", "manual_handling",
              "driver_license", "car_insurance", "flu_shot", "immunisation",
              "covid_vaccine", "police_check"
          ];
          
          const complianceNames: any = {
              tfn_super: "TFN / Super", ndis_screening: "NDIS Worker Screening",
              wwcc: "Working With Children Check", vevo: "VEVO / Visa",
              ahpra: "AHPRA Registration", ndis_orientation: "NDIS Orientation Module",
              cpr: "CPR Certificate", first_aid: "First Aid Certificate",
              manual_handling: "Manual Handling", driver_license: "Driver License",
              car_insurance: "Car Insurance", flu_shot: "Flu Shot",
              immunisation: "Immunisation Record", covid_vaccine: "COVID-19 Vaccine",
              police_check: "National Police Check"
          };
          
          const sendNotification = (staff: any, type: string, title: string, message: string, link: string) => {
              const staffId = staff.id;
              // Check if we already sent this exact alert to the staff
              const existing = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message = ? AND type = ?").get(staffId, message, type);
              if (!existing) {
                  // Notify staff in-app
                  db.prepare("INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)").run(
                      staffId, type, title, message, link
                  );
                  // Notify admins in-app
                  for (const admin of admins) {
                      const adminExisting = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message = ?").get(admin.id, message);
                      if (!adminExisting) {
                          db.prepare("INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)").run(
                              admin.id, type, "Staff Expiry Alert", \`\${staff.first_name} \${staff.last_name}: \${message}\`, \`/staff\`
                          );
                      }
                  }
                  
                  // Optional: Send Email to staff if configured
                  if (smtpConfig && smtpConfig.host && staff.email) {
                      const transporter = getTransporter("system");
                      transporter.sendMail({
                          from: smtpConfig.from || '"System" <no-reply@happyinthehome.org>',
                          to: staff.email,
                          subject: title,
                          text: \`Hello \${staff.first_name},\\n\\n\${message}\\n\\nPlease log in to the portal to review your compliance documents.\\n\\nThank you.\`,
                      }).catch((err: any) => logger.warn("Failed to send expiry email", err));
                  }
              }
          };

          for (const staff of staffList) {
              let onboardingData: any = {};
              try {
                  if (staff.onboarding_json) onboardingData = JSON.parse(staff.onboarding_json);
              } catch (e) {}
              
              for (const key of complianceKeys) {
                  const step = onboardingData[key] || {};
                  const stepFiles = step.files || [];
                  if (stepFiles.length > 0) {
                      const fInfo = stepFiles[0];
                      const fileMeta = filesMap.get(fInfo.id);
                      if (fileMeta && fileMeta.date_expires) {
                          const expDate = new Date(fileMeta.date_expires);
                          const diffTime = expDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          const docName = complianceNames[key] || key;
                          const link = \`/compliance\`;
                          
                          if (diffDays <= 0) {
                              sendNotification(staff, "DOCUMENT_EXPIRED", "Compliance Document Expired", \`Your \${docName} has expired.\`, link);
                          } else if (diffDays <= 30 && diffDays > 0) {
                              sendNotification(staff, "DOCUMENT_EXPIRING_SOON", "Compliance Document Expiring Soon", \`Your \${docName} is expiring in \${diffDays} day(s).\`, link);
                          }
                      }
                  }
              }
          }
          
          // --- 2. TRAINING MODULES ---
          const staffTraining = db.prepare(\`
              SELECT st.*, m.title as module_title 
              FROM staff_training st
              JOIN training_modules m ON st.training_module_id = m.id
              WHERE st.status = 'COMPLETED' AND st.expiry_date IS NOT NULL
          \`).all() as any[];
          
          for (const training of staffTraining) {
              const expDate = new Date(training.expiry_date);
              const diffTime = expDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              const link = \`/training\`;
              const staff = staffList.find((s: any) => s.id === training.staff_id);
              if (!staff) continue;
              
              if (diffDays <= 0) {
                  sendNotification(staff, "TRAINING_EXPIRED", "Training Module Expired", \`Your training for \${training.module_title} has expired.\`, link);
              } else if (diffDays <= 30 && diffDays > 0) {
                  sendNotification(staff, "TRAINING_EXPIRING_SOON", "Training Module Expiring Soon", \`Your training for \${training.module_title} is expiring in \${diffDays} day(s).\`, link);
              }
          }
      } catch (err) {
          logger.error("Error running Expiry Engine", err);
      }
  };

  // Run the check every day at 8:00 AM server time
  cron.schedule("0 8 * * *", () => {
      checkExpiries();
  });

  // Run a quick check 5 seconds after server startup
  setTimeout(() => {
      checkExpiries();
  }, 5000);

`;

const target = `  if (process.env.NODE_ENV !== "production") {`;
if (content.includes(target)) {
    content = content.replace(target, expiryCronLogic + target);
    fs.writeFileSync('src/server.ts', content);
    console.log("Added expiry cron to server.ts");
} else {
    console.log("Target not found!");
}
