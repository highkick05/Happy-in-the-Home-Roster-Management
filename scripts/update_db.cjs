const Database = require('better-sqlite3');
const db = new Database('./data/dev-database.sqlite');
const db2 = new Database('./data/database.sqlite');

try {
    const updateStmt = db.prepare(`
        UPDATE position_templates 
        SET description_text = REPLACE(description_text, '• Certificate III in Individual Support, Aged Care, or Disability (or equivalent/working towards).', '• Previous experience performing personal care.')
        WHERE position_title = 'Support Worker'
    `);
    updateStmt.run();
    console.log("Updated dev-database.sqlite");
} catch (e) {
    console.log("Error updating dev-database.sqlite", e);
}

try {
    const updateStmt2 = db2.prepare(`
        UPDATE position_templates 
        SET description_text = REPLACE(description_text, '• Certificate III in Individual Support, Aged Care, or Disability (or equivalent/working towards).', '• Previous experience performing personal care.')
        WHERE position_title = 'Support Worker'
    `);
    updateStmt2.run();
    console.log("Updated database.sqlite");
} catch (e) {
    console.log("Error updating database.sqlite", e);
}

