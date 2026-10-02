#!/usr/bin/env bash
# Publishes a NativeAOT binary for the current platform (or RID=<rid> ./build.sh) into ./bin/<rid>.
set -euo pipefail
cd "$(dirname "$0")"

RID="${RID:-$(dotnet --info | awk '/RID:/ {print $2; exit}')}"
VERSION="${VERSION:-0.0.0-dev}"

# Homebrew's .NET SDK ships a non-portable NativeAOT runtime pack that links against
# Homebrew's openssl and brotli. Point the linker at them when .NET came from Homebrew.
# The resulting binary is for local use only; releases are built in CI with the official SDK.
DOTNET_REAL="$(realpath "$(command -v dotnet)" 2>/dev/null || true)"
if command -v brew >/dev/null 2>&1 && [[ "$DOTNET_REAL" == "$(brew --cellar 2>/dev/null)"/* ]]; then
    BREW_PREFIX="$(brew --prefix)"
    export LIBRARY_PATH="$BREW_PREFIX/opt/openssl@3/lib:$BREW_PREFIX/opt/brotli/lib${LIBRARY_PATH:+:$LIBRARY_PATH}"
    echo "Homebrew .NET detected; using LIBRARY_PATH=$LIBRARY_PATH (local-only binary)"
fi

dotnet publish src/CfSupport/CfSupport.csproj -c Release -r "$RID" -p:Version="${VERSION#v}" -o "bin/$RID"
echo "Built bin/$RID"
