#!/usr/bin/env bash
# Publish sonnetics-js to npm (@sonnetics/js). Touches only js.
# Reads @sonnetics/core version from sonnetics-core to set dependency.
# Default: dry run (no commit, tag, or npm publish).
# Usage: ./publish-js.sh [--publish] [TAG]
#   --publish  Actually commit, tag, and publish to npm
#   TAG        npm tag, default: beta
# Example: ./publish-js.sh           # dry run
#          ./publish-js.sh --publish beta
#
# Run from sonnetics repo. Override: SONNETICS_CORE_DIR, SONNETICS_JS_DIR

set -e

PUBLISH=false
TAG="beta"
for arg in "$@"; do
  if [[ "$arg" == "--publish" ]]; then
    PUBLISH=true
  else
    TAG="$arg"
  fi
done

JS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$JS_DIR/../sonnetics-core" && pwd)"
cd "$JS_DIR"


if [[ ! -d "$CORE_DIR" ]]; then
  echo "Error: sonnetics-core not found at $CORE_DIR"
  exit 1
fi

if [[ ! -d "$JS_DIR" ]]; then
  echo "Error: sonnetics-js not found at $JS_DIR"
  exit 1
fi

if [[ "$PUBLISH" == true ]] && [[ -z "${SKIP_CLEAN_CHECK:-}" ]]; then
  for dir in "$CORE_DIR" "$JS_DIR"; do
    if [[ -n $(git -C "$dir" status --porcelain) ]]; then
      echo "Error: Uncommitted changes in $(basename "$dir"). Commit or stash first."
      exit 1
    fi
  done
fi

# Peek at core version (Cargo.toml is source of truth)
CORE_VERSION=$(grep '^version = ' "$CORE_DIR/Cargo.toml" | sed 's/version = "\(.*\)"/\1/')
npm pkg set "dependencies.@sonnetics/core=^$CORE_VERSION" --prefix "$JS_DIR"

VERSION=$(npm version prerelease --preid=beta --no-git-tag-version | sed 's/^v//')

if npm view "@sonnetics/js@$VERSION" version &>/dev/null; then
  echo "Error: $VERSION already published on npm."
  git checkout package.json
  exit 1
fi

if [[ "$PUBLISH" == true ]]; then
  echo "=== Publishing @sonnetics/js $VERSION (tag: $TAG, @sonnetics/core ^$CORE_VERSION) ==="
else
  echo "=== DRY RUN: @sonnetics/js $VERSION (tag: $TAG, @sonnetics/core ^$CORE_VERSION) ==="
fi

npm install  # refresh lockfile

echo "Building (clean dist)..."
rm -rf dist && npm run build

if [[ "$PUBLISH" != true ]]; then
  echo ""
  echo "npm publish (dry run)..."
  npm publish --tag "$TAG" --access public --dry-run
  echo ""
  echo "Dry run complete. Run with --publish to commit, tag, and publish to npm:"
  echo "  ./publish-js.sh --publish $TAG"
  exit 0
fi

git add package.json package-lock.json
git commit -m "chore: release $VERSION"

if ! npm whoami &>/dev/null; then
  echo "Not logged in to npm. Running: npm login"
  npm login
  if ! npm whoami &>/dev/null; then
    echo "Error: npm login failed or was cancelled."
    exit 1
  fi
fi

npm publish --tag "$TAG" --access public
git tag "v$VERSION"

echo ""
echo "Done. Install with: npm install @sonnetics/js@$TAG"
