const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = fs.existsSync('data.db') ? 'data.db' : 'data/dev-database.sqlite';
const db = new Database(dbPath);

console.log("Cleaning up duplicate files in DB...");
const allFiles = db.prepare("SELECT id, system_name, folder_path, original_name FROM files").all();
const fileMap = new Map();
let deletedCount = 0;

for (const f of allFiles) {
    const key = `${f.folder_path}/${f.system_name}`;
    if (!fileMap.has(key)) {
        fileMap.set(key, f);
    } else {
        const existing = fileMap.get(key);
        // Keep the one with the higher ID
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
console.log(`Deleted ${deletedCount} duplicate file records from DB.`);

const staffUsers = db.prepare("SELECT id, first_name, last_name, onboarding_json FROM users WHERE role = 'STAFF'").all();

const keywordMap = {
    tfn_super: ['taxation', 'tfn', 'tax', 'super', 'superannuation'],
    ndis_screening: ['screening', 'nwsc', 'worker screening'],
    wwcc: ['wwcc', 'children', 'working with children'],
    vevo: ['vevo', 'visa', 'passport', 'citizenship'],
    ahpra: ['ahpra', 'registration', 'nursing'],
    ndis_orientation: ['orientation'],
    cpr: ['cpr', 'hltaid009', 'resuscitation'],
    first_aid: ['first aid', 'hltaid011', 'first_aid', 'firstaid'],
    manual_handling: ['manual handling', 'manual_handling', 'handling'],
    driver_license: ['driver', 'license', 'licence', 'driving'],
    car_insurance: ['insurance', 'comprehensive', 'car'],
    flu_shot: ['flu', 'influenza'],
    immunisation: ['immunisation', 'immunization', 'vaccine history'],
    covid_vaccine: ['covid', 'covid-19', 'coronavirus'],
    police_check: ['police', 'clearance', 'national police']
};

for (const user of staffUsers) {
    const nameDir = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const folderPath = `/Staff/${nameDir}/Onboarding`;
    
    // Get all files for this user
    const userFiles = db.prepare("SELECT * FROM files WHERE folder_path = ?").all(folderPath);
    if (!userFiles || userFiles.length === 0) continue;
    
    let progressData = {};
    try {
        if (user.onboarding_json) {
            progressData = JSON.parse(user.onboarding_json);
        }
    } catch(e) {}
    
    let updated = false;
    
    // Check files
    for (const file of userFiles) {
        // Is this file already mapped somewhere?
        let alreadyMapped = false;
        for (const stepKey in progressData) {
            const step = progressData[stepKey];
            if (step.files && step.files.find(f => f.id === file.id)) {
                alreadyMapped = true;
                break;
            }
            if (step.fileId === file.id) {
                alreadyMapped = true;
                break;
            }
        }
        
        if (!alreadyMapped) {
            // Attempt to auto-map based on filename
            const lowerName = (file.original_name || file.system_name || '').toLowerCase();
            let matchedStep = null;
            
            for (const [stepKey, keywords] of Object.entries(keywordMap)) {
                if (keywords.some(kw => lowerName.includes(kw))) {
                    matchedStep = stepKey;
                    break;
                }
            }
            
            if (matchedStep) {
                if (!progressData[matchedStep]) progressData[matchedStep] = { status: 'pending', files: [] };
                if (!progressData[matchedStep].files) progressData[matchedStep].files = [];
                
                // migrate legacy
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
                console.log(`Auto-mapped file ${file.original_name} to step ${matchedStep} for user ${user.first_name}`);
            }
        }
    }
    
    if (updated) {
        db.prepare("UPDATE users SET onboarding_json = ? WHERE id = ?").run(JSON.stringify(progressData), user.id);
    }
}
console.log("Done checking onboarding compliance links.");
