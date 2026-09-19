#!/bin/bash

# ==============================================================================
#  ☁️  iCloud Personal Server - Termux 원스텝 자동 설치기 (install.sh)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}  ☁️   갤럭시 개인 클라우드 (iCloud 스타일) 원스텝 설치기  ${NC}"
echo -e "${CYAN}======================================================${NC}"

# 현재 스크립트 위치 저장
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Termux 환경 감지
IS_TERMUX=false
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
fi

echo -e "\n${BLUE}[1/5] 🔍 실행 환경을 확인하는 중...${NC}"
if [ "$IS_TERMUX" = true ]; then
    echo -e "${GREEN}[✓] Termux (Android) 환경이 감지되었습니다.${NC}"
else
    echo -e "${YELLOW}[!] 일반 Linux/macOS 환경이 감지되었습니다.${NC}"
fi

# 필수 시스템 패키지 설치
echo -e "\n${BLUE}[2/5] 📦 필수 패키지 설치 및 업데이트...${NC}"
if [ "$IS_TERMUX" = true ]; then
    echo -e "${CYAN}[*] Termux 패키지 저장소를 업데이트하고 기본 도구를 설치합니다...${NC}"
    pkg update -y || true
    pkg install -y python git curl || true

    # 절전 모드 방지 (Wake-lock)
    if command -v termux-wake-lock &>/dev/null; then
        echo -e "${CYAN}[*] 화면 꺼짐 시에도 24시간 서버가 유지되도록 절전 방지(Wake-lock)를 설정합니다...${NC}"
        termux-wake-lock || true
    fi

    # 스마트폰 저장소 접근 권한 확인
    if [ ! -d "$HOME/storage/shared" ] && command -v termux-setup-storage &>/dev/null; then
        echo -e "${YELLOW}[*] 스마트폰 사진/파일 접근을 위한 저장소 권한을 요청합니다...${NC}"
        echo -e "${YELLOW}    (화면에 팝업이 뜨면 [허용]을 눌러주세요)${NC}"
        termux-setup-storage || true
        sleep 2
    fi
else
    if ! command -v python3 &>/dev/null; then
        echo -e "${RED}[!] Python3가 필요합니다. 설치 후 다시 시도해주세요.${NC}"
        exit 1
    fi
fi

# Python Flask 라이브러리 설치
echo -e "\n${BLUE}[3/5] 🐍 Python 웹 서버 라이브러리(Flask) 설치 중...${NC}"
if command -v pip3 &>/dev/null; then
    pip3 install flask werkzeug
elif command -v pip &>/dev/null; then
    pip install flask werkzeug
else
    echo -e "${RED}[!] pip을 찾을 수 없습니다. Python 환경을 확인해주세요.${NC}"
    exit 1
fi

# 스크립트 실행 권한 부여
echo -e "\n${BLUE}[4/5] 🔑 실행 권한 부여 중...${NC}"
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
mkdir -p "$SCRIPT_DIR/uploads"

# Termux 전역 바로가기 명령어(termux-cloud) 등록
echo -e "\n${BLUE}[5/5] ⚡ 편리한 단축 명령어 등록 중...${NC}"
BIN_DIR=""
if [ "$IS_TERMUX" = true ] && [ -n "$PREFIX" ] && [ -d "$PREFIX/bin" ]; then
    BIN_DIR="$PREFIX/bin"
elif [ -d "$HOME/.local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
elif [ -d "$HOME/bin" ]; then
    BIN_DIR="$HOME/bin"
fi

if [ -n "$BIN_DIR" ]; then
    CLI_PATH="$BIN_DIR/termux-cloud"
    cat <<EOF > "$CLI_PATH"
#!/bin/bash
PROJECT_DIR="$SCRIPT_DIR"
cd "\$PROJECT_DIR" || exit 1

case "\$1" in
    start)
        ./start.sh "\${@:2}"
        ;;
    stop)
        ./stop.sh
        ;;
    status)
        ./status.sh
        ;;
    update)
        ./update.sh
        ;;
    *)
        ./start.sh "\$@"
        ;;
esac
EOF
    chmod +x "$CLI_PATH"
    echo -e "${GREEN}[✓] 어디서든 '${CYAN}termux-cloud${GREEN}'를 입력하여 서버를 관리할 수 있습니다!${NC}"
else
    echo -e "${YELLOW}[-] 전역 바로가기는 건너뛰었습니다 (프로젝트 폴더에서 ./start.sh 실행 가능).${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  🎉 모든 설치 및 설정이 완료되었습니다!             ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "다음 방법으로 언제든지 서버를 실행할 수 있습니다:"
if [ -n "$BIN_DIR" ]; then
    echo -e "  👉 ${CYAN}termux-cloud${NC}          (어디서든 실행)"
    echo -e "  👉 ${CYAN}termux-cloud --bg${NC}     (백그라운드에서 조용히 실행)"
    echo -e "  👉 ${CYAN}termux-cloud stop${NC}     (실행 중인 서버 종료)"
    echo -e "  👉 ${CYAN}termux-cloud status${NC}   (서버 상태 확인)"
fi
echo -e "  👉 ${CYAN}./start.sh${NC}            (현재 디렉토리에서 실행)"
echo -e "${GREEN}======================================================${NC}\n"

# 즉시 실행 여부 묻기
read -p "지금 바로 서버를 실행하시겠습니까? (Y/n): " -r RUN_NOW
echo
if [[ "$RUN_NOW" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}언제든 './start.sh' 또는 'termux-cloud'를 입력하여 실행하세요.${NC}"
else
    ./start.sh
fi
