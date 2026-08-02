'use strict';

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const outArgIdx = process.argv.indexOf('--out');
const outDir = outArgIdx !== -1 ? path.resolve(process.argv[outArgIdx + 1]) : path.join(root, 'dist');

const platform = os.platform();
const isWin = platform === 'win32';
const binName = isWin ? 'escript.exe' : 'escript';

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.join(' '));
  const needsShell = isWin && cmd === 'npx';
  execFileSync(cmd, args, { stdio: 'inherit', shell: needsShell, ...opts });
}

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

console.log('\n[1/4] Bundling with esbuild...');
run('npx', [
  '--yes', 'esbuild', 'cli.js',
  '--bundle', '--platform=node', '--format=cjs',
  '--outfile=build/bundle.cjs',
], { cwd: root });

console.log('\n[2/4] Generating SEA blob...');
run(process.execPath, ['--experimental-sea-config', 'sea-config.json'], { cwd: root });

console.log('\n[3/4] Copying node binary...');
const target = path.join(buildDir, binName);
fs.copyFileSync(process.execPath, target);
fs.chmodSync(target, 0o755);
if (platform === 'darwin') {
  try {
    run('codesign', ['--remove-signature', target]);
  } catch (e) {
    console.warn('  (codesign --remove-signature skipped:', e.message, ')');
  }
}

console.log('\n[4/4] Injecting blob with postject...');
const postjectArgs = [
  '--yes', 'postject', target, 'NODE_SEA_BLOB', path.join('build', 'sea-prep.blob'),
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
];
if (platform === 'darwin') postjectArgs.push('--macho-segment-name', 'NODE_SEA');
run('npx', postjectArgs, { cwd: root });

if (platform === 'darwin') {
  try {
    run('codesign', ['--sign', '-', target]);
  } catch (e) {
    console.warn('  (codesign --sign skipped:', e.message, ')');
  }
}

const finalPath = path.join(outDir, binName);
fs.copyFileSync(target, finalPath);
fs.chmodSync(finalPath, 0o755);

console.log(`\nDone: ${finalPath}`);
console.log('Test it with:');
console.log(`  ${finalPath} run demo.es`);
