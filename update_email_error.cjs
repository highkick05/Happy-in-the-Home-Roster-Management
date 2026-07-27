const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `      res.json({ success: true, message: "Invoice emailed successfully and marked as SENT." });
    } catch (e) {
      console.error("Failed to email invoice:", e);
      res.status(500).json({ error: e.message || "Failed to send email." });
    }
  });`;

const replacementStr = `      res.json({ success: true, message: "Invoice emailed successfully and marked as SENT." });
    } catch (e: any) {
      console.error("Failed to email invoice:", e);
      const smtpInfo = \`Host: \${process.env.SMTP_HOST || "smtp.hostinger.com"}, Port: \${process.env.SMTP_PORT || "465"}, User: \${process.env.SMTP_USER}\`;
      res.status(500).json({ error: \`\${e.message || "Failed to send email."} (SMTP Settings: \${smtpInfo})\` });
    }
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('src/server.ts', code);
  console.log("Updated error message");
} else {
  console.log("Could not find target string in server.ts");
}
