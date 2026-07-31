# Font metric fixture provenance

`font-metrics-fantasticon-1.json` records the TTF metrics produced by the
Fantasticon 1 toolchain before the build dependency refresh. Its `metadata`
object identifies the exact source commit, resolved Fantasticon and
`opentype.js` versions, runtime, platform, and SHA-256 of the legacy
`package-lock.json`.

## Recreate the fixture

Run these commands on an Apple silicon macOS host. They intentionally use the
runtime recorded in the fixture rather than the versions supported by the
refreshed build:

```sh
git worktree add --detach /tmp/salesforcedx-icons-fantasticon-1 \
  9d828ce6b69f770f005d25b339fd1d1044872508
cd /tmp/salesforcedx-icons-fantasticon-1
nvm use 25.8.1
npm install --global npm@11.11.0
node --version   # v25.8.1
npm --version    # 11.11.0
npm ci
npm run build

cd /path/to/current/salesforcedx-icons
node scripts/capture-font-metrics.js \
  --worktree /tmp/salesforcedx-icons-fantasticon-1 \
  --output test/fixtures/font-metrics-fantasticon-1.json
git diff --exit-code -- test/fixtures/font-metrics-fantasticon-1.json
```

The expected SHA-256 for that worktree's unmodified `package-lock.json` is
`912d0bf2a41cb9845b770bbd399514785fffb732b4a1abd3327984631e0bb7a9`.
The temporary baseline supplied during the dependency refresh can be used
without rebuilding by replacing the `--worktree` value with
`"$(cat /tmp/salesforcedx-icons-baseline-dir)"`.

## Legacy fallback geometry

Fantasticon 1 emitted `.notdef` for the canonical SFDX mappings
`action-accept` (`E900`), `action-explain` (`E901`), and `action-reject`
(`E902`), while their legacy aliases at `F101`, `F102`, and `F103` contained
the intended outlines. The capture helper therefore records the alias geometry
under each formerly `.notdef` canonical mapping and also records the alias
codepoints themselves. The `baselineFallbacks` object makes those three
substitutions explicit and auditable.
