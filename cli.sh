#!/bin/bash
# Stable command dispatcher. The global launcher always calls this checkout.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

show_help() {
    cat <<'EOF'
Pulse 전역 명령어

  termux-cloud                 서버 시작 (포그라운드)
  termux-cloud --bg            서버 시작 (백그라운드)
  termux-cloud start [옵션]    서버 시작 (--bg, --port 3000, --open)
  termux-cloud account         계정 생성 / 비밀번호·권한 변경
  termux-cloud setup           account와 동일
  termux-cloud stop            서버와 리로더 종료
  termux-cloud restart [옵션]  재시작 (기본 백그라운드)
  termux-cloud status          서버 상태·주소·최근 로그
  termux-cloud tunnel [옵션]   Cloudflare Tunnel 외부 접속 (start, stop, status)
  termux-cloud api             등록된 API 서비스 목록 확인
  termux-cloud logs            최근 로그 50줄
  termux-cloud logs -f         로그 실시간 보기 (Ctrl+C로 보기 종료)
  termux-cloud update [옵션]   Git 업데이트 후 재시작 (기본 백그라운드)
  termux-cloud update --tunnel Git 업데이트 후 서버 + 외부 터널 동시 백그라운드 시작
  termux-cloud sync            update --tunnel과 동일 (업데이트 + 서버 + 터널 원클릭)
  termux-cloud register       전역 명령어 재등록
  termux-cloud path           프로젝트 경로
  termux-cloud help           도움말

최초 시작 시 계정이 없으면 등록을 안내합니다.
계정 변경 후에는 termux-cloud restart로 적용하세요.
EOF
}

setup_account() {
    local pulse_python
    pulse_python=$(command -v python3 || command -v python) || {
        echo "Python이 없습니다. 먼저 프로젝트의 install.sh를 실행하세요." >&2
        return 1
    }
    if ! "$pulse_python" -c 'import flask, werkzeug' >/dev/null 2>&1; then
        echo "의존성 설치가 필요합니다: $pulse_python -m pip install -r requirements.txt" >&2
        return 1
    fi
    "$pulse_python" "$SCRIPT_DIR/setup-auth.py"
}

ensure_account() {
    if [ ! -f "$SCRIPT_DIR/.pulse/accounts.json" ]; then
        if [ ! -t 0 ]; then
            echo "먼저 Termux에서 termux-cloud account로 계정을 등록하세요." >&2
            return 1
        fi
        echo "최초 실행입니다. Pulse 계정을 먼저 등록합니다."
        setup_account
    fi
}

ACTION="${1:-start}"
if [ "$#" -gt 0 ]; then shift; fi
case "$ACTION" in
    account|setup)
        setup_account
        ;;
    start)
        ensure_account
        exec bash "$SCRIPT_DIR/start.sh" "$@"
        ;;
    --bg|-d|background|--open|-o|--port|-p|--tunnel)
        ensure_account
        exec bash "$SCRIPT_DIR/start.sh" "$ACTION" "$@"
        ;;
    tunnel)
        exec bash "$SCRIPT_DIR/tunnel.sh" "$@"
        ;;
    stop|status)
        exec bash "$SCRIPT_DIR/$ACTION.sh" "$@"
        ;;
    restart)
        ensure_account
        bash "$SCRIPT_DIR/stop.sh"
        if [ "$#" -eq 0 ]; then set -- --bg; fi
        exec bash "$SCRIPT_DIR/start.sh" "$@"
        ;;
    update)
        exec bash "$SCRIPT_DIR/update.sh" "$@"
        ;;
    sync|up)
        exec bash "$SCRIPT_DIR/update.sh" --tunnel "$@"
        ;;
    api|apis)
        pulse_python=$(command -v python3 || command -v python) || {
            echo "Python이 없습니다." >&2
            exit 1
        }
        "$pulse_python" -c '
import json, os
candidates = [
    os.path.expanduser("~/.pulse/custom_apis.json"),
    os.path.join(os.getcwd(), ".pulse", "custom_apis.json")
]
api_file = next((p for p in candidates if os.path.exists(p)), None)
if not api_file:
    print("등록된 API가 없습니다.")
    exit(0)
try:
    with open(api_file, "r", encoding="utf-8") as f:
        apis = json.load(f)
except Exception as e:
    print("API 파일을 읽을 수 없습니다:", e)
    exit(1)
print(f"=== Pulse 등록된 API 목록 ({len(apis)}개) ===")
for a in apis:
    st = "활성" if a.get("enabled", True) else "비활성"
    m = a.get("method", "GET")
    path = a.get("path", "")
    mode = a.get("mode", "json")
    nm = a.get("name", "")
    print(f"[{st}] {m:<6} /api/fn/{path:<20} ({nm}) [{mode}]")
'
        ;;
    logs)
        if [ ! -f "$SCRIPT_DIR/server.log" ]; then
            echo "로그가 없습니다. termux-cloud --bg로 시작하면 생성됩니다."
            exit 0
        fi
        case "${1:-}" in
            '') exec tail -n 50 "$SCRIPT_DIR/server.log" ;;
            -f|--follow) exec tail -n 50 -f "$SCRIPT_DIR/server.log" ;;
            *) echo "사용법: termux-cloud logs [-f]" >&2; exit 2 ;;
        esac
        ;;
    register)
        exec bash "$SCRIPT_DIR/install-cli.sh"
        ;;
    path)
        printf '%s\n' "$SCRIPT_DIR"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        printf '알 수 없는 명령어: %s\ntermux-cloud help로 사용법을 확인하세요.\n' "$ACTION" >&2
        exit 2
        ;;
esac
