#!/usr/bin/env bash
# Bump version, commit, tag, push. Triggers publish workflow (npm).
# Usage: ./release.sh [--dry-run]
# Requires clean working tree.

set -e

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ -n $(git status --porcelain) ]] && [[ "$DRY_RUN" != true ]]; then
  echo "Error: Uncommitted changes. Commit or stash first."
  exit 1
fi

CURRENT=$(grep '"version":' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
if [[ "$CURRENT" =~ ^(.*-beta\.)([0-9]+)$ ]]; then
  VERSION="${BASH_REMATCH[1]}$((${BASH_REMATCH[2]} + 1))"
else
  echo "Error: Unexpected version format: $CURRENT"
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would release $VERSION"
  echo "[dry-run] Would update package.json"
  echo "[dry-run] Would: git commit -m \"chore: release $VERSION\""
  echo "[dry-run] Would: git tag v$VERSION"
  echo "[dry-run] Would: git push && git push --tags"
  exit 0
fi

echo "Releasing $VERSION"

sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$VERSION\"/" package.json

git add package.json
git commit -m "chore: release $VERSION"
git tag "v$VERSION"
git push && git push --tags

echo ""
echo "Done. GitHub Actions will publish to npm."
