#!/usr/bin/env node
'use strict';
/**
 * Builds a standalone, single-file executable for E-script using Node's
 * built-in Single Executable Application (SEA) support.
 *
 * The resulting binary has Node baked in — end users do NOT need Node or
 * npm installed to run it, same as downloading a `node`/`deno`/`bun` binary.
 *
 * Requires (dev-time only, on the machine doing the build):
 *   - Node >= 20.12 (for --experimental-sea-config)
 *   - `npx esbuild`  (bundles the multi-file CLI into one script)
 *   - `npx postject` (injects the bundle into a copy of the node binary)
 * Both are fetched on demand via npx, so they are not listed as
 * dependencies of the escript package itself.
 *
 * Usage:
 *   node scripts/build-binary.js            # build for current platform
 *   node scripts/build-binary.js --out dist  # custom output dir
 */

const { execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'build');
const outArgIdx = process.argv.indexOf('--out');
const outDir = outArgIdx !== -1 ? path.resolve(process.argv[outArgIdx + 1]) : path.join(root, 'dist');

const platform = os.platform(); // 'linux' | 'darwin' | 'win32'
const isWin = platform === 'win32';
const binName = isWin ? 'escript.exe' : 'escript';

function run(cmd, args, opts = {}) {
  console.log('>', cmd, args.join(' '));
  // Windows blocks directly spawning .cmd/.bat shims (like npx) without a
  // shell (Node's fix for CVE-2024-27980). shell:true routes it through
  // cmd.exe, which resolves `npx` correctly.
  const needsShell = isWin && cmd === 'npx';
  execFileSync(cmd, args, { stdio: 'inherit', shell: needsShell, ...opts });
}

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

// 1. Bundle the CLI (cli.js + lexer/parser/codegen) into one CJS file.
//    SEA embeds a single script, so multi-file `require('./lexer')` calls
//    need to be resolved and inlined ahead of time.
console.log('\n[1/4] Bundling with esbuild...');
run('npx', [
  '--yes', 'esbuild', 'cli.js',
  '--bundle', '--platform=node', '--format=cjs',
  '--outfile=build/bundle.cjs',
], { cwd: root });

// 2. Generate the SEA prep blob from the bundle + sea-config.json.
console.log('\n[2/4] Generating SEA blob...');
run(process.execPath, ['--experimental-sea-config', 'sea-config.json'], { cwd: root });

// 3. Copy the current node binary to use as the base executable.
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

// 4. Inject the blob into the copied binary.
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