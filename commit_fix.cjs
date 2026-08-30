const { execSync } = require('child_process');
try {
  execSync('git add . && git commit -m "fix: match manual remittance popup UI to manual invoice popup UI" && git push origin main', { stdio: 'inherit' });
} catch(e) {
  console.log("Error");
}
