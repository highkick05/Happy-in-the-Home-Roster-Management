import re

with open("src/server.ts", "r") as f:
    code = f.read()

target1 = """        industrialInstrument,
        commencementDate,
        probationPeriod,"""
replacement1 = """        industrialInstrument,
        contractDate,
        commencementDate,
        probationPeriod,"""
code = code.replace(target1, replacement1)

target2 = """        // Date of contract issue
        doc.moveDown(1);
        const todayDate = new Date().toLocaleDateString("en-AU");"""
replacement2 = """        // Date of contract issue
        doc.moveDown(1);
        const parsedContractDate = contractDate ? new Date(contractDate) : new Date();
        const todayDate = parsedContractDate.toLocaleDateString("en-AU");"""
code = code.replace(target2, replacement2)

target3 = """        doc.text(
          `To accept this offer and the attached terms and conditions, please sign and date this letter in the section below and sign the attached employment contract and return to me by ${new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-AU")}.`,
        );"""
replacement3 = """        doc.text(
          `To accept this offer and the attached terms and conditions, please sign and date this letter in the section below and sign the attached employment contract and return to me by ${new Date(parsedContractDate.getTime() + 14 * 86400000).toLocaleDateString("en-AU")}.`,
        );"""
code = code.replace(target3, replacement3)


with open("src/server.ts", "w") as f:
    f.write(code)

print("Updated server")
