import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const readWorkflow = (name) =>
  readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');

const release = readWorkflow('release.yml');
const dryRun = readWorkflow('release-dry-run.yml');
const count = (text, value) => text.split(value).length - 1;
const artifactReference = '${{ steps.pack.outputs.tarball }}';

const releaseGateFiles = new Set();
const visitedScripts = new Set();
const inspectScript = (name) => {
  if (visitedScripts.has(name)) return;
  visitedScripts.add(name);

  const command = packageJson.scripts[name];
  assert.equal(typeof command, 'string', `missing package script: ${name}`);
  for (const match of command.matchAll(/(?:^|\s)(scripts\/[^\s;&|]+)/g)) {
    releaseGateFiles.add(match[1]);
  }
  for (const match of command.matchAll(/npm run ([\w:-]+)/g)) {
    inspectScript(match[1]);
  }
};

inspectScript('release:check');
const dryRunPaths = new Set(
  dryRun
    .match(/pull_request:\n    paths:\n((?:      - .+\n)+)/)?.[1]
    .match(/^      - (.+)$/gm)
    ?.map((line) => line.slice('      - '.length)) ?? []
);
for (const file of releaseGateFiles) {
  assert.ok(dryRunPaths.has(file), `release dry run paths must include ${file}`);
}

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
