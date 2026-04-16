#!/usr/bin/env bash
# docker-clean.sh — run after any Docker work to prevent Docker.raw bloat
set -euo pipefail

echo "=== Docker usage before cleanup ==="
docker system df

echo ""
echo "=== Pruning containers, images, networks, volumes ==="
docker system prune -a --volumes -f

echo ""
echo "=== Pruning build cache ==="
docker builder prune -a -f

echo ""
echo "=== Docker usage after cleanup ==="
docker system df

echo ""
echo "Done. Docker is clean."
