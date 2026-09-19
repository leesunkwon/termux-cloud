#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Termux 가상 리눅스 데스크탑 (XFCE4 + TigerVNC + noVNC) 원클릭 구축 스크립트
# ==============================================================================
# 이 스크립트는 스마트폰 Termux 환경에서 XFCE4 GUI 데스크탑 환경과
# 웹 브라우저 접속용 noVNC (포트 6080)를 한 번에 설치하고 실행합니다.
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  🖥️  Termux 가상 리눅스 GUI (XFCE4 + noVNC) 설정 도구 ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Termux 환경 확인
if [ ! -d "/data/data/com.termux" ]; then
    echo -e "${YELLOW}[안내] Termux 환경이 아닌 일반 Linux/macOS 환경입니다.${NC}"
    echo -e "Termux가 아닌 경우 패키지 관리자(apt/brew 등)로 tigervnc와 novnc를 수동 설치해야 합니다."
fi

ACTION="${1:-start}"

case "$ACTION" in
    install)
        echo -e "\n${YELLOW}[1/4] X11 저장소 활성화 및 패키지 목록 갱신 중...${NC}"
        pkg update -y
        pkg install -y x11-repo

        echo -e "\n${YELLOW}[2/4] XFCE4 데스크탑 및 VNC 서버 설치 중...${NC}"
        pkg install -y xfce4 xfce4-terminal tigervnc novnc python

        echo -e "\n${YELLOW}[3/4] VNC 기본 설정 구성 중...${NC}"
        mkdir -p ~/.vnc
        cat << 'EOF' > ~/.vnc/xstartup
#!/data/data/com.termux/files/usr/bin/sh
export DISPLAY=:1
export PULSE_SERVER=127.0.0.1
xrdb $HOME/.Xresources 2>/dev/null
startxfce4 &
EOF
        chmod +x ~/.vnc/xstartup

        echo -e "\n${GREEN}✓ 설치가 완료되었습니다!${NC}"
        echo -e "실행하려면: ${BLUE}./setup-desktop.sh start${NC}"
        ;;

    start)
        # 패키지 설치 여부 점검
        if ! command -v vncserver &> /dev/null || ! command -v novnc &> /dev/null; then
            echo -e "${YELLOW}필수 패키지가 설치되지 않았습니다. 자동 설치를 시작합니다...${NC}"
            exec "$0" install
            exit 0
        fi

        echo -e "\n${BLUE}1. VNC 서버 시작 (디스플레이 :1)...${NC}"
        # 기존 프로세스 정리
        vncserver -kill :1 2>/dev/null || true

        # VNC 서버 실행 (1280x720 기본 해상도)
        vncserver :1 -geometry 1280x720 -depth 24 -localhost

        echo -e "\n${BLUE}2. noVNC 웹 브릿지 시작 (포트 6080)...${NC}"
        pkill -f "novnc_proxy" 2>/dev/null || true
        pkill -f "websockify.*6080" 2>/dev/null || true

        # novnc_proxy 백그라운드 실행
        nohup novnc_proxy --vnc localhost:5901 --listen 6080 > "$HOME/.vnc/novnc.log" 2>&1 &
        sleep 2

        echo -e "\n${GREEN}======================================================${NC}"
        echo -e "${GREEN}  ✓ 가상 리눅스 데스크탑이 성공적으로 실행되었습니다!   ${NC}"
        echo -e "  🌐 브라우저 접속 주소 : http://localhost:6080/vnc.html"
        echo -e "  💻 웹 가상 데스크탑의 [리눅스 GUI] 창에서 즉시 사용 가능"
        echo -e "${GREEN}======================================================${NC}"
        echo -e "종료하려면: ${YELLOW}./setup-desktop.sh stop${NC}\n"
        ;;

    stop)
        echo -e "\n${YELLOW}가상 리눅스 데스크탑을 종료합니다...${NC}"
        vncserver -kill :1 2>/dev/null || true
        pkill -f "novnc_proxy" 2>/dev/null || true
        pkill -f "websockify.*6080" 2>/dev/null || true
        echo -e "${GREEN}✓ VNC 및 noVNC 프로세스가 종료되었습니다.${NC}\n"
        ;;

    status)
        if pgrep -f "Xvnc.*:1" > /dev/null && pgrep -f "6080" > /dev/null; then
            echo -e "${GREEN}● 가상 데스크탑 실행 중 (Port: 6080, Display :1)${NC}"
        else
            echo -e "${RED}○ 가상 데스크탑 중지 상태${NC}"
        fi
        ;;

    *)
        echo "사용법: $0 {start|stop|restart|status|install}"
        exit 1
        ;;
esac
