const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const target = `  // Run a quick check 5 seconds after server startup
  setTimeout(() => {
      checkExpiries();
  }, 5000);`;

const replacement = `  // Run a quick check 5 seconds after server startup
  setTimeout(() => {
      checkExpiries();
  }, 5000);

  // ==========================================
  // AUTO-REPAIR DUPLICATE FILES & COMPLIANCE LINKS
  // ==========================================
  setTimeout(() => {
    try {
        console.log("[REPAIR] Starting duplicate file and compliance link repair...");
        
        // 1. Remove Duplicate Files
        const allFiles = db.prepare("SELECT id, system_name, folder_path, original_name FROM files").all() as any[];
        const fileMap = new Map();
        let deletedCount = 0;
        
        for (const f of allFiles) {
            const key = \`\${f.folder_path}/\${f.system_name}\`;
            if (!fileMap.has(key)) {
                fileMap.set(key, f);
            } else {
                const existing = fileMap.get(key);
                if (f.id > existing.id) {
                    db.prepare("DELETE FROM files WHERE id = ?").run(existing.id);
                    fileMap.set(key, f);
                    deletedCount++;
                } else {
                    db.prepare("DELETE FROM files WHERE id = ?").run(f.id);
                    deletedCount++;
                }
            }
        }
        if (deletedCount > 0) {
           console.log(\`[REPAIR] Deleted \${deletedCount} duplicate file records from DB.\`);
        }
        
        // 2. Auto-Link Compliance Docs
        const staffUsers = db.prepare("SELECT id, first_name, last_name, onboarding_json FROM users WHERE role = 'STAFF'").all() as any[];
        const keywordMap: any = {
            tfn_super: ['taxation', 'tfn', 'tax', 'super', 'superannuation', 'ato'],
            ndis_screening: ['screening', 'nwsc', 'worker screening', 'ndis check', 'yellow'],
            wwcc: ['wwcc', 'children', 'working with children', 'blue card'],
            vevo: ['vevo', 'visa', 'passport', 'citizenship', 'right to work'],
            ahpra: ['ahpra', 'registration', 'nursing', 'rn', 'en'],
            ndis_orientation: ['orientation', 'ndis module'],
            cpr: ['cpr', 'hltaid009', 'resuscitation', 'basic life'],
            first_aid: ['first aid', 'hltaid011', 'first_aid', 'firstaid'],
            manual_handling: ['manual handling', 'manual_handling', 'handling'],
            driver_license: ['driver', 'license', 'licence', 'driving'],
            car_insurance: ['insurance', 'comprehensive', 'car', 'vehicle'],
            flu_shot: ['flu', 'influenza'],
            immunisation: ['immunisation', 'immunization', 'vaccine history'],
            covid_vaccine: ['covid', 'covid-19', 'coronavirus', 'pfizer', 'astra'],
            police_check: ['police', 'clearance', 'national police', 'npc']
        };

        for (const user of staffUsers) {
            const nameDir = [user.first_name, user.last_name].filter(Boolean).join(" ");
            const folderPath = \`/Staff/\${nameDir}/Onboarding\`;
            
            const userFiles = db.prepare("SELECT * FROM files WHERE folder_path = ?").all(folderPath) as any[];
            if (!userFiles || userFiles.length === 0) continue;
            
            let progressData: any = {};
            try {
                if (user.onboarding_json) {
                    progressData = JSON.parse(user.onboarding_json);
                }
            } catch(e) {}
            
            let updated = false;
            
            for (const file of userFiles) {
                let alreadyMapped = false;
                for (const stepKey in progressData) {
                    const step = progressData[stepKey];
                    if (step.files && step.files.find((f: any) => f.id === file.id)) {
                        alreadyMapped = true;
                        break;
                    }
                    if (step.fileId === file.id) {
                        alreadyMapped = true;
                        break;
                    }
                }
                
                if (!alreadyMapped) {
                    const lowerName = (file.original_name || file.system_name || '').toLowerCase();
                    let matchedStep = null;
                    
                    for (const [stepKey, keywords] of Object.entries(keywordMap)) {
                        if ((keywords as string[]).some(kw => lowerName.includes(kw))) {
                            matchedStep = stepKey;
                            break;
                        }
                    }
                    
                    if (matchedStep) {
                        if (!progressData[matchedStep]) progressData[matchedStep] = { status: 'pending', files: [] };
                        if (!progressData[matchedStep].files) progressData[matchedStep].files = [];
                        
                        if (progressData[matchedStep].fileId && progressData[matchedStep].files.length === 0) {
                            progressData[matchedStep].files.push({
                               id: progressData[matchedStep].fileId,
                               name: progressData[matchedStep].fileName || 'Document'
                            });
                        }
                        
                        progressData[matchedStep].files.push({
                            id: file.id,
                            name: file.original_name || file.system_name
                        });
                        progressData[matchedStep].status = 'completed';
                        updated = true;
                        console.log(\`[REPAIR] Auto-mapped file \${file.original_name} to \${matchedStep} for \${user.first_name}\`);
                    }
                }
            }
            
            if (updated) {
                db.prepare("UPDATE users SET onboarding_json = ? WHERE id = ?").run(JSON.stringify(progressData), user.id);
            }
        }
    } catch(e) {
        console.error("[REPAIR] Error during auto-repair:", e);
    }
  }, 8000);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/server.ts', content);
    console.log("Injected auto-repair logic into server startup.");
} else {
    console.log("Target not found in server.ts");
}
