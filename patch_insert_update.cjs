const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetUpdate = `          db.prepare(
            \`UPDATE remittances SET client_id=?, staff_id=?, custom_payee_name=?, amount=?, services_json=? WHERE id=?\`
          ).run(
            clientId,
            finalStaffId,
            finalCustomStaffName,
            calculatedAmount,
            JSON.stringify(services),
            remittanceId
          );`;

const repUpdate = `          db.prepare(
            \`UPDATE remittances SET client_id=?, staff_id=?, custom_payee_name=?, amount=?, services_json=?, invoice_reference=?, transaction_reference=? WHERE id=?\`
          ).run(
            clientId,
            finalStaffId,
            finalCustomStaffName,
            calculatedAmount,
            JSON.stringify(services),
            invoiceReference || null,
            transactionReference || null,
            remittanceId
          );`;

const targetInsert = `          const insertResult = db.prepare(
            \`INSERT INTO remittances (remittance_number, client_id, staff_id, custom_payee_name, amount, status, services_json, attachments_json)
             VALUES (?, ?, ?, ?, ?, 'GENERATED', ?, ?)\`
          ).run(
            remittanceNumber,
            clientId,
            finalStaffId,
            finalCustomStaffName,
            calculatedAmount,
            JSON.stringify(services),
            JSON.stringify(attachments)
          );`;

const repInsert = `          const insertResult = db.prepare(
            \`INSERT INTO remittances (remittance_number, client_id, staff_id, custom_payee_name, amount, status, services_json, attachments_json, invoice_reference, transaction_reference)
             VALUES (?, ?, ?, ?, ?, 'GENERATED', ?, ?, ?, ?)\`
          ).run(
            remittanceNumber,
            clientId,
            finalStaffId,
            finalCustomStaffName,
            calculatedAmount,
            JSON.stringify(services),
            JSON.stringify(attachments),
            invoiceReference || null,
            transactionReference || null
          );`;

if (code.includes(targetUpdate) && code.includes(targetInsert)) {
  code = code.replace(targetUpdate, repUpdate).replace(targetInsert, repInsert);
  fs.writeFileSync('src/server.ts', code);
  console.log("Insert/Update patched");
} else {
  console.log("Target not found!");
}
