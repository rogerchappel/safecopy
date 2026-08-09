import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readWorkflow = (name) =>
  readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');

const release = readWorkflow('release.yml');
const dryRun = readWorkflow('release-dry-run.yml');
const count = (text, value) => text.split(value).length - 1;
const artifactReference = '${{ steps.pack.outputs.tarball }}';

for (const [name, workflow] of [
  ['release', release],
  ['release dry run', dryRun]
]) {
  assert.equal(count(workflow, 'npm pack --json'), 1, `${name} must pack exactly once`);
  assert.match(workflow, /id: pack/);
  assert.match(workflow, /echo "tarball=\$tarball" >> "\$GITHUB_OUTPUT"/);
}

assert.match(release, /^permissions:\n  contents: write\n  id-token: write$/m);
assert.ok(
  release.includes(`npm publish "${artifactReference}" --provenance --access public`),
  'release must publish the packed artifact with trusted-publishing provenance'
);
assert.ok(
  release.includes(`gh release create "\${GITHUB_REF_NAME}" --notes-file RELEASE_NOTES.md "${artifactReference}"`),
  'GitHub release must attach the artifact published to npm'
);
assert.ok(
  dryRun.includes(`npm publish "${artifactReference}" --dry-run --access public`),
  'dry run must exercise npm publication of the packed artifact'
);

console.log('Release workflows pack once and reuse the exact artifact for publication.');
