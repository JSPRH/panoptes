#!/usr/bin/env bash
# Publish @justinmiehle packages to npm. Temporarily overrides root .npmrc
# so @justinmiehle points at registry.npmjs.org (npm ignores workspace .npmrc).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Backup and override root .npmrc so scope points at npm
cp .npmrc .npmrc.bak
echo '@justinmiehle:registry=https://registry.npmjs.org' > .npmrc

restore_npmrc() {
  mv .npmrc.bak .npmrc
}
trap restore_npmrc EXIT

bun run build:shared
(cd packages/shared && npm publish --access public --registry https://registry.npmjs.org)

bun run build:reporters
(cd packages/reporters/playwright && npm publish --access public --registry https://registry.npmjs.org)
(cd packages/reporters/vitest && npm publish --access public --registry https://registry.npmjs.org)

echo "Done. All three packages published to npm."
