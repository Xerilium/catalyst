const cp = require('child_process');
// mock execSync to return Buffer
cp.execSync = () => Buffer.from('testuser\n');

const { GitHubAdapter } = require('./src/playbooks/scripts/github/adapter');

(async () => {
  const adapter = new GitHubAdapter();
  try {
    const res = await adapter.checkAuth();
    console.log('checkAuth result:', res);
  } catch (err) {
    console.error('checkAuth threw:', err);
  }

  try {
    const authRes = await adapter.authenticate();
    console.log('authenticate result:', authRes);
  } catch (err) {
    console.error('authenticate threw:', err);
  }
})();