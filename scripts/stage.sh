#!/bin/bash
# 构建并同步到 /tmp/v9-site/superavatar/（预览工具无法读取 ~/Documents；子路径用于验证相对基址）
set -e
cd "$(dirname "$0")/.."
npx vite build >/dev/null 2>&1 || npx vite build
mkdir -p /tmp/v9-site/superavatar
rsync -a --delete dist/ /tmp/v9-site/superavatar/
echo staged
