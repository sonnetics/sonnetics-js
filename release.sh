#!/usr/bin/env bash
# Bump version, commit, tag, push. Triggers publish workflow (npm).
# Do not edit "version" in package.json by hand — this script increments *-beta.N.
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

CORE_VERSION=$(grep '"@sonnetics/core"' package.json | sed 's/.*"\^*\([^"]*\)".*/\1/')
VANILLA_HTML="examples/demos/vanilla/index.html"
DEMO_PKG_JSON=(
  "examples/demos/vite/package.json"
  "examples/demos/next/package.json"
)

sync_demo_versions() {
  for f in "${DEMO_PKG_JSON[@]}"; do
    sed -i "s|\"@sonnetics/js\": \"[^\"]*\"|\"@sonnetics/js\": \"^${VERSION}\"|" "$f"
  done
  sed -i "s|@sonnetics/js@[^/]*/dist|@sonnetics/js@${VERSION}/dist|" "$VANILLA_HTML"
  sed -i "s|@sonnetics/core@[^/]*/sonnetics_core|@sonnetics/core@${CORE_VERSION}/sonnetics_core|" "$VANILLA_HTML"
}

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would release $VERSION"
  echo "[dry-run] Would update package.json"
  echo "[dry-run] Would sync demo package.json files to ^$VERSION"
  echo "[dry-run] Would sync $VANILLA_HTML (@sonnetics/js@$VERSION, @sonnetics/core@$CORE_VERSION)"
  echo "[dry-run] Would: git commit -m \"chore: release $VERSION\""
  echo "[dry-run] Would: git tag v$VERSION"
  echo "[dry-run] Would: git push && git push --tags"
  exit 0
fi

echo "Releasing $VERSION"

sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$VERSION\"/" package.json
sync_demo_versions

git add package.json "$VANILLA_HTML" "${DEMO_PKG_JSON[@]}"
git commit -m "chore: release $VERSION"
git tag "v$VERSION"
git push && git push --tags

echo ""
echo "Done. GitHub Actions will publish to npm."
