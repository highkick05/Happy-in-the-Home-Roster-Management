import { execSync } from 'child_process';
try {
  execSync('npx tsx src/server.ts', { stdio: 'pipe' });
  console.log('Server started successfully');
} catch (e: any) {
  console.log('Server failed to start:', e.stdout.toString(), e.stderr.toString());
}
