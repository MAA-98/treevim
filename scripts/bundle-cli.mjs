import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

const internalPackages = ['@mak-98/dirvi-app', 'dirvi-lib', 'dirvi-apis'];

function isInternalPackage(specifier) {
  return internalPackages.some(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );
}

await mkdir('release/treevim/dist', { recursive: true });

const result = await build({
  entryPoints: ['packages/dirvi-cli/src/index.tsx'],
  outfile: 'release/treevim/dist/cli.js',

  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',

  sourcemap: true,
  metafile: true,

  plugins: [
    {
      name: 'external-third-party-packages',
      setup(build) {
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (isInternalPackage(args.path)) {
            // Resolve and include our workspace package in the bundle.
            return;
          }

          // Keep third-party packages and Node built-ins external.
          return { path: args.path, external: true };
        });
      },
    },
  ],
});

await writeFile(
  'release/treevim/bundle-meta.json',
  JSON.stringify(result.metafile, null, 2),
);

const externalImports = new Set();

for (const output of Object.values(result.metafile.outputs)) {
  for (const item of output.imports) {
    if (item.external) externalImports.add(item.path);
  }
}

console.log('\nExternal imports:');
for (const specifier of [...externalImports].sort()) {
  console.log(`  ${specifier}`);
}

console.log('\nCLI bundle: release/treevim/dist/cli.js');
