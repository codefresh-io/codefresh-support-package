#!/usr/bin/env bash
# Publishes a NativeAOT binary for the current platform (or RID=<rid> ./build.sh) into ./bin/<rid>.
set -euo pipefail
cd "$(dirname "$0")"

RID="${RID:-$(dotnet --info | awk '/RID:/ {print $2; exit}')}"
VERSION="${VERSION:-0.0.0-dev}"

dotnet publish src/CfSupport/CfSupport.csproj -c Release -r "$RID" -p:Version="${VERSION#v}" -o "bin/$RID"
echo "Built bin/$RID"
