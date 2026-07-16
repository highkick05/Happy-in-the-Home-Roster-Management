import re

with open("src/server.ts", "r") as f:
    code = f.read()

target1 = """        industrialInstrument,
        contractDate,
        commencementDate,
        probationPeriod,"""
replacement1 = """        industrialInstrument,
        contractDate,
        returnDate,
        commencementDate,
        probationPeriod,"""
code = code.replace(target1, replacement1)

target2 = """        doc.text(
          `To accept this offer and the attached terms and conditions, please sign and date this letter in the section below and sign the attached employment contract and return to me by ${new Date(parsedContractDate.getTime() + 14 * 86400000).toLocaleDateString("en-AU")}.`,
        );"""
replacement2 = """        const parsedReturnDate = returnDate ? new Date(returnDate) : new Date(parsedContractDate.getTime() + 14 * 86400000);
        doc.text(
          `To accept this offer and the attached terms and conditions, please sign and date this letter in the section below and sign the attached employment contract and return to me by ${parsedReturnDate.toLocaleDateString("en-AU")}.`,
        );"""
code = code.replace(target2, replacement2)

with open("src/server.ts", "w") as f:
    f.write(code)

print("Updated server")
