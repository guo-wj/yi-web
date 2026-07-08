#!/usr/bin/env bash
# 将 dist/ 内容上传到服务器 nginx 静态目录
# 效果等同: scp -r dist/* root@39.107.249.82:/usr/share/nginx/html/
#
# 用法:
#   ./scripts/deploy-h5.sh
#   DEPLOY_HOST=1.2.3.4 ./scripts/deploy-h5.sh
#   npm run deploy:h5          # 先 build 再上传

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:-39.107.249.82}"
DEPLOY_PATH="${DEPLOY_PATH:-/usr/share/nginx/html}"
DIST_DIR="${DIST_DIR:-dist}"

if [[ ! -d "$DIST_DIR" ]]; then
    echo "错误: 未找到 $DIST_DIR，请先执行 npm run build:h5" >&2
    exit 1
fi

if ! command -v scp >/dev/null 2>&1; then
    echo "错误: 未找到 scp 命令" >&2
    exit 1
fi

REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "上传 ${DIST_DIR}/ -> ${REMOTE}"
echo "（等同 scp -r dist/* ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/）"
echo

# dist/. 上传目录内全部文件（含隐藏文件），比 dist/* 更完整
scp -r "${DIST_DIR}/." "$REMOTE"

echo
echo "部署完成: http://${DEPLOY_HOST}/"
