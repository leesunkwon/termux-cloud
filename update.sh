#!/bin/bash
set -e

# ==============================================================================
#  ☁️  iCloud Personal Server - 최신 코드 업데이트 스크립트 (update.sh)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  🔄   갤럭시 개인 클라우드 최신 버전 업데이트        ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Git 업데이트
if [ -d ".git" ]; then
    echo -e "${CYAN}[*] GitHub 저장소에서 최신 코드를 내려받습니다...${NC}"
    # 파일 권한 차이로 인한 변경 오인 방지
    git config core.filemode false 2>/dev/null || true
    # 로컬 변경 사항(권한 차이, 로컬 수정 등)이 있더라도 무시하고 GitHub 최신 버전으로 강제 동기화
    git fetch origin main
    git reset --hard origin/main
    chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    # 레거시 기본 샘플 파일 정리
    rm -f "$SCRIPT_DIR/uploads/sample_photo.svg" "$SCRIPT_DIR/uploads/환영합니다.txt" 2>/dev/null || true
else
    echo -e "${YELLOW}[!] .git 폴더가 없습니다. 파일을 직접 복사한 환경입니다.${NC}"
fi

# 의존성 업데이트 확인
if command -v python3 &>/dev/null; then
    python3 -m pip install -q -r requirements.txt
fi

# 갱신된 전역 단축 명령어 등록
bash "$SCRIPT_DIR/install-cli.sh"

# 기존 서버 중지
echo -e "\n${CYAN}[*] 기존 서버 프로세스를 정리합니다...${NC}"
./stop.sh
sleep 1

# 새 서버 재시작
echo -e "\n${GREEN}[✓] 업데이트 완료! 최신 버전으로 서버를 다시 시작합니다...${NC}"
if [ "$#" -eq 0 ]; then
    ./start.sh --bg
else
    ./start.sh "$@"
fi

