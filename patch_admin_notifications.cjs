const fs = require('fs');

const serverFile = 'src/server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Fix GET /api/notifications
const getQueryRegex = /let query = "SELECT \* FROM notifications WHERE user_id = \?";\s+if \(req\.user\.role !== 'ADMIN'\) \{/g;
const newGetQuery = `let query = "SELECT * FROM notifications WHERE user_id = ?";
      if (req.user.role === 'ADMIN') {
        query = "SELECT * FROM notifications WHERE user_id = ? OR user_id = 0";
      } else if (req.user.role !== 'ADMIN') {`;

code = code.replace(getQueryRegex, newGetQuery);


// 2. Fix PUT /api/notifications/read-all
const putAllRegex = /db\.prepare\(\s*"UPDATE notifications SET is_read = 1 WHERE user_id = \? AND is_read = 0"\s*\)\.run\(req\.user\.id\);/g;
const newPutAll = `db.prepare(
             "UPDATE notifications SET is_read = 1 WHERE (user_id = ? OR user_id = 0) AND is_read = 0"
           ).run(req.user.id);`;

code = code.replace(putAllRegex, newPutAll);

// 3. Fix PUT /api/notifications/:id/read
const putReadRegex = /db\.prepare\(\s*"UPDATE notifications SET is_read = 1 WHERE id = \? AND user_id = \?",\s*\)\.run\(req\.params\.id, req\.user\.id\);/g;
const newPutRead = `if (req.user.role === 'ADMIN') {
          db.prepare(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id = 0)",
          ).run(req.params.id, req.user.id);
        } else {
          db.prepare(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
          ).run(req.params.id, req.user.id);
        }`;

code = code.replace(putReadRegex, newPutRead);

// 4. Fix SHIFT_COMPLETED insertion
const shiftCompletedRegex = /const admins = db\.prepare\(\s*"SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1"\s*\)\.all\(\) as any\[\];\s+const insertNotif = db\.prepare\(\s*"INSERT INTO notifications \(user_id, type, title, message, link\) VALUES \(\?, \?, \?, \?, \?\)",\s*\);\s+for \(const admin of admins\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"SHIFT_COMPLETED",\s*"Shift Completed",\s*`\$\{staffName\} has completed their shift with \$\{clientName\} and submitted progress notes\.`,\s*"\/roster",\s*\);\s+\}/g;

const newShiftCompleted = `const insertNotif = db.prepare(
            "INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
          );
          
          insertNotif.run(
            0,
            "SHIFT_COMPLETED",
            "Shift Completed",
            \`\${staffName} has completed their shift with \${clientName} and submitted progress notes.\`,
            "/roster",
          );`;

code = code.replace(shiftCompletedRegex, newShiftCompleted);

// 5. Fix DOCUMENT_EXPIRED insertion for admins
const docExpiredRegex = /\/\/ Notify admins\s+for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRED",\s*`Staff Document Expired`,\s*adminMsg,\s*`\/staff\/\$\{file\.staff_id\}`,\s*\);\s+\}\s+\}/g;

const newDocExpired = `// Notify admins
            const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRED", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRED",
                \`Staff Document Expired\`,
                adminMsg,
                \`/staff/\${file.staff_id}\`,
              );
            }`;
code = code.replace(docExpiredRegex, newDocExpired);

