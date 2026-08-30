const { execSync } = require('child_process');
try {
  execSync('git add . && git commit --amend --no-edit && git push -f origin main', { stdio: 'inherit' });
} catch(e) {
  console.log("Error");
}
