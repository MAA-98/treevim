# Releasing treevim

This guide publishes a version to npm under the `candidate` tag, tests it,
and then promotes that same version to `beta`.

A candidate is **public** as soon as it is published. The `candidate` tag is
a label, not a private staging area.

## 1. Choose the version

Choose an unpublished version, for example `0.1.0-beta.5`. A beta version
number can be published under the `candidate` tag first; the version number
and npm tag are separate things.

Set it in your shell for the commands below:

```sh
version="0.1.0-beta.5"
```

If you return to this guide in a new shell, set `version` again.

Update the version in both places:

- `packaging/treevim/package.json`
- The hard-coded CLI version in `packages/dirvi-cli/src/index.tsx`

Also update the README's version-specific source link and any release notes.

## 2. Prepare the source

From the repository root:

```sh
pnpm typecheck
git status --short
```

Review the changes and commit the intended release source. Make sure the
repository's license notices and README describe what is actually included in
the release.

Create a Git tag for the release commit and push it:

```sh
git tag -a "v$version" -m "treevim $version"
git push origin HEAD
git push origin "v$version"
```

If the tag already exists, check where it points before proceeding. The
published source tag should correspond to the source used to build the package.

## 3. Build and pack

From the repository root:

```sh
pnpm release:prepare
```

Check that the assembled package reports the intended version:

```sh
node -p "JSON.parse(require('node:fs').readFileSync('release/treevim/package.json', 'utf8')).version"
```

Should match `$version`.

Create a tarball outside the repository:

```sh
release_dir="$(mktemp -d)"
echo "Release directory: $release_dir"

(cd release/treevim && npm pack --pack-destination "$release_dir")
```

Add a local installation and CLI check:

```sh
test_dir="$(mktemp -d)"
echo "Test directory: $test_dir"

npm install --prefix "$test_dir" "$release_dir/treevim-$version.tgz"

"$test_dir/node_modules/.bin/treevim" --version
"$test_dir/node_modules/.bin/treevim" --help
"$test_dir/node_modules/.bin/treevim"
```

If anything needs changing, make the change in source, update the release
commit and tag as appropriate, and build and pack again before publishing.

## 4. Publish the candidate

Check that you're logged in to the account that can publish `treevim`:

```sh
npm whoami
```

If necessary:

```sh
npm login
```

Publish the tarball:

```sh
npm publish "$release_dir/treevim-$version.tgz" --tag candidate
```

npm may ask for two-factor authentication.

Check the tags and candidate version:

```sh
npm view treevim dist-tags
npm view treevim@candidate version
```

The candidate version should match `$version`. Check that `beta` and `latest`
still point where you expect.

> Once published, `treevim@$version` cannot be published again, even if it is
> unpublished. If a fix is needed, use a new version.

## 5. Test the published candidate

Check that the candidate tag points to the version you intend to test:

```sh
npm view treevim@candidate version
```

Install it globally and check the command:

```sh
npm install -g treevim@candidate
treevim --help
treevim --version
treevim
```

Confirm that the version matches `$version`. Test startup, configuration
loading, the changed functionality, and quitting. If the API changed, test
a compatible external app or plugin too.

If the candidate fails, do not promote it. Fix the issue, publish a new
version under `candidate`, and test again.

To restore the current beta locally:

```sh
npm install -g treevim@beta
```

## 6. Promote to beta

Once the candidate is accepted, point `beta` at the exact version tested:

```sh
npm dist-tag add "treevim@$version" beta
```

Verify:

```sh
npm view treevim@beta version
npm view treevim dist-tags
```

`treevim@beta` should now resolve to `$version`.

Promotion does not rebuild or republish the package. The `candidate` tag still
points to the version unless you move or remove it.

### About `latest`

Moving `beta` does **not** deliberately move `latest`. Check the tags after
each release.

Currently, `latest` points to a beta version, so users installing `treevim`
without a tag may receive a beta. Move `latest` only when you explicitly want
to change what those users receive:

```sh
npm dist-tag add "treevim@$version" latest
```

## 7. Create the GitHub release

Create a GitHub release for `v<version>` and mark it as a pre-release.

Include:

- Notable changes.
- Breaking changes and migration steps.
- Known limitations.
- Installation: `npm install -g treevim@beta`.
- A link to the source tag.

## Optional: remove the candidate tag

You can leave `candidate` pointing to the promoted version. If you want to
remove it, first check that another candidate has not been published in the
meantime:

```sh
npm view treevim@candidate version
```

Then remove it:

```sh
npm dist-tag rm treevim candidate
```

Removing a tag does not remove the published version.