// 6. Fix DOCUMENT_EXPIRING_SOON insertion for admins
const docExpiringRegex = /\/\/ Notify admins\s+for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`%\$\{file\.original_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"DOCUMENT_EXPIRING_SOON",\s*`Staff Document Expiring Soon`,\s*adminMsg,\s*`\/staff\/\$\{file\.staff_id\}`,\s*\);\s+\}\s+\}/g;

const newDocExpiring = `// Notify admins
            const adminExists = checkNotif.get(0, "DOCUMENT_EXPIRING_SOON", \`%\${file.original_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "DOCUMENT_EXPIRING_SOON",
                \`Staff Document Expiring Soon\`,
                adminMsg,
                \`/staff/\${file.staff_id}\`,
              );
            }`;
code = code.replace(docExpiringRegex, newDocExpiring);

// 7. Fix TRAINING_EXPIRED insertion for admins
const trainExpiredRegex = /\/\/ Notify admins\s+for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"TRAINING_EXPIRED",\s*`%\$\{item\.module_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"TRAINING_EXPIRED",\s*`Staff Training Expired`,\s*adminMsg,\s*`\/training`,\s*\);\s+\}\s+\}/g;

const newTrainExpired = `// Notify admins
            const adminExists = checkNotif.get(0, "TRAINING_EXPIRED", \`%\${item.module_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "TRAINING_EXPIRED",
                \`Staff Training Expired\`,
                adminMsg,
                \`/training\`,
              );
            }`;
code = code.replace(trainExpiredRegex, newTrainExpired);

// 8. Fix TRAINING_EXPIRING_SOON insertion for admins
const trainExpiringRegex = /\/\/ Notify admins\s+for \(const admin of admins\) \{\s+const adminExists = checkNotif\.get\(\s*admin\.id,\s*"TRAINING_EXPIRING_SOON",\s*`%\$\{item\.module_name\}%`,\s*\);\s+if \(!adminExists\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"TRAINING_EXPIRING_SOON",\s*`Staff Training Expiring Soon`,\s*adminMsg,\s*`\/training`,\s*\);\s+\}\s+\}/g;

const newTrainExpiring = `// Notify admins
            const adminExists = checkNotif.get(0, "TRAINING_EXPIRING_SOON", \`%\${item.module_name}%\`);
            if (!adminExists) {
              insertNotif.run(
                0,
                "TRAINING_EXPIRING_SOON",
                \`Staff Training Expiring Soon\`,
                adminMsg,
                \`/training\`,
              );
            }`;
code = code.replace(trainExpiringRegex, newTrainExpiring);

// 9. Add startup migration logic
const migrationLogic = `
  // Migrate notifications to shared admin queue (user_id = 0)
  try {
    const adminIds = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR can_switch_admin = 1").all().map((r: any) => r.id);
    if (adminIds.length > 0) {
      const placeholders = adminIds.map(() => '?').join(',');
      const adminNotifs = db.prepare(\`SELECT * FROM notifications WHERE user_id IN (\${placeholders}) AND type IN ('SHIFT_COMPLETED', 'DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING_SOON', 'TRAINING_EXPIRED', 'TRAINING_EXPIRING_SOON') AND title LIKE 'Staff%'\`).all(...adminIds) as any[];
      const shiftNotifs = db.prepare(\`SELECT * FROM notifications WHERE user_id IN (\${placeholders}) AND type = 'SHIFT_COMPLETED'\`).all(...adminIds) as any[];
      
      const allToMigrate = [...adminNotifs, ...shiftNotifs];
      
      const grouped = new Map();
      for (const n of allToMigrate) {
        const key = \`\${n.type}:::\${n.title}:::\${n.message}:::\${n.link}\`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key).push(n);
      }
      
      let deleted = 0;
      let updated = 0;
      db.prepare("BEGIN TRANSACTION").run();
      for (const [key, group] of grouped) {
        const keep = group[0];
        db.prepare("UPDATE notifications SET user_id = 0 WHERE id = ?").run(keep.id);
        updated++;
        for (let i = 1; i < group.length; i++) {
          db.prepare("DELETE FROM notifications WHERE id = ?").run(group[i].id);
          deleted++;
        }
      }
      db.prepare("COMMIT").run();
      if (updated > 0 || deleted > 0) {
        logger.info(\`Migrated \${updated} admin notifications to shared queue. Deleted \${deleted} duplicates.\`);
      }
    }
  } catch (e) {
    logger.error("Failed to run notification migration:", e);
    db.prepare("ROLLBACK").run();
  }
`;

// Insert the migration logic right before `checkComplianceDocumentExpiry();`
code = code.replace(/\/\/ Run once on startup/g, `// Run once on startup\n${migrationLogic}`);

fs.writeFileSync(serverFile, code);
console.log("Patched server.ts successfully");
