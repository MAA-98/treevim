import { access, copyFile, cp, rm } from 'node:fs/promises';

const releaseDir = 'release/treevim';
const apiSource = 'packages/dirvi-apis/dist';
const apiDestination = `${releaseDir}/dist/api`;

// Fail early if the CLI bundle hasn't been built.
await access(`${releaseDir}/dist/cli.js`);

// Replace the copied API so deleted source files don't survive in a later build.
await rm(apiDestination, { recursive: true, force: true });

await cp(apiSource, apiDestination, {
  recursive: true,
  // Declaration maps point back to source files that aren't included here.
  filter: (source) => !source.endsWith('.d.ts.map'),
});

await copyFile('packaging/treevim/package.json', `${releaseDir}/package.json`);
await copyFile('README.md', `${releaseDir}/README.md`);
await copyFile('LICENSE', `${releaseDir}/LICENSE`);

// Check the entry points declared in package.json.
for (const file of [
  'dist/cli.js',
  'dist/api/index.js',
  'dist/api/index.d.ts',
  'dist/api/app/index.js',
  'dist/api/app/index.d.ts',
  'dist/api/treevim-api/index.js',
  'dist/api/treevim-api/index.d.ts',
  'dist/api/treevim.js',
  'dist/api/treevim.d.ts',
]) {
  await access(`${releaseDir}/${file}`);
}

console.log(`Assembled ${releaseDir}`);
