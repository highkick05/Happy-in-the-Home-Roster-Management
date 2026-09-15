const db = require('better-sqlite3')('data/dev-database.sqlite');
const fs = require('fs');
const path = require('path');

const users = db.prepare("SELECT id, onboarding_json FROM users WHERE onboarding_json IS NOT NULL").all();
for (const user of users) {
  let onboardingData = JSON.parse(user.onboarding_json || '{}');
  const fileIdsObject = {};
  for (const stepKey in onboardingData) {
    const step = onboardingData[stepKey];
    if (step.files && Array.isArray(step.files)) {
      for (const f of step.files) {
        if (f.id) {
          fileIdsObject[f.id] = true;
        }
      }
    } else if (step.fileId) {
      fileIdsObject[step.fileId] = true;
    }
  }
  const fileIds = Object.keys(fileIdsObject).map((id) => parseInt(id, 10));
  if (fileIds.length > 0) {
    const placeholders = fileIds.map(() => "?").join(",");
    const existingFiles = db
      .prepare(`SELECT id, system_name, folder_path FROM files WHERE id IN (${placeholders})`)
      .all(...fileIds);
    console.log("Existing files for user", user.id, existingFiles);
    existingFiles.forEach((f) => {
      const filePath = path.join(process.cwd(), 'uploads', (f.folder_path || '/').replace(/^\/+/, ''), f.system_name);
      console.log("Checking path:", filePath, fs.existsSync(filePath));
    });
  }
}
