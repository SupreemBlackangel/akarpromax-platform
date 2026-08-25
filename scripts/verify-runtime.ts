import { execSync } from 'child_process';
console.log('Verifying Next.js runtime...');
try {
  const result = execSync('npx next --version', { encoding: 'utf8' });
  console.log('Next.js version:', result.trim());
  console.log('Runtime verification PASSED');
} catch (e) {
  console.error('Runtime verification FAILED');
  process.exit(1);
}
